import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";
import { checkRateLimit, clientKey, type LimiterName } from "./rate-limit";

/** Booking/payment responses must never be cached by browsers or CDNs. */
const NO_STORE = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 16 * 1024;

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function errorJson(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: NO_STORE },
  );
}

/** Reads and validates a JSON body. Rejects oversized and malformed payloads. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large.");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body is too large.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }
  return result.data;
}

export async function enforceRateLimit(req: Request, limiter: LimiterName) {
  if (!(await checkRateLimit(limiter, clientKey(req)))) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please wait a minute and try again.");
  }
}

/**
 * Wraps a route handler: expected AppErrors become JSON error responses with
 * their status; anything unexpected is logged and returned as a generic 500
 * (no internal details leak to the client).
 */
export function handle<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      if (error instanceof AppError) return errorJson(error.code, error.message, error.status, error.details);
      console.error("[api] unexpected error", req.method, new URL(req.url).pathname, error);
      return errorJson("INTERNAL_ERROR", "Something went wrong on our side. Please try again.", 500);
    }
  };
}
