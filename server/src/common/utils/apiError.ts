export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (resource: string) =>
  new ApiError(404, `${resource} not found`);

export const unauthorized = (msg = "Unauthorized") => new ApiError(401, msg);

export const forbidden = (msg = "Forbidden") => new ApiError(403, msg);

export const badRequest = (msg: string) => new ApiError(400, msg);

export const tooManyRequests = (msg = "Too many requests") =>
  new ApiError(429, msg);
