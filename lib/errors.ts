export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso no encontrado", details?: unknown) {
    super("NOT_FOUND", message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super("CONFLICT", message, 409, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super("BAD_REQUEST", message, 400, details);
  }
}
