export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/** An error whose code and message are safe to return to the client. */
export class ApiFailure extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
    this.status = STATUS[code];
    this.fields = fields;
  }
}

export const invalid = (message: string, fields?: Record<string, string>) =>
  new ApiFailure('VALIDATION_ERROR', message, fields);
export const unauthenticated = () => new ApiFailure('UNAUTHENTICATED', 'Sign in to continue.');
export const forbidden = (message = 'You do not have permission to do that.') =>
  new ApiFailure('FORBIDDEN', message);
export const notFound = (message = 'Not found.') => new ApiFailure('NOT_FOUND', message);
export const conflict = (message: string) => new ApiFailure('CONFLICT', message);
export const internal = () => new ApiFailure('INTERNAL_ERROR', 'Something went wrong.');
export const unavailable = () =>
  new ApiFailure('SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.');
