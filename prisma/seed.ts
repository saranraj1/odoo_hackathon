import { PrismaClient, Role, UserStatus, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hashing password "Password123"
  const passwordHash = await bcrypt.hash('Password123', 10);

  // 1. Seed Users (Baseline demo accounts)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@assetflow.com' },
    update: {},
    create: {
      name: 'Jane Admin',
      email: 'admin@assetflow.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@assetflow.com' },
    update: {},
    create: {
      name: 'Bob Manager',
      email: 'manager@assetflow.com',
      passwordHash,
      role: Role.ASSET_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const deptHeadUser = await prisma.user.upsert({
    where: { email: 'head@assetflow.com' },
    update: {},
    create: {
      name: 'Alice Head',
      email: 'head@assetflow.com',
      passwordHash,
      role: Role.DEPARTMENT_HEAD,
      status: UserStatus.ACTIVE,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: 'employee1@assetflow.com' },
    update: {},
    create: {
      name: 'Priya Patel',
      email: 'employee1@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'employee2@assetflow.com' },
    update: {},
    create: {
      name: 'Raj Kumar',
      email: 'employee2@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  });

  const emp3 = await prisma.user.upsert({
    where: { email: 'employee3@assetflow.com' },
    update: {},
    create: {
      name: 'Charlie Smith',
      email: 'employee3@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Users seeded.');

  // 2. Seed Departments
  const engDept = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {
      headUserId: deptHeadUser.id,
    },
    create: {
      name: 'Engineering',
      code: 'ENG',
      status: Status.ACTIVE,
      headUserId: deptHeadUser.id,
    },
  });

  // Update Alice Head's departmentId
  await prisma.user.update({
    where: { id: deptHeadUser.id },
    data: { departmentId: engDept.id },
  });

  const opsDept = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: {
      name: 'Operations',
      code: 'OPS',
      status: Status.ACTIVE,
    },
  });

  const rdDept = await prisma.department.upsert({
    where: { code: 'RD' },
    update: {},
    create: {
      name: 'Research & Development',
      code: 'RD',
      parentDepartmentId: engDept.id,
      status: Status.ACTIVE,
    },
  });

  // Assign employees to departments
  await prisma.user.update({
    where: { id: emp1.id },
    data: { departmentId: engDept.id },
  });
  await prisma.user.update({
    where: { id: emp2.id },
    data: { departmentId: opsDept.id },
  });
  await prisma.user.update({
    where: { id: emp3.id },
    data: { departmentId: rdDept.id },
  });

  console.log('✅ Departments seeded & employees assigned.');

  // 3. Seed Categories
  const categoryElectronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: {
      name: 'Electronics',
      description: 'Computing hardware, accessories, laboratory instruments',
      status: Status.ACTIVE,
      metadataSchema: {
        type: 'object',
        properties: {
          warrantyMonths: { type: 'number' },
          manufacturer: { type: 'string' },
        },
        required: ['warrantyMonths'],
      },
    },
  });

  const categoryFurniture = await prisma.category.upsert({
    where: { name: 'Furniture' },
    update: {},
    create: {
      name: 'Furniture',
      description: 'Office chairs, desks, whiteboards, cabinets',
      status: Status.ACTIVE,
      metadataSchema: {
        type: 'object',
        properties: {
          material: { type: 'string' },
        },
      },
    },
  });

  const categoryVehicles = await prisma.category.upsert({
    where: { name: 'Vehicles' },
    update: {},
    create: {
      name: 'Vehicles',
      description: 'Delivery vans, company cars, motorized tools',
      status: Status.ACTIVE,
      metadataSchema: {
        type: 'object',
        properties: {
          licensePlate: { type: 'string' },
        },
        required: ['licensePlate'],
      },
    },
  });

  const categoryRooms = await prisma.category.upsert({
    where: { name: 'Rooms' },
    update: {},
    create: {
      name: 'Rooms',
      description: 'Meeting rooms, workspaces, laboratory spaces',
      status: Status.ACTIVE,
      metadataSchema: {
        type: 'object',
        properties: {
          capacity: { type: 'number' },
        },
      },
    },
  });

  console.log('✅ Categories seeded.');

  // 4. Seed demo assets for the connected-journey walkthrough
  const roomB2 = await prisma.asset.upsert({
    where: { assetTag: 'AF-0003' },
    update: {},
    create: {
      assetTag: 'AF-0003',
      serialNumber: 'SN-ROOM-B2',
      name: 'Conference Room B2',
      description: 'Shared 12-person meeting room with projector',
      categoryId: categoryRooms.id,
      owningDepartmentId: engDept.id,
      location: 'Building B, Floor 2',
      condition: 'Excellent',
      status: 'AVAILABLE',
      acquisitionDate: new Date('2025-06-01'),
      acquisitionCost: 0,
      isBookable: true,
    },
  });

  const laptop = await prisma.asset.upsert({
    where: { assetTag: 'AF-0114' },
    update: {},
    create: {
      assetTag: 'AF-0114',
      serialNumber: 'SN-ENG-0114',
      name: 'Developer Laptop Pro',
      description: '16-inch high-performance developer workstation',
      categoryId: categoryElectronics.id,
      owningDepartmentId: engDept.id,
      location: 'Main Lab 3A',
      condition: 'Good',
      status: 'AVAILABLE',
      acquisitionDate: new Date('2026-01-15'),
      acquisitionCost: 2499.0,
      isBookable: false,
    },
  });

  console.log('✅ Demo assets seeded (Conference Room B2, Developer Laptop Pro - both AVAILABLE).');

  // Pre-existing booking for Room B2 so the overlap-rejection demo step has
  // something to conflict with. Anchored to "tomorrow" at seed time so it's
  // always in the future no matter when this script actually runs.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const bookingStart = new Date(tomorrow);
  bookingStart.setHours(9, 0, 0, 0);
  const bookingEnd = new Date(tomorrow);
  bookingEnd.setHours(10, 0, 0, 0);

  const existingBooking = await prisma.booking.findFirst({
    where: { assetId: roomB2.id, purpose: 'Weekly Standup Engineering Team' },
  });
  if (!existingBooking) {
    await prisma.booking.create({
      data: {
        assetId: roomB2.id,
        bookedById: emp1.id,
        departmentId: engDept.id,
        startAt: bookingStart,
        endAt: bookingEnd,
        purpose: 'Weekly Standup Engineering Team',
        status: 'UPCOMING',
      },
    });
    console.log(
      `✅ Room B2 booked ${bookingStart.toLocaleString()} - ${bookingEnd.toLocaleTimeString()}. ` +
        `Use this date to test the booking overlap (09:30) and adjacent-slot (10:00) rules.`
    );
  }

  console.log('🌱 Database seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
