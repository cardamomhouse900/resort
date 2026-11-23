import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { razorpayGateway, verifyCheckoutSignature } from "@/lib/razorpay";
import { paymentNotifier } from "@/services/notifications";
import { confirmFromCheckout } from "@/services/payment";

const schema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * POST /api/payments/verify — called by the browser after Razorpay Checkout succeeds.
 * 1. Verify the checkout signature with our key secret (proves Razorpay issued it).
 * 2. Re-fetch the payment from Razorpay and check order, amount and status.
 * 3. Confirm the booking (idempotent — the webhook may already have done it).
 */
export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const { RAZORPAY_KEY_SECRET } = getEnv("razorpay");
  const valid = await verifyCheckoutSignature(
    {
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    },
    RAZORPAY_KEY_SECRET,
  );
  if (!valid) throw new AppError("VALIDATION_ERROR", "Payment verification failed.");

  const db = await getDb();
  const outcome = await confirmFromCheckout(
    db,
    razorpayGateway(),
    { orderId: body.razorpay_order_id, paymentId: body.razorpay_payment_id },
    new Date(),
    paymentNotifier(db, getMailer()),
  );
  return json({ outcome });
});
