import {
  User,
  Department,
  Category,
  Asset,
  Allocation,
  TransferRequest,
  Booking,
  MaintenanceRequest,
  AuditCycle,
  AuditItem,
  Notification,
  ActivityLog,
} from '../lib/types';

// Seed mock data
export let mockUsers: User[] = [
  {
    id: 'u-admin-1',
    name: 'Jane Admin',
    email: 'admin@assetflow.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    departmentId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'u-manager-1',
    name: 'Bob Manager',
    email: 'manager@assetflow.com',
    role: 'ASSET_MANAGER',
    status: 'ACTIVE',
    departmentId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'u-head-1',
    name: 'Alice Head',
    email: 'head@assetflow.com',
    role: 'DEPARTMENT_HEAD',
    status: 'ACTIVE',
    departmentId: 'd-eng',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'u-emp-1',
    name: 'Priya Patel',
    email: 'employee1@assetflow.com',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    departmentId: 'd-eng',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'u-emp-2',
    name: 'Raj Kumar',
    email: 'employee2@assetflow.com',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    departmentId: 'd-ops',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'u-emp-3',
    name: 'Charlie Smith',
    role: 'EMPLOYEE',
    email: 'employee3@assetflow.com',
    status: 'ACTIVE',
    departmentId: 'd-rd',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

export let mockDepartments: Department[] = [
  {
    id: 'd-eng',
    name: 'Engineering',
    code: 'ENG',
    parentDepartmentId: null,
    headUserId: 'u-head-1',
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'd-ops',
    name: 'Operations',
    code: 'OPS',
    parentDepartmentId: null,
    headUserId: null,
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'd-rd',
    name: 'Research & Development',
    code: 'RD',
    parentDepartmentId: 'd-eng',
    headUserId: null,
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

export let mockCategories: Category[] = [
  {
    id: 'c-elec',
    name: 'Electronics',
    description: 'Computing hardware, accessories, laboratory instruments',
    metadataSchema: {
      type: 'object',
      properties: {
        warrantyMonths: { type: 'number' },
        manufacturer: { type: 'string' },
      },
      required: ['warrantyMonths'],
    },
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'c-furn',
    name: 'Furniture',
    description: 'Office chairs, desks, whiteboards, cabinets',
    metadataSchema: {
      type: 'object',
      properties: {
        material: { type: 'string' },
      },
    },
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'c-veh',
    name: 'Vehicles',
    description: 'Delivery vans, company cars, motorized tools',
    metadataSchema: {
      type: 'object',
      properties: {
        licensePlate: { type: 'string' },
      },
      required: ['licensePlate'],
    },
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'c-room',
    name: 'Rooms',
    description: 'Meeting rooms, workspaces, laboratory spaces',
    metadataSchema: {
      type: 'object',
      properties: {
        capacity: { type: 'number' },
      },
    },
    status: 'ACTIVE',
    createdAt: '2026-07-01T00:00:00.000Z',
  },
];

export let mockAssets: Asset[] = [
  {
    id: 'a-1',
    assetTag: 'AF-0114',
    serialNumber: 'SN-ENG-0114',
    name: 'Developer Laptop Pro',
    description: '16-inch high-performance developer workstation',
    categoryId: 'c-elec',
    owningDepartmentId: 'd-eng',
    location: 'Main Lab 3A',
    condition: 'Good',
    status: 'ALLOCATED',
    acquisitionDate: '2026-01-15T00:00:00.000Z',
    acquisitionCost: 2499.00,
    isBookable: false,
    photoUrl: null,
    currentHolder: { type: 'employee', id: 'u-emp-1', name: 'Priya Patel' },
  },
  {
    id: 'a-2',
    assetTag: 'AF-0002',
    serialNumber: 'SN-ENG-0002',
    name: 'Standard Office Monitor',
    description: '27-inch 4K Ultra HD IPS Monitor',
    categoryId: 'c-elec',
    owningDepartmentId: 'd-eng',
    location: 'Office Desk 12',
    condition: 'New',
    status: 'AVAILABLE',
    acquisitionDate: '2026-02-10T00:00:00.000Z',
    acquisitionCost: 350.00,
    isBookable: false,
    photoUrl: null,
  },
  {
    id: 'a-3',
    assetTag: 'AF-0003',
    serialNumber: 'SN-ROOM-B2',
    name: 'Conference Room B2',
    description: 'Shared 12-person meeting room with projector',
    categoryId: 'c-room',
    owningDepartmentId: 'd-eng',
    location: 'Building B, Floor 2',
    condition: 'Excellent',
    status: 'AVAILABLE',
    acquisitionDate: '2025-06-01T00:00:00.000Z',
    acquisitionCost: 0,
    isBookable: true,
    photoUrl: null,
  },
  {
    id: 'a-4',
    assetTag: 'AF-0004',
    serialNumber: 'SN-VEH-004',
    name: 'Transit Delivery Van',
    description: 'Utility delivery van for logistics operations',
    categoryId: 'c-veh',
    owningDepartmentId: 'd-ops',
    location: 'Garage Box 1',
    condition: 'Fair',
    status: 'AVAILABLE',
    acquisitionDate: '2024-05-15T00:00:00.000Z',
    acquisitionCost: 32000.00,
    isBookable: true,
    photoUrl: null,
  },
];

export let mockAllocations: Allocation[] = [
  {
    id: 'al-1',
    assetId: 'a-1',
    employeeId: 'u-emp-1',
    departmentId: null,
    allocatedById: 'u-manager-1',
    expectedReturnAt: '2026-12-31T18:00:00.000Z',
    returnedAt: null,
    status: 'ACTIVE',
    returnCondition: null,
    checkInNotes: null,
    createdAt: '2026-07-01T10:00:00.000Z',
  },
];

export let mockTransfers: TransferRequest[] = [];

export let mockBookings: Booking[] = [
  {
    id: 'b-1',
    assetId: 'a-3', // Room B2
    bookedById: 'u-emp-1', // Priya Patel
    departmentId: 'd-eng',
    startAt: '2026-07-12T09:00:00.000Z',
    endAt: '2026-07-12T10:00:00.000Z',
    purpose: 'Weekly Standup Engineering Team',
    status: 'UPCOMING',
    createdAt: '2026-07-11T12:00:00.000Z',
  },
];

export let mockMaintenance: MaintenanceRequest[] = [];
export let mockAuditCycles: AuditCycle[] = [];
export let mockAuditItems: AuditItem[] = [];

export let mockNotifications: Notification[] = [
  {
    id: 'n-1',
    recipientId: 'u-emp-1',
    type: 'Asset Assigned',
    title: 'New Asset Assigned',
    message: 'Developer Laptop Pro (AF-0114) has been allocated to you.',
    readAt: null,
    entityType: 'Asset',
    entityId: 'a-1',
    timestamp: '2026-07-01T10:05:00.000Z',
  },
];

export let mockActivityLogs: ActivityLog[] = [
  {
    id: 'l-1',
    actorId: 'u-manager-1',
    action: 'ALLOCATION_CREATE',
    entityType: 'Allocation',
    entityId: 'al-1',
    beforeData: null,
    afterData: { assetId: 'a-1', employeeId: 'u-emp-1' },
    timestamp: '2026-07-01T10:00:00.000Z',
  },
];

// Helper database updates
export const db = {
  getAssets: () => mockAssets,
  getAssetById: (id: string) => mockAssets.find((a) => a.id === id),
  addAsset: (asset: Asset) => {
    mockAssets.push(asset);
  },
  updateAsset: (id: string, updates: Partial<Asset>) => {
    mockAssets = mockAssets.map((a) => (a.id === id ? { ...a, ...updates } : a));
  },
  getAllocations: () => mockAllocations,
  addAllocation: (alloc: Allocation) => {
    mockAllocations.push(alloc);
  },
  updateAllocation: (id: string, updates: Partial<Allocation>) => {
    mockAllocations = mockAllocations.map((a) => (a.id === id ? { ...a, ...updates } : a));
  },
  getTransfers: () => mockTransfers,
  addTransfer: (req: TransferRequest) => {
    mockTransfers.push(req);
  },
  updateTransfer: (id: string, updates: Partial<TransferRequest>) => {
    mockTransfers = mockTransfers.map((t) => (t.id === id ? { ...t, ...updates } : t));
  },
  getBookings: () => mockBookings,
  addBooking: (b: Booking) => {
    mockBookings.push(b);
  },
  updateBooking: (id: string, updates: Partial<Booking>) => {
    mockBookings = mockBookings.map((b) => (b.id === id ? { ...b, ...updates } : b));
  },
  getMaintenance: () => mockMaintenance,
  addMaintenance: (req: MaintenanceRequest) => {
    mockMaintenance.push(req);
  },
  updateMaintenance: (id: string, updates: Partial<MaintenanceRequest>) => {
    mockMaintenance = mockMaintenance.map((m) => (m.id === id ? { ...m, ...updates } : m));
  },
  getAudits: () => mockAuditCycles,
  addAudit: (c: AuditCycle) => {
    mockAuditCycles.push(c);
  },
  updateAudit: (id: string, updates: Partial<AuditCycle>) => {
    mockAuditCycles = mockAuditCycles.map((c) => (c.id === id ? { ...c, ...updates } : c));
  },
  getAuditItems: () => mockAuditItems,
  addAuditItems: (items: AuditItem[]) => {
    mockAuditItems.push(...items);
  },
  updateAuditItem: (id: string, updates: Partial<AuditItem>) => {
    mockAuditItems = mockAuditItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
  },
  getNotifications: () => mockNotifications,
  addNotification: (n: Notification) => {
    mockNotifications.unshift(n); // Newest first
  },
  markNotificationRead: (id: string) => {
    mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  },
  markAllNotificationsRead: (recipientId: string) => {
    mockNotifications = mockNotifications.map((n) => (n.recipientId === recipientId ? { ...n, readAt: new Date().toISOString() } : n));
  },
  getActivityLogs: () => mockActivityLogs,
  addActivityLog: (log: ActivityLog) => {
    mockActivityLogs.unshift(log);
  },
};
