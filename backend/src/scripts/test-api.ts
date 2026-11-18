import { prisma } from '../config/prisma';
import { ComplaintStatus, Department, AssignmentMethod } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const BASE = 'http://localhost:5000';
  const AI_BASE = 'http://127.0.0.1:8001';
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`, detail !== undefined ? detail : '');
      failCount++;
    }
  }

  console.log('================================================================');
  console.log('   CIVICAI SPRINT 3 FULL REGRESSION & VISION ROUTING TEST SUITE ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & ACCESS CONTROL
  // -------------------------------------------------------------------------
  console.log('--- 1. Authentication & Authorization Checks ---');

  const unauthRes = await fetch(`${BASE}/api/admin/dashboard`);
  assert(unauthRes.status === 401, 'Unauthenticated request to admin API returns 401');

  const citizenLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'citizen@civicai.org', password: 'DemoPassword123!' }),
  });
  const citizenLoginData = await citizenLoginRes.json();
  assert(citizenLoginRes.status === 200 && citizenLoginData.data?.token, 'Citizen login successful (citizen@civicai.org)');
  assert(citizenLoginData.data?.user?.role === 'CITIZEN', 'Citizen role is CITIZEN');
  const citizenToken = citizenLoginData.data?.token;

  const citizenAdminRes = await fetch(`${BASE}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(citizenAdminRes.status === 403, 'Citizen request to admin API returns 403 Forbidden');

  // Attempt role change via profile update returns 403
  const roleTamperRes = await fetch(`${BASE}/api/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` },
    body: JSON.stringify({ name: 'Aarav Sharma', role: 'ADMIN' }),
  });
  assert(roleTamperRes.status === 403, 'Attempting to modify account role returns 403 Forbidden');

  // Attempt registering with role ADMIN returns 403
  const adminRegisterAttemptRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Admin',
      email: 'rogue@civicai.org',
      password: 'Password123!',
      role: 'ADMIN',
    }),
  });
  assert(adminRegisterAttemptRes.status === 403, 'Client attempt to submit role ADMIN during registration returns 403 Forbidden');

  // Admin Login with incorrect password returns 401
  const invalidAdminLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@civicai.org', password: 'WrongPassword999!' }),
  });
  assert(invalidAdminLoginRes.status === 401, 'Incorrect admin password returns 401 Unauthorized');

  // Admin Login with designated password 'admin1234'
  const adminLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@civicai.org', password: 'admin1234' }),
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginData.data?.token, 'Admin login successful with admin1234 (admin@civicai.org)');
  assert(adminLoginData.data?.user?.role === 'ADMIN', 'Designated admin role is ADMIN');
  const adminToken = adminLoginData.data?.token;

  // -------------------------------------------------------------------------
  // 2. COMPLAINT LISTING FILTER DEFAULTS & SEARCH (ITEM 2 AUDIT)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Complaint Listing Filter Defaults & Count Verification ---');

  const allComplaintsRes = await fetch(`${BASE}/api/admin/complaints`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const allData = await allComplaintsRes.json();
  assert(
    allComplaintsRes.status === 200 && allData.data?.pagination?.total >= 7,
    `Default complaints query returns all complaints (Total: ${allData.data?.pagination?.total})`
  );

  const submittedRes = await fetch(`${BASE}/api/admin/complaints?status=SUBMITTED`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const submittedData = await submittedRes.json();
  const allAreSubmitted = submittedData.data?.complaints?.every((c: any) => c.status === 'SUBMITTED');
  assert(
    submittedRes.status === 200 && allAreSubmitted && submittedData.data?.complaints?.length > 0,
    `Status filter 'SUBMITTED' returns only submitted reports (Count: ${submittedData.data?.complaints?.length})`
  );

  const searchRes = await fetch(`${BASE}/api/admin/complaints?search=pothole`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const searchData = await searchRes.json();
  assert(
    searchRes.status === 200 && searchData.data?.complaints?.length >= 1,
    `Search for 'pothole' returns matching records (Count: ${searchData.data?.complaints?.length})`
  );

  // -------------------------------------------------------------------------
  // 3. DUPLICATE STATUS TRANSITIONS (ITEM 1 AUDIT)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Duplicate Status Transition Prevention & Transaction Safety ---');

  const targetComplaint = allData.data?.complaints?.[0];
  const targetComplaintId = targetComplaint?.id;
  const currentStatus = targetComplaint?.status;

  const initialHistoryCount = await prisma.complaintStatusHistory.count({
    where: { complaintId: targetComplaintId },
  });

  const dupStatusRes = await fetch(`${BASE}/api/admin/complaints/${targetComplaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: currentStatus, notes: 'Duplicate status attempt' }),
  });
  const dupStatusData = await dupStatusRes.json();

  assert(
    dupStatusRes.status === 409 && dupStatusData.success === false,
    `Duplicate status transition rejected with 409 Conflict (${dupStatusData.message})`
  );

  const afterHistoryCount = await prisma.complaintStatusHistory.count({
    where: { complaintId: targetComplaintId },
  });
  assert(
    afterHistoryCount === initialHistoryCount,
    `Audit history count unchanged after rejected duplicate transition (${afterHistoryCount} entries)`
  );

  // -------------------------------------------------------------------------
  // 4. ANALYTICS TURNAROUND CALCULATIONS (ITEM 3 AUDIT)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Analytics Turnaround Calculations Audit ---');

  const analyticsRes = await fetch(`${BASE}/api/admin/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const analyticsData = await analyticsRes.json();
  assert(
    analyticsRes.status === 200 &&
    analyticsData.data?.resolvedCount >= 1 &&
    analyticsData.data?.avgResolutionHours > 0,
    `Admin Analytics calculates real non-zero turnaround (${analyticsData.data?.avgResolutionHours} hrs, ${analyticsData.data?.resolvedCount} resolved)`
  );

  // Mathematical turnaround unit tests
  function calculateTurnaround(submission: Date, resolution: Date) {
    const diffMs = resolution.getTime() - submission.getTime();
    if (diffMs < 0) return 0;
    return Number((diffMs / (1000 * 3600)).toFixed(1));
  }
  assert(
    calculateTurnaround(new Date('2026-11-03T10:00:00Z'), new Date('2026-11-03T10:30:00Z')) === 0.5,
    'Same-hour resolution: 30 mins -> 0.5 hours'
  );
  assert(
    calculateTurnaround(new Date('2026-11-03T08:00:00Z'), new Date('2026-11-03T14:30:00Z')) === 6.5,
    'Multi-hour resolution: 6.5 hrs -> 6.5 hours'
  );
  assert(
    calculateTurnaround(new Date('2026-10-27T09:00:00Z'), new Date('2026-11-02T09:00:00Z')) === 144.0,
    'Multi-day resolution: 6 days -> 144.0 hours'
  );

  // -------------------------------------------------------------------------
  // 5. SPRINT 3 AUTOMATIC DEPARTMENT ROUTING & ALWAYS-ASSIGN POLICY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Sprint 3 Automatic Department Routing & Policy Verification ---');

  const testMapping = [
    { cat: 'POTHOLE', expected: 'ROAD_MAINTENANCE' },
    { cat: 'ROAD_DAMAGE', expected: 'ROAD_MAINTENANCE' },
    { cat: 'GARBAGE', expected: 'SANITATION' },
    { cat: 'OVERFLOWING_DUSTBIN', expected: 'SANITATION' },
    { cat: 'ILLEGAL_GARBAGE_DUMPING', expected: 'SANITATION' },
    { cat: 'UNCOLLECTED_GARBAGE', expected: 'SANITATION' },
    { cat: 'GARBAGE_BLOCKING_DRAIN', expected: 'DRAINAGE' },
    { cat: 'OPEN_GARBAGE_DUMP', expected: 'SANITATION' },
    { cat: 'MISSED_GARBAGE_COLLECTION', expected: 'SANITATION' },
    { cat: 'GENERAL_WASTE_MANAGEMENT', expected: 'SANITATION' },
    { cat: 'WATER_LEAKAGE', expected: 'WATER_SUPPLY' },
    { cat: 'DRAINAGE', expected: 'DRAINAGE' },
    { cat: 'STREETLIGHT', expected: 'ELECTRICITY' },
    { cat: 'OTHER', expected: 'PUBLIC_WORKS' },
  ];

  for (const item of testMapping) {
    const routeRes = await fetch(`${AI_BASE}/api/v1/route-department`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: item.cat, confidence: 0.90 }),
    });
    const routeData = await routeRes.json();
    assert(
      routeRes.status === 200 && routeData.department === item.expected,
      `Deterministic routing: ${item.cat} -> ${routeData.department} (${routeData.department_title})`
    );
  }

  // Case A (High Confidence Gemini Vision)
  const caseARes = await fetch(`${AI_BASE}/api/v1/route-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'POTHOLE', confidence: 0.92, source: 'GEMINI' }),
  });
  const caseA = await caseARes.json();
  assert(
    caseA.assignment_method === 'AI_AUTO' && caseA.requires_human_review === false && caseA.routing_case === 'CASE_A_HIGH_CONFIDENCE',
    'Case A (Confidence >= 0.85): Assigned AI_AUTO with no review required'
  );

  // Case B (Moderate Confidence Gemini Vision < 0.85)
  const caseBRes = await fetch(`${AI_BASE}/api/v1/route-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'POTHOLE', confidence: 0.72, source: 'GEMINI' }),
  });
  const caseB = await caseBRes.json();
  assert(
    caseB.assignment_method === 'AI_AUTO' && caseB.requires_human_review === true && caseB.routing_case === 'CASE_B_MODERATE_CONFIDENCE',
    'Case B (Confidence < 0.85): Assigned AI_AUTO with requires_human_review: true'
  );

  // Case C (OTHER non-standard category)
  const caseCRes = await fetch(`${AI_BASE}/api/v1/route-department`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'OTHER', confidence: 0.88, source: 'GEMINI' }),
  });
  const caseC = await caseCRes.json();
  assert(
    caseC.department === 'PUBLIC_WORKS' && caseC.requires_human_review === true && caseC.routing_case === 'CASE_C_OTHER',
    'Case C (Category OTHER): Routed to PUBLIC_WORKS with requires_human_review: true'
  );

  // -------------------------------------------------------------------------
  // 6. SPRINT 3 CITIZEN COMPLAINT SUBMISSION & MULTIMODAL AUTO-DISPATCH
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Sprint 3 Citizen Complaint Submission & Multimodal Dispatch ---');

  // Create a sample valid 1x1 PNG file for upload testing
  const dummyPng = Buffer.from(
    '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082',
    'hex'
  );
  const testImagePath = path.join(__dirname, 'test-pothole.png');
  fs.writeFileSync(testImagePath, dummyPng);

  const formData = new FormData();
  formData.append('title', 'Large hazardous pothole near Sector 14 crossing');
  formData.append('description', 'A severe deep pothole has appeared near the main crossing causing significant vehicle delay.');
  formData.append('category', 'POTHOLE');
  formData.append('address', 'Sector 14 Main Chowk, Near Central Market');
  formData.append('latitude', '28.402100');
  formData.append('longitude', '77.315600');
  const blob = new Blob([dummyPng], { type: 'image/png' });
  formData.append('images', blob, 'test-pothole.png');

  const submitRes = await fetch(`${BASE}/api/complaints`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${citizenToken}` },
    body: formData,
  });
  const submitData = await submitRes.json();

  assert(
    submitRes.status === 201 && submitData.success === true,
    'Citizen successfully submitted complaint with photo evidence'
  );

  const submittedComplaint = submitData.data?.complaint;
  assert(
    submittedComplaint?.department !== null && Object.values(Department).includes(submittedComplaint?.department),
    `Always-Assign Policy verified: Automatically assigned to '${submittedComplaint?.department}'`
  );
  assert(
    submittedComplaint?.assignmentMethod !== null,
    `Assignment method recorded: '${submittedComplaint?.assignmentMethod}'`
  );
  assert(
    submittedComplaint?.images?.length >= 1,
    `Photo evidence verified & cataloged (Count: ${submittedComplaint?.images?.length})`
  );

  // Clean up local temp test file
  if (fs.existsSync(testImagePath)) {
    try { fs.unlinkSync(testImagePath); } catch {}
  }

  // -------------------------------------------------------------------------
  // 7. SECURITY & ACCESS CONTROL: CITIZEN CANNOT OVERRIDE ASSIGNMENTS
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Security: Citizen Restricted from Administrative Overrides ---');

  const citizenTamperRes = await fetch(`${BASE}/api/admin/complaints/${submittedComplaint.id}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({ department: 'SANITATION', notes: 'Unauthorized citizen tamper attempt' }),
  });
  assert(
    citizenTamperRes.status === 403,
    'Security enforced: Citizen denied from administrative department assignment (403 Forbidden)'
  );

  // -------------------------------------------------------------------------
  // 8. ADMIN DEPARTMENT OVERRIDE & AUDIT RECORDING
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Admin Department Override & Audit Recording ---');

  const adminOverrideRes = await fetch(`${BASE}/api/admin/complaints/${submittedComplaint.id}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      department: 'PUBLIC_WORKS',
      notes: 'Supervisory review: Complex intersection requires Public Works coordination.',
    }),
  });
  const adminOverrideData = await adminOverrideRes.json();

  assert(
    adminOverrideRes.status === 200 && adminOverrideData.data?.complaint?.department === 'PUBLIC_WORKS',
    'Admin successfully overridden department to PUBLIC_WORKS'
  );
  assert(
    adminOverrideData.data?.complaint?.assignmentMethod === 'MANUAL',
    'Assignment method accurately recorded as MANUAL'
  );

  // Verify internal audit note was created
  const auditNotes = await prisma.adminNote.findMany({
    where: { complaintId: submittedComplaint.id },
  });
  assert(
    auditNotes.length >= 1,
    `Administrative audit note logged in database (${auditNotes[0]?.note?.slice(0, 60)}...)`
  );

  // -------------------------------------------------------------------------
  // 9. ADMIN DASHBOARD SPRINT 3 KPI TELEMETRY
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Admin Dashboard Sprint 3 KPI Telemetry ---');

  const adminDashRes = await fetch(`${BASE}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData = await adminDashRes.json();
  const kpis = dashData.data?.kpi;

  assert(
    adminDashRes.status === 200 && kpis !== undefined,
    'Admin Dashboard returned live KPI metrics'
  );
  assert(
    typeof (kpis?.aiAutoAssigned ?? kpis?.fallbackAssigned) === 'number',
    `Automatic Assignment KPI telemetry active: Auto: ${kpis?.aiAutoAssigned}, Fallback: ${kpis?.fallbackAssigned}`
  );
  assert(
    dashData.data?.distributions?.department?.length > 0,
    `Department distribution contains ${dashData.data?.distributions?.department?.length} departments`
  );

  // -------------------------------------------------------------------------
  // 10. DATA PRESERVATION & DATABASE INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 10. Database Integrity & Data Preservation Verification ---');

  const totalUsers = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const citizenCount = await prisma.user.count({ where: { role: 'CITIZEN' } });
  const theAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  const omYadavComplaint = await prisma.complaint.findFirst({
    where: { citizen: { name: { contains: 'Om Yadav' } } },
    include: { aiAnalysis: true },
  });

  assert(totalUsers === 4, `All 4 registered user accounts preserved (Found: ${totalUsers})`);
  assert(adminCount === 1, `Exactly ONE ADMIN account exists in database (Found: ${adminCount})`);
  assert(theAdmin?.email === 'admin@civicai.org', `Designated admin account is admin@civicai.org (Found: ${theAdmin?.email})`);
  assert(citizenCount === 3, `All other user accounts have CITIZEN role (Found: ${citizenCount})`);
  assert(
    omYadavComplaint !== null && omYadavComplaint.aiAnalysis !== null,
    `Citizen Om Yadav's submitted complaint #${omYadavComplaint?.id?.slice(0, 8)} preserved intact`
  );

  // Clean up the test complaint submitted during Test 22 to leave database pristine
  await prisma.complaint.delete({ where: { id: submittedComplaint.id } });
  console.log(`[CLEANUP] Automated test complaint #${submittedComplaint.id.slice(0, 8)} removed.`);

  const finalComplaintCount = await prisma.complaint.count();
  assert(
    finalComplaintCount >= 7,
    `Original complaints and user-submitted reports preserved intact (Current count: ${finalComplaintCount})`
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   FULL TEST SUITE RESULTS: ${passCount} Passed, ${failCount} Failed.`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test execution error:', e);
  process.exit(1);
});
