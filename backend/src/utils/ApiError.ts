export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string, details: unknown[] = []) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static validation(message: string, details: unknown[] = []) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "You are not allowed to perform this action") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string) {
    return new ApiError(409, "CONFLICT", message);
  }

  static unsupported(message: string) {
    return new ApiError(501, "NOT_IMPLEMENTED", message);
  }

  static tooLarge(message: string) {
    return new ApiError(413, "PAYLOAD_TOO_LARGE", message);
  }

  static unprocessable(message: string, details: unknown[] = []) {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, details);
  }
}
