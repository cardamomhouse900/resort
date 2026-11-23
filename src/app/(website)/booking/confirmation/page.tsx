import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { AwaitConfirmation } from "@/components/booking/AwaitConfirmation";
import { PayButton } from "@/components/booking/PayButton";
import { getDb } from "@/lib/db";
import { getSiteSettings } from "@/services/content";
import { getBookingForGuest } from "@/services/payment";
import { formatStayDate, fromDbDate } from "@/utils/dates";
import { formatPaise, toPaise } from "@/utils/money";

// Personal booking details: never indexed, never cached.
export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default async function BookingConfirmationPage({ searchParams }: PageProps<"/booking/confirmation">) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const [booking, settings] = await Promise.all([
    getBookingForGuest(await getDb(), code, token),
    getSiteSettings(),
  ]);

  if (!booking) {
    return (
      <Shell title="Booking not found">
        <p className="text-ink-muted text-lg">
          This link is incomplete or has expired. Please use the link from your confirmation, or contact us
          with your booking reference.
        </p>
      </Shell>
    );
  }

  const now = new Date();
  const captured = booking.payments.find((p) =>
    ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(p.status),
  );
  const refundedPaise = booking.payments.reduce((s, p) => s + p.refundedPaise, 0);
  const holdActive =
    booking.status === "PENDING_PAYMENT" && booking.holdExpiresAt && booking.holdExpiresAt > now;
  const openOrder = booking.payments.find((p) => p.status === "CREATED" || p.status === "FAILED");
  const failed = booking.payments[0]?.status === "FAILED" ? booking.payments[0] : null;

  const summary = (
    <dl className="bg-beige mt-10 space-y-3 rounded-2xl p-6 text-[0.9375rem] sm:p-8">
      <Row label="Booking reference" value={booking.code} strong />
      <Row label="Room" value={booking.roomType.name} />
      <Row
        label="Check-in"
        value={`${formatStayDate(fromDbDate(booking.checkIn))} · from ${settings.checkInTime}`}
      />
      <Row
        label="Check-out"
        value={`${formatStayDate(fromDbDate(booking.checkOut))} · by ${settings.checkOutTime}`}
      />
      <Row
        label="Guests"
        value={`${booking.adults} adult${booking.adults === 1 ? "" : "s"}${booking.children ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}` : ""}`}
      />
      <Row label="Total" value={formatPaise(toPaise(booking.totalAmount))} />
      <Row
        label={`Advance (${booking.advancePercent}%)`}
        value={formatPaise(toPaise(booking.advanceAmount))}
      />
      {booking.status === "CONFIRMED" && (
        <Row
          label="Balance payable at the resort"
          value={formatPaise(toPaise(booking.balanceAmount))}
          strong
        />
      )}
      {refundedPaise > 0 && <Row label="Refunded" value={formatPaise(refundedPaise)} />}
    </dl>
  );

  if (booking.status === "CONFIRMED") {
    return (
      <Shell
        title="Your stay is confirmed"
        icon={<CheckCircle2 className="text-forest size-10" aria-hidden="true" />}
      >
        <p className="text-ink-muted text-lg">
          Thank you, {booking.guestName.split(" ")[0]}. We have received your advance payment and your room is
          reserved. Please keep your booking reference handy for check-in.
        </p>
        {summary}
        <p className="text-ink-muted mt-6 text-sm">{settings.cancellationPolicy}</p>
      </Shell>
    );
  }

  if (booking.status === "PENDING_PAYMENT" && captured) {
    return (
      <Shell
        title="Confirming your payment"
        icon={<Clock className="text-olive size-10" aria-hidden="true" />}
      >
        <p className="text-ink-muted text-lg">
          Your payment was received. We are confirming your booking — this usually takes a few seconds.
        </p>
        <AwaitConfirmation />
        {summary}
      </Shell>
    );
  }

  if (holdActive && openOrder) {
    return (
      <Shell title="Complete your payment" icon={<Clock className="text-olive size-10" aria-hidden="true" />}>
        <p className="text-ink-muted text-lg">
          Your room is held until{" "}
          {booking.holdExpiresAt!.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST. Pay the advance to confirm.
        </p>
        {failed?.errorDescription && (
          <p className="text-earth mt-3">The last attempt failed: {failed.errorDescription}</p>
        )}
        <div className="mt-8">
          <PayButton
            order={{
              orderId: openOrder.razorpayOrderId,
              amountPaise: openOrder.amountPaise,
              currency: "INR",
              keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            }}
            bookingCode={booking.code}
            accessToken={token}
            resortName={settings.name}
            prefill={{
              name: booking.guestName,
              email: booking.guestEmail,
              contact: booking.guestPhone.replace(/\s+/g, ""),
            }}
          />
        </div>
        {summary}
      </Shell>
    );
  }

  return (
    <Shell
      title={booking.status === "CANCELLED" ? "Booking cancelled" : "This reservation has expired"}
      icon={<XCircle className="text-earth size-10" aria-hidden="true" />}
    >
      <p className="text-ink-muted text-lg">
        {booking.cancellationReason ??
          "The payment was not completed in time, so the room was released. No money has been taken. You are welcome to book again."}
      </p>
      {refundedPaise > 0 && (
        <p className="mt-3">
          A refund of {formatPaise(refundedPaise)} has been issued to your original payment method. Banks
          usually take 5–7 working days.
        </p>
      )}
      <Link
        href="/booking"
        className="bg-forest text-cream mt-8 inline-flex min-h-12 items-center rounded-full px-7 font-semibold"
      >
        Search availability
      </Link>
      {summary}
    </Shell>
  );
}

function Shell({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="bg-forest pt-28 pb-12 md:pt-36" aria-hidden="true" />
      <section className="container-page max-w-3xl py-14 md:py-20">
        {icon}
        <h1 className="text-h1 mt-4">{title}</h1>
        <div className="mt-5">{children}</div>
      </section>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-forest font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-ink-muted"}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
