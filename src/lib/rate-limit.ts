import "server-only";

/**
 * Rate limiting for sensitive endpoints — no Redis needed.
 *
 * Production (Cloudflare): uses the Workers Rate Limiting bindings declared in
 * wrangler.jsonc. Counters are kept per Cloudflare location, which is ideal
 * for stopping abuse from a single client.
 * Local development / tests: an in-memory fixed window with the same limits.
 */

export type LimiterName = "RL_AVAILABILITY" | "RL_BOOKING" | "RL_CONTACT" | "RL_LOGIN";

/** Must match wrangler.jsonc → ratelimits. */
const LIMITS: Record<LimiterName, { limit: number; periodSec: number }> = {
  RL_AVAILABILITY: { limit: 30, periodSec: 60 },
  RL_BOOKING: { limit: 5, periodSec: 60 },
  RL_CONTACT: { limit: 3, periodSec: 60 },
  RL_LOGIN: { limit: 5, periodSec: 60 },
};

type RateLimitBinding = { limit(opts: { key: string }): Promise<{ success: boolean }> };

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(name: LimiterName, key: string): boolean {
  const { limit, periodSec } = LIMITS[name];
  const now = Date.now();
  const k = `${name}:${key}`;
  const entry = memory.get(k);
  if (!entry || entry.resetAt <= now) {
    memory.set(k, { count: 1, resetAt: now + periodSec * 1000 });
    if (memory.size > 10_000) {
      for (const [mk, v] of memory) if (v.resetAt <= now) memory.delete(mk);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/** Returns true when the request is allowed. */
export async function checkRateLimit(name: LimiterName, key: string): Promise<boolean> {
  if (process.env.DISABLE_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") return true;
  const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  if (isWorkers) {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const binding = (getCloudflareContext().env as unknown as Record<string, RateLimitBinding | undefined>)[
      name
    ];
    if (binding) return (await binding.limit({ key })).success;
  }
  return memoryLimit(name, key);
}

/** Best-effort client identifier (Cloudflare sets cf-connecting-ip). */
export function clientKey(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
