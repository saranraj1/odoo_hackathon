export type Role = 'ADMIN' | 'ASSET_MANAGER' | 'DEPARTMENT_HEAD' | 'EMPLOYEE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type Status = 'ACTIVE' | 'INACTIVE';

export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED';

export type AllocationStatus = 'ACTIVE' | 'RETURNED';
export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';
export type BookingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MaintenanceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'TECHNICIAN_ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export type AuditCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type AuditResult = 'PENDING' | 'VERIFIED' | 'MISSING' | 'DAMAGED';
export type ResolutionStatus = 'UNRESOLVED' | 'RESOLVED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  department?: Department | null;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentDepartmentId: string | null;
  parentDepartment?: Department | null;
  headUserId: string | null;
  headUser?: User | null;
  status: Status;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  metadataSchema: any;
  status: Status;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  serialNumber: string;
  name: string;
  description: string;
  categoryId: string;
  category?: Category;
  owningDepartmentId: string;
  owningDepartment?: Department;
  location: string;
  condition: string;
  status: AssetStatus;
  acquisitionDate: string;
  acquisitionCost: number;
  isBookable: boolean;
  photoUrl: string | null;
  currentHolder?: { type: 'employee' | 'department'; id: string; name: string } | null;
}

export interface Allocation {
  id: string;
  assetId: string;
  asset?: Asset;
  employeeId: string | null;
  employee?: User | null;
  departmentId: string | null;
  department?: Department | null;
  allocatedById: string;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  status: AllocationStatus;
  returnCondition: string | null;
  checkInNotes: string | null;
  createdAt: string;
}

export interface TransferRequest {
  id: string;
  assetId: string;
  asset?: Asset;
  sourceAllocationId: string;
  toEmployeeId: string | null;
  toEmployee?: User | null;
  toDepartmentId: string | null;
  toDepartment?: Department | null;
  requestedById: string;
  requestedBy?: User;
  approverId: string | null;
  approver?: User | null;
  status: TransferStatus;
  reason: string;
  decisionNote: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  assetId: string;
  asset?: Asset;
  bookedById: string;
  bookedBy?: User;
  departmentId: string | null;
  startAt: string;
  endAt: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  asset?: Asset;
  reporterId: string;
  reporter?: User;
  approvedById: string | null;
  approver?: User | null;
  technicianId: string | null;
  technician?: User | null;
  priority: Priority;
  status: MaintenanceStatus;
  cost: number | null;
  resolution: string | null;
  issueDescription: string;
  attachmentUrl: string | null;
  approvalNote: string | null;
  reportedAt: string;
  resolvedAt: string | null;
}

export interface AuditCycle {
  id: string;
  name: string;
  scopeDepartmentId: string | null;
  scopeDepartment?: Department | null;
  scopeLocation: string | null;
  startDate: string;
  endDate: string;
  status: AuditCycleStatus;
  createdById: string;
  closedById: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface AuditItem {
  id: string;
  cycleId: string;
  assetId: string;
  asset?: Asset;
  auditorId: string | null;
  auditor?: User | null;
  result: AuditResult;
  notes: string | null;
  evidenceUrl: string | null;
  verifiedAt: string | null;
  resolutionStatus: ResolutionStatus;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  actorId: string | null;
  actor?: User | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: any;
  afterData: any;
  timestamp: string;
}
