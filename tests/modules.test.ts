import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import { Role, UserStatus, Status } from '@prisma/client';

// This file intentionally avoids blanket-deleting User/Department/Category/
// ActivityLog/Notification: platform.test.ts owns those fixtures and may run
// concurrently against the same database. It only clears tables that belong
// exclusively to the modules under test here, and uses distinctly-named
// fixtures for anything shared.

let adminCookie = '';
let managerCookie = '';
let emp1Cookie = '';
let emp2Cookie = '';

let deptId = '';
let categoryId = '';
let emp1Id = '';
let emp2Id = '';

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123' });
  return res.headers['set-cookie'][0];
}

async function registerAsset(overrides: Record<string, any> = {}) {
  return request(app)
    .post('/api/assets')
    .set('Cookie', [managerCookie])
    .send({
      name: 'Test Widget',
      description: 'A widget for testing',
      categoryId,
      owningDepartmentId: deptId,
      location: 'Test Lab',
      condition: 'Good',
      serialNumber: `SN-TEST-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      acquisitionDate: '2026-01-01',
      acquisitionCost: 100,
      isBookable: false,
      ...overrides,
    });
}

beforeAll(async () => {
  await prisma.auditItem.deleteMany({});
  await prisma.auditAssignment.deleteMany({});
  await prisma.auditCycle.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.transferRequest.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.allocation.deleteMany({});
  await prisma.asset.deleteMany({});

  const passwordHash = await bcrypt.hash('Password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin_modules_test@assetflow.com' },
    update: { status: UserStatus.ACTIVE, role: Role.ADMIN },
    create: {
      name: 'Modules Test Admin',
      email: 'admin_modules_test@assetflow.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager_modules_test@assetflow.com' },
    update: { status: UserStatus.ACTIVE, role: Role.ASSET_MANAGER },
    create: {
      name: 'Modules Test Manager',
      email: 'manager_modules_test@assetflow.com',
      passwordHash,
      role: Role.ASSET_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const dept = await prisma.department.upsert({
    where: { code: 'MODTEST' },
    update: {},
    create: { name: 'Modules Test Dept', code: 'MODTEST', status: Status.ACTIVE },
  });
  deptId = dept.id;

  const emp1 = await prisma.user.upsert({
    where: { email: 'emp1_modules_test@assetflow.com' },
    update: { status: UserStatus.ACTIVE, role: Role.EMPLOYEE, departmentId: dept.id },
    create: {
      name: 'Modules Test Employee One',
      email: 'emp1_modules_test@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      departmentId: dept.id,
    },
  });
  emp1Id = emp1.id;

  const emp2 = await prisma.user.upsert({
    where: { email: 'emp2_modules_test@assetflow.com' },
    update: { status: UserStatus.ACTIVE, role: Role.EMPLOYEE, departmentId: dept.id },
    create: {
      name: 'Modules Test Employee Two',
      email: 'emp2_modules_test@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      departmentId: dept.id,
    },
  });
  emp2Id = emp2.id;

  const category = await prisma.category.upsert({
    where: { name: 'Modules Test Category' },
    update: {},
    create: { name: 'Modules Test Category', description: 'For module integration tests', status: Status.ACTIVE },
  });
  categoryId = category.id;

  adminCookie = await login('admin_modules_test@assetflow.com');
  managerCookie = await login('manager_modules_test@assetflow.com');
  emp1Cookie = await login('emp1_modules_test@assetflow.com');
  emp2Cookie = await login('emp2_modules_test@assetflow.com');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Assets', () => {
  it('auto-generates unique asset tags for successive registrations', async () => {
    const res1 = await registerAsset();
    const res2 = await registerAsset();

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.data.assetTag).not.toBe(res2.body.data.assetTag);
    expect(res1.body.data.assetTag).toMatch(/^AF-\d{4,}$/);
  });

  it('rejects a duplicate serial number', async () => {
    const serialNumber = `SN-DUP-${Date.now()}`;
    const first = await registerAsset({ serialNumber });
    expect(first.status).toBe(201);

    const second = await registerAsset({ serialNumber });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('CONFLICT');
  });

  it('blocks non-Asset-Managers from registering an asset', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Cookie', [emp1Cookie])
      .send({
        name: 'Unauthorized Widget',
        description: 'Should not be created',
        categoryId,
        owningDepartmentId: deptId,
        location: 'Test Lab',
        condition: 'Good',
        serialNumber: `SN-UNAUTH-${Date.now()}`,
        acquisitionDate: '2026-01-01',
        acquisitionCost: 100,
      });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('Allocation and Transfer', () => {
  let assetId = '';
  let sourceAllocationId = '';
  let transferId = '';

  it('allocates an available asset and generates a notification', async () => {
    const registerRes = await registerAsset({ name: 'Allocation Test Asset' });
    assetId = registerRes.body.data.id;

    const allocRes = await request(app)
      .post('/api/allocations')
      .set('Cookie', [managerCookie])
      .send({ assetId, employeeId: emp1Id });

    expect(allocRes.status).toBe(201);
    sourceAllocationId = allocRes.body.data.id;

    const notifications = await prisma.notification.findMany({
      where: { recipientId: emp1Id, type: 'Asset Assigned', entityId: assetId },
    });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('blocks a conflicting allocation of the same asset', async () => {
    const res = await request(app)
      .post('/api/allocations')
      .set('Cookie', [managerCookie])
      .send({ assetId, employeeId: emp2Id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ASSET_ALREADY_ALLOCATED');
    expect(res.body.message).toContain('Modules Test Employee One');
  });

  it('requests and atomically approves a transfer to a new holder', async () => {
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Cookie', [emp2Cookie])
      .send({
        assetId,
        sourceAllocationId,
        toEmployeeId: emp2Id,
        reason: 'Employee One is going on leave',
      });
    expect(transferRes.status).toBe(201);
    transferId = transferRes.body.data.id;

    const approveRes = await request(app)
      .patch(`/api/transfers/${transferId}`)
      .set('Cookie', [managerCookie])
      .send({ status: 'APPROVED' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    const oldAllocation = await prisma.allocation.findUnique({ where: { id: sourceAllocationId } });
    expect(oldAllocation?.status).toBe('RETURNED');

    const newAllocation = await prisma.allocation.findFirst({
      where: { assetId, employeeId: emp2Id, status: 'ACTIVE' },
    });
    expect(newAllocation).not.toBeNull();

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('ALLOCATED');
  });

  it('returns an allocated asset and restores it to Available', async () => {
    const activeAlloc = await prisma.allocation.findFirst({ where: { assetId, status: 'ACTIVE' } });
    const res = await request(app)
      .patch(`/api/allocations/${activeAlloc!.id}/return`)
      .set('Cookie', [managerCookie])
      .send({ returnCondition: 'Good', checkInNotes: 'Returned in good order' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RETURNED');

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('AVAILABLE');
  });
});

describe('Booking', () => {
  let roomId = '';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const at = (h: number, m = 0) => {
    const d = new Date(tomorrow);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  it('creates a booking for a bookable resource', async () => {
    const res = await registerAsset({ name: 'Test Booking Room', isBookable: true });
    roomId = res.body.data.id;

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', [emp1Cookie])
      .send({ assetId: roomId, startAt: at(9), endAt: at(10), purpose: 'Standup' });

    expect(bookingRes.status).toBe(201);
  });

  it('rejects an overlapping booking (09:30-10:30 vs 09:00-10:00)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', [emp2Cookie])
      .send({ assetId: roomId, startAt: at(9, 30), endAt: at(10, 30), purpose: 'Conflicting meeting' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_OVERLAP');
  });

  it('accepts an adjacent booking (10:00-11:00 vs 09:00-10:00)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', [emp2Cookie])
      .send({ assetId: roomId, startAt: at(10), endAt: at(11), purpose: 'Adjacent meeting' });

    expect(res.status).toBe(201);
  });

  it('lets the owner cancel their own booking, freeing the slot (cancelled bookings do not block)', async () => {
    const booking = await prisma.booking.findFirst({ where: { assetId: roomId, purpose: 'Standup' } });
    const cancelRes = await request(app)
      .post(`/api/bookings/${booking!.id}/cancel`)
      .set('Cookie', [emp1Cookie]);
    expect(cancelRes.status).toBe(200);

    const rebookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', [emp2Cookie])
      .send({ assetId: roomId, startAt: at(9), endAt: at(10), purpose: 'Rebooked slot' });
    expect(rebookRes.status).toBe(201);
  });

  it('rejects invalid date ranges', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', [emp1Cookie])
      .send({ assetId: roomId, startAt: at(14), endAt: at(13), purpose: 'Backwards range' });
    expect(res.status).toBe(400);
  });
});

describe('Maintenance', () => {
  let assetId = '';
  let requestId = '';

  it('raises a maintenance request', async () => {
    const assetRes = await registerAsset({ name: 'Maintenance Test Asset' });
    assetId = assetRes.body.data.id;

    const res = await request(app)
      .post('/api/maintenance')
      .set('Cookie', [emp1Cookie])
      .send({ assetId, priority: 'HIGH', issueDescription: 'Screen is flickering intermittently' });

    expect(res.status).toBe(201);
    requestId = res.body.data.id;
  });

  it('blocks skipping straight from Pending to In Progress', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [managerCookie])
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('approves the request and moves the asset to Under Maintenance', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [managerCookie])
      .send({ status: 'APPROVED', approvalNote: 'Approved for repair' });

    expect(res.status).toBe(200);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('UNDER_MAINTENANCE');
  });

  it('assigns a technician, and only that technician may start work', async () => {
    const assignRes = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [managerCookie])
      .send({ status: 'TECHNICIAN_ASSIGNED', technicianId: emp2Id });
    expect(assignRes.status).toBe(200);

    const wrongTechRes = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [emp1Cookie])
      .send({ status: 'IN_PROGRESS' });
    expect(wrongTechRes.status).toBe(403);

    const startRes = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [emp2Cookie])
      .send({ status: 'IN_PROGRESS' });
    expect(startRes.status).toBe(200);
  });

  it('resolves the work order and restores the asset to Available', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${requestId}`)
      .set('Cookie', [emp2Cookie])
      .send({ status: 'RESOLVED', resolution: 'Replaced the display cable', cost: 45.5, condition: 'Good' });

    expect(res.status).toBe(200);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset?.status).toBe('AVAILABLE');
  });
});

describe('Audits', () => {
  let cycleId = '';

  it('creates and activates a cycle, snapshotting in-scope assets', async () => {
    const createRes = await request(app)
      .post('/api/audits')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Modules Test Audit Cycle',
        scopeDepartmentId: deptId,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
    expect(createRes.status).toBe(201);
    cycleId = createRes.body.data.id;

    const activateRes = await request(app).post(`/api/audits/${cycleId}/activate`).set('Cookie', [adminCookie]);
    expect(activateRes.status).toBe(200);

    const detailRes = await request(app).get(`/api/audits/${cycleId}`).set('Cookie', [adminCookie]);
    expect(detailRes.body.data.items.length).toBeGreaterThan(0);
  });

  it('closes the cycle and then rejects further item edits as locked', async () => {
    const detailRes = await request(app).get(`/api/audits/${cycleId}`).set('Cookie', [adminCookie]);
    const firstItem = detailRes.body.data.items[0];

    const closeRes = await request(app).post(`/api/audits/${cycleId}/close`).set('Cookie', [adminCookie]);
    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('CLOSED');

    const editRes = await request(app)
      .patch(`/api/audits/${cycleId}/items/${firstItem.id}`)
      .set('Cookie', [adminCookie])
      .send({ result: 'VERIFIED' });
    expect(editRes.status).toBe(409);
    expect(editRes.body.code).toBe('AUDIT_CYCLE_LOCKED');
  });
});
