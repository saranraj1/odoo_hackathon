import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/db';
import bcrypt from 'bcryptjs';
import { Role, UserStatus, Status } from '@prisma/client';

let adminCookie = '';
let employeeCookie = '';
let testEmployeeId = '';
let engineeringDeptId = '';

beforeAll(async () => {
  // Clear the database and seed fresh baseline test records
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.category.deleteMany({});

  const passwordHash = await bcrypt.hash('Password123', 10);

  // Seed Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'admin_test@assetflow.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Seed Employee
  const emp = await prisma.user.create({
    data: {
      name: 'Test Employee',
      email: 'employee_test@assetflow.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  });
  testEmployeeId = emp.id;

  // Log in as Admin to get cookie
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin_test@assetflow.com', password: 'Password123' });
  adminCookie = adminLogin.headers['set-cookie'][0];

  // Log in as Employee to get cookie
  const empLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'employee_test@assetflow.com', password: 'Password123' });
  employeeCookie = empLogin.headers['set-cookie'][0];
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('AssetFlow Platform & Foundation API Tests', () => {
  
  describe('Authentication & Role Protections', () => {
    it('should create an EMPLOYEE on public signup, ignoring supplied elevated roles', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Hacker User',
          email: 'hacker@assetflow.com',
          password: 'Password123',
          role: 'ADMIN', // Try to escalate role
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.EMPLOYEE); // Must be EMPLOYEE
    });

    it('should block logins with incorrect passwords', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_test@assetflow.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should block de-activated users from accessing endpoints', async () => {
      // Deactivate test employee
      await prisma.user.update({
        where: { id: testEmployeeId },
        data: { status: UserStatus.INACTIVE },
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [employeeCookie]);

      // The auth middleware raises InactiveAccountError which maps to 403 ACCOUNT_INACTIVE
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_INACTIVE');

      // Re-activate test employee for subsequent tests
      await prisma.user.update({
        where: { id: testEmployeeId },
        data: { status: UserStatus.ACTIVE },
      });
    });

    it('should block non-admins from creating departments', async () => {
      // Employee is ACTIVE again; attempt to create a department should hit RBAC
      const res = await request(app)
        .post('/api/departments')
        .set('Cookie', [employeeCookie])
        .send({ name: 'HR Department', code: 'HR' });

      expect(res.status).toBe(403);
      // The requireRole middleware raises FORBIDDEN
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('Organization Setup APIs', () => {
    it('should allow Admin to create a department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Cookie', [adminCookie])
        .send({ name: 'Engineering', code: 'ENG' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ENG');
      engineeringDeptId = res.body.data.id;
    });

    it('should allow Admin to create a category with metadataSchema', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', [adminCookie])
        .send({
          name: 'Laptops',
          description: 'Company issued laptops',
          metadataSchema: {
            type: 'object',
            properties: {
              ramGB: { type: 'number' },
            },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Laptops');
    });

    it('should allow Admin to assign department to employee and promote role', async () => {
      const assignRes = await request(app)
        .patch(`/api/employees/${testEmployeeId}`)
        .set('Cookie', [adminCookie])
        .send({ departmentId: engineeringDeptId });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.departmentId).toBe(engineeringDeptId);

      const promoteRes = await request(app)
        .patch(`/api/employees/${testEmployeeId}/role`)
        .set('Cookie', [adminCookie])
        .send({ role: Role.DEPARTMENT_HEAD });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.data.role).toBe(Role.DEPARTMENT_HEAD);
    });

    it('should block deactivation of a department if it contains active employees', async () => {
      // Ensure the test employee is assigned to engineeringDeptId so the count is > 0
      // (the previous test promoted them to DEPARTMENT_HEAD with departmentId = engineeringDeptId)
      const activeCount = await prisma.user.count({
        where: { departmentId: engineeringDeptId, status: 'ACTIVE' },
      });
      if (activeCount === 0) {
        // Fallback: explicitly assign the employee to this dept
        await prisma.user.update({
          where: { id: testEmployeeId },
          data: { departmentId: engineeringDeptId },
        });
      }

      const res = await request(app)
        .patch(`/api/departments/${engineeringDeptId}`)
        .set('Cookie', [adminCookie])
        .send({ status: Status.INACTIVE });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });
  });

  describe('Shared Logging & Notifications', () => {
    it('should write an ActivityLog on critical mutations', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { action: 'EMPLOYEE_ROLE_PROMOTION' },
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].entityId).toBe(testEmployeeId);
    });
  });
});
