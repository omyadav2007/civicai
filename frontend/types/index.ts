export type Role = 'CITIZEN' | 'ADMIN';

export type Department =
  | 'ROAD_MAINTENANCE'
  | 'SANITATION'
  | 'WATER_SUPPLY'
  | 'DRAINAGE'
  | 'ELECTRICITY'
  | 'PUBLIC_WORKS';

export type ComplaintCategory =
  | 'POTHOLE'
  | 'GARBAGE'
  | 'OVERFLOWING_DUSTBIN'
  | 'ILLEGAL_GARBAGE_DUMPING'
  | 'UNCOLLECTED_GARBAGE'
  | 'GARBAGE_BLOCKING_DRAIN'
  | 'OPEN_GARBAGE_DUMP'
  | 'MISSED_GARBAGE_COLLECTION'
  | 'GENERAL_WASTE_MANAGEMENT'
  | 'WATER_LEAKAGE'
  | 'DRAINAGE'
  | 'STREETLIGHT'
  | 'ROAD_DAMAGE'
  | 'OTHER';

export type ComplaintStatus = 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'PENDING';

export type AssignmentMethod = 'AI_AUTO' | 'RULE_FALLBACK' | 'MANUAL';

export type AiProcessingStatus = 'PENDING' | 'COMPLETED' | 'FALLBACK_COMPLETED' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

export interface ComplaintImage {
  id: string;
  complaintId: string;
  imageUrl: string;
  imageType: string;
  createdAt: string;
}

export interface ComplaintStatusHistory {
  id: string;
  complaintId: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  changedById?: string | null;
  changedBy?: {
    id: string;
    name: string;
    role: Role;
  } | null;
  notes?: string | null;
  changedAt: string;
}

export interface AdminNote {
  id: string;
  complaintId: string;
  adminId: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  note: string;
  createdAt: string;
}

export interface AiAnalysis {
  id: string;
  complaintId: string;
  predictedCategory: ComplaintCategory;
  categoryConfidence: number;
  categoryExplanation?: string | null;
  estimatedSeverity: ComplaintSeverity;
  severityScore?: number | null;
  severityExplanation?: string | null;
  priorityScore: number;
  calculatedPriority: ComplaintPriority;
  priorityExplanation?: string | null;
  duplicateCandidateIds: string[];
  duplicateDetails?: any;
  modelMetadata?: any;
  provider?: string | null;
  modelName?: string | null;
  visualDescription?: string | null;
  visualEvidence?: string[];
  processingStatus?: AiProcessingStatus;
  requiresHumanReview?: boolean;
  uncertaintyReason?: string | null;
  fallbackCategory?: ComplaintCategory | null;
  correctedDepartment?: Department | null;
  isCorrected: boolean;
  correctedCategory?: ComplaintCategory | null;
  correctedSeverity?: ComplaintSeverity | null;
  correctedBy?: string | null;
  correctedAt?: string | null;
  correctionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  department?: Department | null;
  assignmentMethod?: AssignmentMethod | null;
  assignedAt?: string | null;
  assignmentReason?: string | null;
  requiresHumanReview?: boolean;
  latitude: number | null;
  longitude: number | null;
  address: string;
  citizenId: string;
  citizen?: {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
  };
  images: ComplaintImage[];
  statusHistory?: ComplaintStatusHistory[];
  adminNotes?: AdminNote[];
  aiAnalysis?: AiAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintStats {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
}

export interface AdminDashboardData {
  kpi: {
    total: number;
    submitted: number;
    inProgress: number;
    resolved: number;
    rejected: number;
    highPriority: number;
    duplicateCandidates: number;
    aiAutoAssigned?: number;
    fallbackAssigned?: number;
    requiresReview?: number;
    processingFailures?: number;
  };
  distributions: {
    status: { status: ComplaintStatus; count: number }[];
    category: { category: ComplaintCategory; count: number }[];
    priority: { priority: ComplaintPriority; count: number }[];
    department: { department: string; count: number }[];
  };
  recentComplaints: Complaint[];
}
