import "server-only";
import type { Db } from "@/lib/db";
import { AppError, isOverlapViolation } from "@/lib/errors";
import type { PaymentGateway, RazorpayPayment } from "@/lib/razorpay";
import { RazorpayError } from "@/lib/razorpay";
import { fromDbDate } from "@/utils/dates";
import { toPaise } from "@/utils/money";
import { findInsertableRooms } from "./availability";

/**
 * Payment lifecycle. Rules:
 * - A booking is confirmed ONLY from a payment verified with Razorpay on the
 *   server (signature + fetched payment, or a signed webhook). Never from the
 *   browser's word alone.
 * - Confirmation is idempotent and serialised with a row lock on the payment,
 *   so the checkout callback and the webhook can arrive in any order, any
 *   number of times, even simultaneously.
 */

/* ------------------------------------------------------------- Orders */

export type PaymentOrder = { orderId: string; amountPaise: number; currency: "INR" };

/**
 * Creates (or reuses) the Razorpay order for a pending booking's advance.
 * The amount always comes from the booking row, never from the request.
 */
export async function createPaymentOrder(
  db: Db,
  gateway: PaymentGateway,
  bookingId: string,
  now: Date = new Date(),
): Promise<PaymentOrder> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      code: true,
      status: true,
      advanceAmount: true,
      holdExpiresAt: true,
      payments: { where: { status: "CREATED" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
  if (booking.status !== "PENDING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt <= now) {
    throw new AppError("CONFLICT", "This booking is no longer awaiting payment. Please start a new booking.");
  }

  const amountPaise = toPaise(booking.advanceAmount);
  const existing = booking.payments[0];
  if (existing && existing.amountPaise === amountPaise) {
    return { orderId: existing.razorpayOrderId, amountPaise, currency: "INR" };
  }

  const order = await gateway.createOrder({
    amountPaise,
    receipt: booking.code,
    notes: { bookingId: booking.id, bookingCode: booking.code },
  });
  if (order.amount !== amountPaise) throw new Error("Razorpay order amount mismatch");

  await db.payment.create({
    data: {
      bookingId: booking.id,
      razorpayOrderId: order.id,
      amountPaise,
      currency: "INR",
      status: "CREATED",
    },
  });
  return { orderId: order.id, amountPaise, currency: "INR" };
}

/* ------------------------------------------------------- Confirmation */

export type FinalizeOutcome =
  | "confirmed" // booking confirmed now
  | "reallocated" // hold had lapsed; confirmed in another free room of the same type
  | "already_confirmed" // idempotent repeat
  | "refund_required" // paid, but the booking can no longer be honoured
  | "already_refunded";

type CapturedPayment = { orderId: string; paymentId: string; amountPaise: number; method?: string | null };

/**
 * Records a captured payment and confirms its booking, exactly once.
 * Must only be called with data that Razorpay has vouched for.
 */
export async function finalizeCapturedPayment(
  db: Db,
  input: CapturedPayment,
  now: Date = new Date(),
): Promise<FinalizeOutcome> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // Row lock: concurrent callers for the same order queue up here.
        const [payment] = await tx.$queryRaw<
          { id: string; bookingId: string; amountPaise: number; status: string; refundedPaise: number }[]
        >`SELECT "id", "bookingId", "amountPaise", "status", "refundedPaise"
            FROM "payments" WHERE "razorpayOrderId" = ${input.orderId} FOR UPDATE`;
        if (!payment) throw new AppError("NOT_FOUND", "Unknown payment order.");
        if (payment.amountPaise !== input.amountPaise) {
          throw new AppError("CONFLICT", "Paid amount does not match the booking advance.");
        }
        if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED")
          return "already_refunded";

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "CAPTURED",
            razorpayPaymentId: input.paymentId,
            method: input.method ?? undefined,
            capturedAt: payment.status === "CAPTURED" ? undefined : now,
            errorCode: null,
            errorDescription: null,
          },
        });

        const [booking] = await tx.$queryRaw<
          { id: string; status: string; roomTypeId: string; checkIn: Date; checkOut: Date }[]
        >`SELECT "id", "status", "roomTypeId", "checkIn", "checkOut" FROM "bookings" WHERE "id" = ${payment.bookingId}::uuid FOR UPDATE`;

        if (booking.status === "CONFIRMED") return "already_confirmed";
        if (booking.status === "CANCELLED") return "refund_required";

        // PENDING_PAYMENT, or EXPIRED after the hold ran out.
        const held = await tx.reservation.updateMany({
          where: { bookingId: booking.id, status: "HELD" },
          data: { status: "CONFIRMED", holdExpiresAt: null },
        });
        if (held.count > 0) {
          // A HELD row (even past its expiry) still blocked the room, so nobody else can have it.
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CONFIRMED", confirmedAt: now, holdExpiresAt: null },
          });
          return "confirmed";
        }

        // The hold was released before the payment arrived: try any free room of the same type.
        const [roomId] = await findInsertableRooms(
          tx,
          booking.roomTypeId,
          fromDbDate(booking.checkIn),
          fromDbDate(booking.checkOut),
        );
        if (roomId) {
          await tx.reservation.create({
            data: {
              roomId,
              bookingId: booking.id,
              kind: "BOOKING",
              status: "CONFIRMED",
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
            },
          });
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: "CONFIRMED", confirmedAt: now, holdExpiresAt: null },
          });
          return "reallocated";
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
            holdExpiresAt: null,
            cancellationReason:
              "Payment arrived after the reservation hold expired and the room had been taken. The advance is refunded automatically.",
          },
        });
        return "refund_required";
      });
    } catch (error) {
      // Lost a race for the last free room against a simultaneous booking: re-evaluate once.
      if (isOverlapViolation(error) && attempt < 3) continue;
      throw error;
    }
  }
}

/**
 * Handles the browser's checkout callback after its signature has been checked:
 * re-fetches the payment from Razorpay (never trusting the browser for the
 * amount or status), captures it if needed, then finalises.
 */
export async function confirmFromCheckout(
  db: Db,
  gateway: PaymentGateway,
  input: { orderId: string; paymentId: string },
  now: Date = new Date(),
  notifier: PaymentNotifier = silentNotifier,
): Promise<FinalizeOutcome | "not_captured"> {
  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: input.orderId },
    select: { amountPaise: true },
  });
  if (!payment) throw new AppError("NOT_FOUND", "Unknown payment order.");

  let rp = await gateway.fetchPayment(input.paymentId);
  if (rp.order_id !== input.orderId) throw new AppError("CONFLICT", "Payment does not belong to this order.");
  if (rp.amount !== payment.amountPaise || rp.currency !== "INR") {
    throw new AppError("CONFLICT", "Paid amount does not match the booking advance.");
  }
  if (rp.status === "authorized") rp = await gateway.capturePayment(rp.id, rp.amount);
  if (rp.status !== "captured") return "not_captured";

  const outcome = await finalizeCapturedPayment(
    db,
    { orderId: rp.order_id, paymentId: rp.id, amountPaise: rp.amount, method: rp.method },
    now,
  );
  await afterFinalize(db, gateway, notifier, rp.order_id, outcome);
  return outcome;
}

/* ------------------------------------------------------- Notifications */

/** Side effects after a payment is finalised (emails); implemented in services/notifications.ts. */
export type PaymentNotifier = {
  bookingConfirmed(bookingId: string): Promise<unknown>;
  autoRefunded(bookingId: string, amountPaise: number): Promise<unknown>;
};
export const silentNotifier: PaymentNotifier = {
  bookingConfirmed: async () => {},
  autoRefunded: async () => {},
};

/**
 * Runs exactly where the outcome was decided, so only the caller that actually
 * confirmed (or had to refund) triggers emails. Notification errors are
 * swallowed: an email problem must never fail a confirmed payment.
 */
async function afterFinalize(
  db: Db,
  gateway: PaymentGateway,
  notifier: PaymentNotifier,
  orderId: string,
  outcome: FinalizeOutcome,
) {
  if (outcome === "refund_required") {
    const refunded = await refundInFull(db, gateway, orderId, "Booking could not be honoured");
    if (refunded > 0) {
      const p = await db.payment.findUnique({
        where: { razorpayOrderId: orderId },
        select: { bookingId: true },
      });
      if (p)
        await notifier
          .autoRefunded(p.bookingId, refunded)
          .catch((e) => console.error("[notify] autoRefunded", e));
    }
  } else if (outcome === "confirmed" || outcome === "reallocated") {
    const p = await db.payment.findUnique({
      where: { razorpayOrderId: orderId },
      select: { bookingId: true },
    });
    if (p)
      await notifier
        .bookingConfirmed(p.bookingId)
        .catch((e) => console.error("[notify] bookingConfirmed", e));
  }
}

/* ------------------------------------------------------------- Refunds */

/** Refunds part or all of a captured payment and records it. */
export async function issueRefund(
  db: Db,
  gateway: PaymentGateway,
  paymentRowId: string,
  amountPaise: number,
  reason: string,
) {
  const payment = await db.payment.findUnique({ where: { id: paymentRowId } });
  if (!payment || !payment.razorpayPaymentId)
    throw new AppError("NOT_FOUND", "No captured payment to refund.");
  if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
    throw new AppError("CONFLICT", "This payment cannot be refunded in its current state.");
  }
  const remaining = payment.amountPaise - payment.refundedPaise;
  if (!Number.isInteger(amountPaise) || amountPaise <= 0 || amountPaise > remaining) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Refund must be between ₹1 and the remaining ₹${(remaining / 100).toFixed(2)}.`,
    );
  }

  const refund = await gateway.refund(payment.razorpayPaymentId, amountPaise, {
    reason: reason.slice(0, 250),
    bookingId: payment.bookingId,
  });
  await recordRefund(db, {
    paymentRowId: payment.id,
    refundId: refund.id,
    amountPaise: refund.amount,
    status: refund.status,
    reason,
  });
  return refund;
}

/**
 * Full refund of whatever is left on an order's payment (used for bookings we
 * cannot honour). Returns the amount refunded by THIS call (0 if nothing was left).
 */
async function refundInFull(
  db: Db,
  gateway: PaymentGateway,
  orderId: string,
  reason: string,
): Promise<number> {
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: orderId } });
  if (!payment) return 0;
  const remaining = payment.amountPaise - payment.refundedPaise;
  if (remaining <= 0) return 0;
  try {
    const refund = await issueRefund(db, gateway, payment.id, remaining, reason);
    return refund.amount;
  } catch (error) {
    // A concurrent caller (checkout callback vs webhook) may have refunded first.
    if (error instanceof RazorpayError && error.status === 400) {
      console.warn("[payment] refund rejected (probably already refunded)", orderId, error.message);
      return 0;
    }
    throw error;
  }
}

/** Upserts a refund and recomputes the payment's refunded total (idempotent for webhooks). */
async function recordRefund(
  db: Db,
  input: { paymentRowId: string; refundId: string; amountPaise: number; status: string; reason?: string },
) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "payments" WHERE "id" = ${input.paymentRowId}::uuid FOR UPDATE`;
    await tx.refund.upsert({
      where: { razorpayRefundId: input.refundId },
      create: {
        paymentId: input.paymentRowId,
        razorpayRefundId: input.refundId,
        amountPaise: input.amountPaise,
        status: input.status,
        reason: input.reason ?? null,
      },
      update: { status: input.status },
    });
    const refunds = await tx.refund.findMany({
      where: { paymentId: input.paymentRowId, status: { not: "failed" } },
    });
    const refundedPaise = refunds.reduce((s, r) => s + r.amountPaise, 0);
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: input.paymentRowId } });
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundedPaise,
        status:
          refundedPaise === 0
            ? "CAPTURED"
            : refundedPaise >= payment.amountPaise
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED",
      },
    });
  });
}

/* ------------------------------------------------------------ Webhooks */

type WebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPayment };
    refund?: {
      entity: { id: string; payment_id: string; amount: number; status: "pending" | "processed" | "failed" };
    };
  };
};

export type WebhookResult = "processed" | "duplicate" | "ignored";

/**
 * Processes a signature-verified Razorpay webhook. Each event id is processed
 * once; Razorpay retries on non-2xx, and a retry of a half-processed event is
 * completed safely because every step is idempotent.
 */
export async function processWebhook(
  db: Db,
  gateway: PaymentGateway,
  eventId: string,
  body: WebhookPayload,
  now: Date = new Date(),
  notifier: PaymentNotifier = silentNotifier,
): Promise<WebhookResult> {
  const seen = await db.webhookEvent.findUnique({ where: { id: eventId } });
  if (seen?.processedAt) return "duplicate";
  if (!seen) {
    await db.webhookEvent
      .create({ data: { id: eventId, event: body.event, payload: body as object } })
      .catch((e: { code?: string }) => {
        if (e.code !== "P2002") throw e; // a parallel delivery inserted it first — fine
      });
  }

  let result: WebhookResult = "processed";
  const p = body.payload.payment?.entity;

  switch (body.event) {
    case "payment.captured":
    case "order.paid": {
      if (!p || !(await isOurOrder(db, p.order_id))) {
        result = "ignored";
        break;
      }
      const outcome = await finalizeCapturedPayment(
        db,
        { orderId: p.order_id, paymentId: p.id, amountPaise: p.amount, method: p.method },
        now,
      );
      await afterFinalize(db, gateway, notifier, p.order_id, outcome);
      break;
    }
    case "payment.authorized": {
      // Only relevant if automatic capture is off in the Razorpay dashboard.
      if (!p || !(await isOurOrder(db, p.order_id))) {
        result = "ignored";
        break;
      }
      try {
        await gateway.capturePayment(p.id, p.amount); // payment.captured follows
      } catch (e) {
        if (!(e instanceof RazorpayError && e.status === 400)) throw e; // 400 = already captured
      }
      break;
    }
    case "payment.failed": {
      if (!p) break;
      await db.payment.updateMany({
        where: { razorpayOrderId: p.order_id, status: { in: ["CREATED", "AUTHORIZED", "FAILED"] } },
        data: {
          status: "FAILED",
          razorpayPaymentId: p.id,
          errorCode: p.error_code ?? null,
          errorDescription: p.error_description?.slice(0, 500) ?? null,
        },
      });
      break;
    }
    case "refund.created":
    case "refund.processed":
    case "refund.failed": {
      const r = body.payload.refund?.entity;
      const payment = r ? await db.payment.findUnique({ where: { razorpayPaymentId: r.payment_id } }) : null;
      if (!r || !payment) {
        result = "ignored";
        break;
      }
      await recordRefund(db, {
        paymentRowId: payment.id,
        refundId: r.id,
        amountPaise: r.amount,
        status: r.status,
      });
      break;
    }
    default:
      result = "ignored";
  }

  await db.webhookEvent.update({ where: { id: eventId }, data: { processedAt: now } });
  return result;
}

async function isOurOrder(db: Db, orderId: string | undefined) {
  return Boolean(
    orderId && (await db.payment.findUnique({ where: { razorpayOrderId: orderId }, select: { id: true } })),
  );
}

/* -------------------------------------------------- Guest booking access */

/** Booking summary for the guest's confirmation link (code + secret token). */
export async function getBookingForGuest(db: Db, code: string, token: string) {
  if (!/^BK-[0-9A-Z]{6}$/.test(code) || token.length < 20 || token.length > 100) return null;
  const booking = await db.booking.findUnique({
    where: { code },
    include: {
      roomType: { select: { name: true, slug: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) return null;
  const { sha256Hex } = await import("@/lib/crypto");
  const hash = await sha256Hex(token);
  // Hashes are fixed-length hex, so a plain comparison leaks nothing useful.
  return hash === booking.accessTokenHash ? booking : null;
}
