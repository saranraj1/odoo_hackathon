import { Response } from 'express';

export function sendSuccess(res: Response, data: any = null, message?: string, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  errors: any[] = []
) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    errors,
  });
}
