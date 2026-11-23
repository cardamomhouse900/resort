import { z } from "zod";
import { enforceRateLimit, handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { razorpayGateway } from "@/lib/razorpay";
import { createPaymentOrder, getBookingForGuest } from "@/services/payment";

const schema = z.object({ code: z.string().max(20), token: z.string().min(20).max(100) });

/**
 * POST /api/payments/order — (re)opens payment for a booking that is still
 * held, e.g. after the guest closed the payment window or reloaded the page.
 * Requires the secret token from the guest's booking link.
 */
export const POST = handle(async (req) => {
  await enforceRateLimit(req, "RL_BOOKING");
  const body = await readJson(req, schema);
  const db = await getDb();
  const booking = await getBookingForGuest(db, body.code, body.token);
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  const order = await createPaymentOrder(db, razorpayGateway(), booking.id);
  return json({ payment: { ...order, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID } });
});
