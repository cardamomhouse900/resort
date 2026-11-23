import { enforceRateLimit, handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { razorpayGateway } from "@/lib/razorpay";
import { bookingSchema } from "@/lib/validation";
import { cancelBooking, createBookingHold } from "@/services/booking";
import { createPaymentOrder } from "@/services/payment";

/**
 * POST /api/bookings
 * 1. Holds one unit and creates a PENDING_PAYMENT booking (amounts calculated
 *    from database prices — anything amount-like in the request is ignored).
 * 2. Creates the Razorpay order for the advance.
 * The booking is confirmed only after the payment is verified server-side.
 */
export const POST = handle(async (req) => {
  await enforceRateLimit(req, "RL_BOOKING");
  const body = await readJson(req, bookingSchema);
  const db = await getDb();

  const hold = await createBookingHold(db, {
    roomTypeSlug: body.roomType,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    adults: body.adults,
    children: body.children,
    guest: body.guest,
    specialRequests: body.specialRequests,
  });

  let order;
  try {
    order = await createPaymentOrder(db, razorpayGateway(), hold.bookingId);
  } catch (error) {
    // Don't keep a room locked for a booking that can't be paid.
    await cancelBooking(db, hold.bookingId, "Payment order could not be created").catch(() => {});
    console.error("[bookings] Razorpay order failed", error);
    throw new AppError(
      "NOT_AVAILABLE",
      "Online payment is temporarily unavailable. Please try again in a few minutes or contact us.",
    );
  }

  return json(
    {
      booking: {
        code: hold.code,
        status: "PENDING_PAYMENT",
        holdExpiresAt: hold.holdExpiresAt.toISOString(),
        roomType: hold.roomType,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        adults: body.adults,
        children: body.children,
        quote: hold.quote,
      },
      payment: { ...order, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID },
      // Secret for the guest's booking link; only its hash is stored.
      accessToken: hold.accessToken,
    },
    201,
  );
});
