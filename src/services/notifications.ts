import "server-only";
import { siteConfig } from "@/config/site";
import type { Db } from "@/lib/db";
import { adminRecipients, type Mailer } from "@/lib/email";
import type { ResortInfo } from "@/emails/layout";
import {
  bookingCancelledGuest,
  bookingConfirmedAdmin,
  bookingConfirmedGuest,
  inquiryAdmin,
  lateRefundGuest,
  refundIssuedGuest,
  type BookingEmailData,
  type RenderedEmail,
} from "@/emails/templates";
import type { PaymentNotifier } from "./payment";
import { fromDbDate } from "@/utils/dates";
import { toPaise } from "@/utils/money";

/**
 * Sends transactional emails. Rules:
 * - Email failures are logged and never undo or block a booking/payment.
 * - Each email has a stable idempotency key, so repeated triggers send once.
 * - Booking confirmations are tracked (confirmationEmailSentAt) and retried by
 *   the cron job if the email provider was unavailable at confirmation time.
 */

async function resortInfo(db: Db): Promise<ResortInfo> {
  const s = await db.siteSetting.findUniqueOrThrow({ where: { id: 1 } });
  return {
    name: s.resortName,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    url: siteConfig.url.replace(/\/$/, ""),
    checkInTime: s.checkInTime,
    checkOutTime: s.checkOutTime,
    cancellationPolicy: s.cancellationPolicy,
  };
}

async function bookingData(db: Db, bookingId: string): Promise<BookingEmailData | null> {
  const b = await db.booking.findUnique({
    where: { id: bookingId },
    include: { roomType: { select: { name: true } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!b) return null;
  const paid = b.payments.find((p) => ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(p.status));
  return {
    id: b.id,
    code: b.code,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    roomType: b.roomType.name,
    checkIn: fromDbDate(b.checkIn),
    checkOut: fromDbDate(b.checkOut),
    nights: b.nights,
    adults: b.adults,
    children: b.children,
    specialRequests: b.specialRequests,
    totalPaise: toPaise(b.totalAmount),
    advancePercent: b.advancePercent,
    advancePaise: toPaise(b.advanceAmount),
    balancePaise: toPaise(b.balanceAmount),
    paidPaise: paid?.amountPaise ?? 0,
    paymentMethod: paid?.method ?? null,
    paymentId: paid?.razorpayPaymentId ?? null,
  };
}

async function deliver(
  mailer: Mailer,
  to: string | string[],
  email: RenderedEmail,
  idempotencyKey: string,
  replyTo: string | undefined,
  kind: string,
): Promise<boolean> {
  try {
    await mailer.send({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo,
      idempotencyKey,
      tags: { kind },
    });
    return true;
  } catch (error) {
    console.error(`[email] ${kind} failed`, idempotencyKey, error);
    return false;
  }
}

/** Guest confirmation + admin notification for a newly confirmed booking. Safe to call repeatedly. */
export async function sendBookingConfirmation(db: Db, mailer: Mailer, bookingId: string): Promise<boolean> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { status: true, confirmationEmailSentAt: true },
  });
  if (!booking || booking.status !== "CONFIRMED" || booking.confirmationEmailSentAt) return false;

  const [data, resort] = await Promise.all([bookingData(db, bookingId), resortInfo(db)]);
  if (!data) return false;

  const guestOk = await deliver(
    mailer,
    data.guestEmail,
    bookingConfirmedGuest(data, resort),
    `booking-confirmed-guest-${bookingId}`,
    resort.email,
    "booking_confirmed",
  );
  await deliver(
    mailer,
    adminRecipients(resort.email),
    bookingConfirmedAdmin(data, resort, `${resort.url}/admin/bookings/${bookingId}`),
    `booking-confirmed-admin-${bookingId}`,
    data.guestEmail,
    "admin_new_booking",
  );
  if (guestOk) {
    // Only marks if still unset — a concurrent sender cannot cause a second mark/send.
    await db.booking.updateMany({
      where: { id: bookingId, confirmationEmailSentAt: null },
      data: { confirmationEmailSentAt: new Date() },
    });
  }
  return guestOk;
}

/** Retries confirmations that could not be emailed (called by the cron job). */
export async function sendPendingConfirmations(
  db: Db,
  mailer: Mailer,
  now: Date = new Date(),
): Promise<number> {
  const pending = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      confirmationEmailSentAt: null,
      confirmedAt: { gte: new Date(now.getTime() - 3 * 86_400_000) }, // give up after 3 days
    },
    select: { id: true },
    take: 20,
  });
  let sent = 0;
  for (const b of pending) if (await sendBookingConfirmation(db, mailer, b.id)) sent++;
  return sent;
}

/** Connects the payment service's notifier hook to these emails. */
export function paymentNotifier(db: Db, mailer: Mailer): PaymentNotifier {
  return {
    bookingConfirmed: (bookingId) => sendBookingConfirmation(db, mailer, bookingId),
    autoRefunded: (bookingId, amountPaise) => sendLateRefundNotice(db, mailer, bookingId, amountPaise),
  };
}

export async function sendLateRefundNotice(db: Db, mailer: Mailer, bookingId: string, refundPaise: number) {
  const [data, resort] = await Promise.all([bookingData(db, bookingId), resortInfo(db)]);
  if (!data) return false;
  return deliver(
    mailer,
    data.guestEmail,
    lateRefundGuest(data, resort, refundPaise),
    `late-refund-${bookingId}`,
    resort.email,
    "late_refund",
  );
}

export async function sendCancellationNotice(db: Db, mailer: Mailer, bookingId: string, refundPaise: number) {
  const [data, resort] = await Promise.all([bookingData(db, bookingId), resortInfo(db)]);
  if (!data) return false;
  return deliver(
    mailer,
    data.guestEmail,
    bookingCancelledGuest(data, resort, refundPaise),
    `booking-cancelled-${bookingId}`,
    resort.email,
    "booking_cancelled",
  );
}

export async function sendRefundNotice(
  db: Db,
  mailer: Mailer,
  bookingId: string,
  refundPaise: number,
  refundId: string,
) {
  const [data, resort] = await Promise.all([bookingData(db, bookingId), resortInfo(db)]);
  if (!data) return false;
  return deliver(
    mailer,
    data.guestEmail,
    refundIssuedGuest(data, resort, refundPaise),
    `refund-${refundId}`,
    resort.email,
    "refund_issued",
  );
}

export async function sendInquiryNotice(
  db: Db,
  mailer: Mailer,
  inquiry: { id: string; name: string; email: string; phone: string | null; message: string },
) {
  const resort = await resortInfo(db);
  return deliver(
    mailer,
    adminRecipients(resort.email),
    inquiryAdmin(inquiry, resort, `${resort.url}/admin/inquiries`),
    `inquiry-${inquiry.id}`,
    inquiry.email,
    "inquiry",
  );
}
