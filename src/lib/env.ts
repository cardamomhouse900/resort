import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated lazily per integration so that a missing
 * key for a feature not yet configured (e.g. Razorpay during Phase 2) does not
 * break unrelated pages. Each getter throws a clear error on first use.
 */

const nonEmpty = z.string().trim().min(1);

const schemas = {
  database: z.object({ DATABASE_URL: nonEmpty }),
  supabase: z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmpty,
  }),
  razorpay: z.object({
    RAZORPAY_KEY_ID: nonEmpty,
    RAZORPAY_KEY_SECRET: nonEmpty,
    RAZORPAY_WEBHOOK_SECRET: nonEmpty,
  }),
  cloudinary: z.object({
    CLOUDINARY_CLOUD_NAME: nonEmpty,
    CLOUDINARY_API_KEY: nonEmpty,
    CLOUDINARY_API_SECRET: nonEmpty,
  }),
  email: z.object({
    RESEND_API_KEY: nonEmpty,
    EMAIL_FROM: nonEmpty,
    ADMIN_NOTIFICATION_EMAIL: z.email(),
  }),
} as const;

type Group = keyof typeof schemas;
const cache = new Map<Group, unknown>();

export function getEnv<G extends Group>(group: G): z.infer<(typeof schemas)[G]> {
  if (!cache.has(group)) {
    const result = schemas[group].safeParse(process.env);
    if (!result.success) {
      const keys = result.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables for "${group}": ${keys}`);
    }
    cache.set(group, result.data);
  }
  return cache.get(group) as z.infer<(typeof schemas)[G]>;
}
