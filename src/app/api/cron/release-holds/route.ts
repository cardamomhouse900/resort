import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email";
import { releaseExpiredHolds } from "@/services/availability";
import { sendPendingConfirmations } from "@/services/notifications";

/**
 * POST /api/cron/release-holds — called every 5 minutes by the Cloudflare Cron
 * Trigger (see worker.ts). It:
 *  1. releases expired payment holds (also done lazily on every new booking);
 *  2. retries booking-confirmation emails that could not be sent at the time.
 * Protected by a shared secret so it cannot be triggered from outside.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const released = await releaseExpiredHolds(db);
  const emailsRetried = await sendPendingConfirmations(db, getMailer());
  return NextResponse.json({ released, emailsRetried }, { headers: { "Cache-Control": "no-store" } });
}
