import { PrismaClient, Role, ComplaintCategory, ComplaintStatus, ComplaintPriority, ComplaintSeverity } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Seeding is disabled in production environment to protect production data and prevent demo account creation.');
    return;
  }

  console.log('Clearing existing data...');
  await prisma.complaintStatusHistory.deleteMany();
  await prisma.complaintImage.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const citizenPasswordHash = await bcrypt.hash('DemoPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);

  const citizen1 = await prisma.user.create({
    data: {
      name: 'Aarav Sharma',
      email: 'citizen@civicai.org',
      passwordHash: citizenPasswordHash,
      role: Role.CITIZEN,
    },
  });

  const citizen2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@civicai.org',
      passwordHash: citizenPasswordHash,
      role: Role.CITIZEN,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Municipal Admin Officer',
      email: 'admin@civicai.org',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  console.log('Seeding sample complaints...');
  const complaintsData = [
    {
      title: 'Deep Hazardous Pothole near Central Bus Terminal',
      description: 'A deep pothole (roughly 1.5 feet wide and 6 inches deep) has developed right in the middle of the bus lane. Two two-wheelers suffered tire damage and skidded during peak morning rain yesterday.',
      category: ComplaintCategory.POTHOLE,
      severity: ComplaintSeverity.HIGH,
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      latitude: 28.6139391,
      longitude: 77.2090212,
      address: 'Main Gate, Inter-State Bus Terminus, Ring Road, Sector 4',
      citizenId: citizen1.id,
      imageUrl: '/uploads/sample-pothole.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { previousStatus: ComplaintStatus.SUBMITTED, newStatus: ComplaintStatus.IN_PROGRESS, changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
    },
    {
      title: 'Uncollected Municipal Garbage Dump overflow',
      description: 'Community garbage dumpster has not been cleared for over 4 days. Waste is overflowing onto the main sidewalk, attracting stray animals and creating intense foul odor near the primary school.',
      category: ComplaintCategory.GARBAGE,
      severity: ComplaintSeverity.HIGH,
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.SUBMITTED,
      latitude: 28.6189211,
      longitude: 77.2154320,
      address: 'Opposite Model Senior Secondary School, Ward 12, Vikas Marg',
      citizenId: citizen1.id,
      imageUrl: '/uploads/sample-garbage.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
    },
    {
      title: 'Major Drinking Water Pipeline Gushing onto Road',
      description: 'Underground municipal supply line fractured. Fresh potable water is gushing out under pressure, eroding the road shoulder and causing severe water supply shortage in blocks C and D.',
      category: ComplaintCategory.WATER_LEAKAGE,
      severity: ComplaintSeverity.HIGH,
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      latitude: 28.6251200,
      longitude: 77.2052100,
      address: 'Near Water Tank Booster Station, Block C, Green Park Extension',
      citizenId: citizen1.id,
      imageUrl: '/uploads/sample-water.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { previousStatus: ComplaintStatus.SUBMITTED, newStatus: ComplaintStatus.IN_PROGRESS, changedAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      ],
    },
    {
      title: 'Clogged Stormwater Drain Causing Waterlogging',
      description: 'The road culvert and stormwater drain are completely choked with silt and construction debris. Even a brief shower causes knee-deep water accumulation blocking pedestrian access.',
      category: ComplaintCategory.DRAINAGE,
      severity: ComplaintSeverity.MEDIUM,
      priority: ComplaintPriority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      latitude: 28.6310000,
      longitude: 77.2185000,
      address: 'Crossroad Junction 7, Near Community Hall, Shastri Nagar',
      citizenId: citizen1.id,
      imageUrl: '/uploads/sample-drainage.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      ],
    },
    {
      title: 'Series of 4 Dark Streetlights Creating Safety Hazard',
      description: 'Four consecutive LED streetlights between poles #24 and #28 have been completely non-functional for two weeks. The stretch is pitch dark at night, causing safety concerns for women and evening commuters.',
      category: ComplaintCategory.STREETLIGHT,
      severity: ComplaintSeverity.MEDIUM,
      priority: ComplaintPriority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      latitude: 28.6094500,
      longitude: 77.2241000,
      address: 'Sector 9 Outer Avenue Road, Near Mother Dairy Booth',
      citizenId: citizen1.id,
      imageUrl: '/uploads/sample-streetlight.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { previousStatus: ComplaintStatus.SUBMITTED, newStatus: ComplaintStatus.IN_PROGRESS, changedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { previousStatus: ComplaintStatus.IN_PROGRESS, newStatus: ComplaintStatus.RESOLVED, changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
    },
    {
      title: 'Cracked Road Surface and Subsidence near Bridge Ramp',
      description: 'Asphalt surface has cracked with extensive spiderweb fractures and ground depression following pipeline trenching work. Needs immediate re-carpeting.',
      category: ComplaintCategory.ROAD_DAMAGE,
      severity: ComplaintSeverity.LOW,
      priority: ComplaintPriority.LOW,
      status: ComplaintStatus.SUBMITTED,
      latitude: 28.6420100,
      longitude: 77.2310500,
      address: 'Approach Flyover Ramp, Link Road 3',
      citizenId: citizen2.id,
      imageUrl: '/uploads/sample-road.jpg',
      history: [
        { previousStatus: null, newStatus: ComplaintStatus.SUBMITTED, changedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      ],
    },
  ];

  for (const c of complaintsData) {
    const { history, imageUrl, ...complaintFields } = c;
    const createdComplaint = await prisma.complaint.create({
      data: {
        ...complaintFields,
        images: {
          create: [
            {
              imageUrl,
              imageType: 'image/jpeg',
            },
          ],
        },
      },
    });

    for (const h of history) {
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: createdComplaint.id,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          changedAt: h.changedAt,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
  console.log(`Citizen Demo Account: citizen@civicai.org / DemoPassword123!`);
  console.log(`Admin Account:        admin@civicai.org / admin1234`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
