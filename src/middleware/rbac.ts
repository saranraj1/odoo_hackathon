import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
}

export function isSelfOrAdmin(req: Request, resourceUserId: string): boolean {
  if (!req.user) return false;
  return req.user.role === Role.ADMIN || req.user.id === resourceUserId;
}

export function checkDepartmentScope(req: Request, targetDepartmentId: string | null): boolean {
  if (!req.user) return false;
  if (req.user.role === Role.ADMIN || req.user.role === Role.ASSET_MANAGER) return true;
  if (req.user.role === Role.DEPARTMENT_HEAD) {
    return req.user.departmentId !== null && req.user.departmentId === targetDepartmentId;
  }
  return false;
}
