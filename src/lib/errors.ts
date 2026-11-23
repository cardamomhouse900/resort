/**
 * Expected, user-facing failures (as opposed to bugs). API routes turn these
 * into JSON responses with the given HTTP status; anything else becomes a 500.
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_DATES"
  | "OCCUPANCY_EXCEEDED"
  | "ROOM_TYPE_NOT_FOUND"
  | "NOT_AVAILABLE"
  | "CONFLICT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE";

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_DATES: 400,
  OCCUPANCY_EXCEEDED: 400,
  ROOM_TYPE_NOT_FOUND: 404,
  NOT_AVAILABLE: 409,
  CONFLICT: 409,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

/**
 * PostgreSQL SQLSTATE behind a Prisma error. With the pg driver adapter, Prisma
 * reports database errors it has no specific code for as P2039 and puts the
 * original SQLSTATE in meta.driverAdapterError.cause.originalCode.
 */
function sqlState(error: unknown): string | undefined {
  const cause = (error as { meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } } })?.meta
    ?.driverAdapterError?.cause;
  return typeof cause?.originalCode === "string" ? cause.originalCode : undefined;
}

/** 23P01 = exclusion_violation, raised by the reservations_no_overlap constraint. */
export function isOverlapViolation(error: unknown): boolean {
  return sqlState(error) === "23P01";
}

/** Unique-constraint violation (e.g. a duplicate booking code). */
export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002" || sqlState(error) === "23505";
}
