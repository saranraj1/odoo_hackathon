import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { sendError } from '../utils/response';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}] - Status ${err.statusCode} - ${err.message}`);
    return sendError(res, err.code, err.message, err.statusCode, err.errors);
  }

  if (err instanceof ZodError) {
    logger.warn(`ValidationError (Zod) - ${JSON.stringify(err.format())}`);
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, errors);
  }

  logger.error({ stack: err.stack }, `Unhandled Error: ${err.message}`);

  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
}
