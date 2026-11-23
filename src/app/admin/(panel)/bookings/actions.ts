"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email";
import { actionError, parseForm, type FormState } from "@/lib/form";
import { razorpayGateway, RazorpayError } from "@/lib/razorpay";
import { cancelSchema } from "@/lib/validation-admin";
import { cancelBooking } from "@/services/booking";
import { sendCancellationNotice, sendRefundNotice } from "@/services/notifications";
import { issueRefund } from "@/services/payment";
import { formatPaise } from "@/utils/money";

const rupeesToPaise = (v: string) => Math.round(Number(v) * 100);

const refundSchema = z.object({
  bookingId: z.uuid(),
  refund: z.enum(["none", "full", "custom"]).default("none"),
  refundAmount: z.string().optional(),
});
const notifyGuest = (form: FormData) => form.get("notifyGuest") === "on";

type RefundResult = { message: string; refund: { id: string; amount: number } | null };

/** Refunds against the booking's captured payment. */
async function refundBooking(
  bookingId: string,
  mode: "full" | "custom",
  customRupees: string | undefined,
  reason: string,
): Promise<RefundResult> {
  const db = await getDb();
  const payment = await db.payment.findFirst({
    where: { bookingId, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) return { message: "No online payment to refund.", refund: null };
  const remaining = payment.amountPaise - payment.refundedPaise;
  const amount = mode === "full" ? remaining : rupeesToPaise(customRupees ?? "");
  const refund = await issueRefund(db, razorpayGateway(), payment.id, amount, reason);
  return {
    message: `Refund of ${formatPaise(refund.amount)} ${refund.status === "processed" ? "processed" : "initiated"} via Razorpay.`,
    refund: { id: refund.id, amount: refund.amount },
  };
}

/** Cancels a booking, releases its room, optionally refunds the advance, and emails the guest. */
export async function cancelBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parseForm(cancelSchema, form);
  if (parsed.state) return parsed.state;
  const refund = refundSchema.safeParse(Object.fromEntries(form));
  if (!refund.success) return { ok: false, message: "Invalid refund option." };
  const db = await getDb();
  const bookingId = parsed.data.bookingId;

  let message: string;
  let changed: boolean;
  try {
    ({ changed } = await cancelBooking(db, bookingId, `${parsed.data.reason} (by ${admin.name})`));
    message = changed ? "Booking cancelled and the room released." : "This booking was already cancelled.";
  } catch (e) {
    return actionError(e);
  }

  let refundedPaise = 0;
  if (refund.data.refund !== "none") {
    try {
      const r = await refundBooking(
        bookingId,
        refund.data.refund,
        refund.data.refundAmount,
        parsed.data.reason,
      );
      refundedPaise = r.refund?.amount ?? 0;
      message += ` ${r.message}`;
    } catch (e) {
      const why = e instanceof RazorpayError ? e.message : (actionError(e).message ?? "Unknown error");
      message += ` The refund could not be issued: ${why} You can retry from the Refund section.`;
    }
  }

  if (changed && notifyGuest(form)) {
    const sent = await sendCancellationNotice(db, getMailer(), bookingId, refundedPaise);
    message += sent
      ? " The guest has been emailed."
      : " The guest email could not be sent — please contact them directly.";
  }
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  return { ok: true, message };
}

/** Standalone refund (e.g. a partial refund under the cancellation policy, or a retry). */
export async function refundBookingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = refundSchema.safeParse(Object.fromEntries(form));
  const reason = String(form.get("reason") ?? "").trim();
  if (!parsed.success || parsed.data.refund === "none")
    return { ok: false, message: "Choose a refund amount." };
  if (reason.length < 3)
    return { ok: false, errors: { reason: "Give a short reason." }, message: "Please add a reason." };
  try {
    const r = await refundBooking(
      parsed.data.bookingId,
      parsed.data.refund,
      parsed.data.refundAmount,
      `${reason} (by ${admin.name})`,
    );
    let message = r.message;
    if (r.refund && notifyGuest(form)) {
      const sent = await sendRefundNotice(
        await getDb(),
        getMailer(),
        parsed.data.bookingId,
        r.refund.amount,
        r.refund.id,
      );
      message += sent ? " The guest has been emailed." : " The guest email could not be sent.";
    }
    revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
    return { ok: true, message };
  } catch (e) {
    if (e instanceof RazorpayError)
      return { ok: false, message: `Razorpay rejected the refund: ${e.message}` };
    return actionError(e);
  }
}
