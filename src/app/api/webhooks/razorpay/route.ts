import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { razorpayGateway, verifyWebhookSignature } from "@/lib/razorpay";
import { getMailer } from "@/lib/email";
import { paymentNotifier } from "@/services/notifications";
import { processWebhook } from "@/services/payment";

const MAX_BODY = 256 * 1024;

/**
 * POST /api/webhooks/razorpay
 * Configure in Razorpay Dashboard → Webhooks with the same secret as
 * RAZORPAY_WEBHOOK_SECRET and the events: payment.captured, payment.failed,
 * payment.authorized, order.paid, refund.created, refund.processed, refund.failed.
 *
 * The signature is computed over the RAW body, so it is read as text before parsing.
 * Non-2xx responses make Razorpay retry; processing is idempotent per event id.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too large" }, { status: 413 });

  const { RAZORPAY_WEBHOOK_SECRET } = getEnv("razorpay");
  const ok = await verifyWebhookSignature(
    raw,
    req.headers.get("x-razorpay-signature"),
    RAZORPAY_WEBHOOK_SECRET,
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // Razorpay sends a unique id per event; fall back to a hash of the body for safety.
  const eventId =
    req.headers.get("x-razorpay-event-id") ??
    `body-${Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("")}`;

  try {
    const db = await getDb();
    const result = await processWebhook(
      db,
      razorpayGateway(),
      eventId.slice(0, 120),
      body,
      new Date(),
      paymentNotifier(db, getMailer()),
    );
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AppError) {
      // A business-rule rejection (e.g. amount mismatch, unknown order) will not succeed on retry:
      // acknowledge it so Razorpay stops retrying, and leave a loud log for investigation.
      console.error("[webhook] rejected", eventId, error.code, error.message);
      return NextResponse.json({ result: "rejected", reason: error.code });
    }
    console.error("[webhook] processing failed — Razorpay will retry", eventId, error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
