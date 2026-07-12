import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { sendSuccess } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { UnauthorizedError, ConflictError, InactiveAccountError } from '../utils/errors';
import { Role, UserStatus } from '@prisma/client';
import { ActivityLogService } from '../services/activity.service';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

router.post('/signup', async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: Role.EMPLOYEE, // Public signup always defaults to EMPLOYEE
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
      },
    });

    await ActivityLogService.log({
      actorId: user.id,
      action: 'USER_SIGNUP',
      entityType: 'User',
      entityId: user.id,
      afterData: { name: user.name, email: user.email, role: user.role },
    });

    return sendSuccess(res, user, 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new InactiveAccountError();
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    await ActivityLogService.log({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      departmentId: user.departmentId,
    };

    return sendSuccess(res, userResponse, 'Login successful');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticateJWT, async (req, res, next) => {
  try {
    res.clearCookie('token');
    await ActivityLogService.log({
      actorId: req.user?.id,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user?.id || '',
    });
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticateJWT, (req, res) => {
  return sendSuccess(res, req.user);
});

router.patch('/password', authenticateJWT, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await ActivityLogService.log({
      actorId: user.id,
      action: 'USER_PASSWORD_CHANGE',
      entityType: 'User',
      entityId: user.id,
    });

    return sendSuccess(res, null, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent user enumeration
      return sendSuccess(res, null, 'If that email exists, a password reset link has been logged.');
    }

    const mockToken = jwt.sign({ id: user.id, action: 'RESET_PASSWORD' }, env.JWT_SECRET, { expiresIn: '1h' });
    console.log(`🔑 PASSWORD RESET MOCK: For user ${email}. Link: http://localhost:3000/api/auth/reset?token=${mockToken}`);

    return sendSuccess(res, null, 'If that email exists, a password reset link has been logged.');
  } catch (err) {
    next(err);
  }
});

export default router;
