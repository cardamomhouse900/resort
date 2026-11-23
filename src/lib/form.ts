import { z } from "zod";
import { AppError } from "./errors";

/** Result returned by admin Server Actions to their forms. */
export type FormState = {
  ok: boolean;
  message?: string;
  /** field name → first error message */
  errors?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

/**
 * FormData → plain object. Repeated keys (e.g. checkbox groups) become arrays
 * when the key ends with "[]".
 */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION")) continue; // Next.js internals
    const v = typeof value === "string" ? value : value.name;
    if (key.endsWith("[]")) {
      const k = key.slice(0, -2);
      out[k] = [...((out[k] as unknown[]) ?? []), v];
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function parseForm<S extends z.ZodType>(
  schema: S,
  form: FormData,
): { data: z.infer<S>; state?: never } | { data?: never; state: FormState } {
  const result = schema.safeParse(formToObject(form));
  if (result.success) return { data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { state: { ok: false, message: "Please correct the highlighted fields.", errors } };
}

/** Converts expected errors into a form message; re-throws anything unexpected. */
export function actionError(error: unknown): FormState {
  if (error instanceof AppError) return { ok: false, message: error.message };
  const code = (error as { code?: string })?.code;
  if (code === "P2002")
    return { ok: false, message: "That value is already in use (for example, the URL slug)." };
  if (code === "P2003") return { ok: false, message: "This item is still in use and cannot be deleted." };
  if (code === "P2025") return { ok: false, message: "This item no longer exists." };
  throw error;
}
