import { connection } from "next/server";
import { json } from "@/lib/api";
import { getDb } from "@/lib/db";

/**
 * GET /api/health — for uptime monitors (e.g. UptimeRobot, Cloudflare health checks).
 * 200 when the site can reach its database, 503 otherwise. Reveals no details.
 */
export async function GET() {
  await connection(); // never prerendered or cached
  try {
    const db = await getDb();
    await db.$queryRaw`SELECT 1`;
    return json({ ok: true });
  } catch (e) {
    console.error("health check: database unreachable", e);
    return json({ ok: false }, 503);
  }
}
