export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public errors: any[] = []
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', errors: any[] = []) {
    super(400, 'BAD_REQUEST', message, errors);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error', errors: any[] = []) {
    super(400, 'VALIDATION_ERROR', message, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class InactiveAccountError extends AppError {
  constructor(message: string = 'This account has been deactivated. Contact your administrator.') {
    super(403, 'ACCOUNT_INACTIVE', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = 'CONFLICT') {
    super(409, code, message);
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(message: string) {
    super(409, 'INVALID_STATE_TRANSITION', message);
  }
}

export class BookingOverlapError extends AppError {
  constructor(message: string) {
    super(409, 'BOOKING_OVERLAP', message);
  }
}
