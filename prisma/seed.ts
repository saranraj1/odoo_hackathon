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
