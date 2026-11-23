import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookingStatusBadge,
  Card,
  PageHeader,
  Pill,
  formatDate,
  formatDateTime,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getBookingDetail } from "@/services/admin/bookings";
import { formatPaise, toPaise } from "@/utils/money";
import { CancelBookingForm, RefundForm } from "./CancelBookingForm";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const b = await getBookingDetail(await getDb(), id);
  if (!b) notFound();

  const paidPaise = b.payments
    .filter((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED")
    .reduce((s, p) => s + p.amountPaise - p.refundedPaise, 0);
  const nightly = (b.priceBreakdown as { date: string; price: string }[]) ?? [];
  const canCancel = b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT";

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/bookings" className="text-forest hover:underline">
          ← All bookings
        </Link>
      </p>
      <PageHeader
        title={`${b.guestName}`}
        description={`Booking ${b.code} · created ${formatDateTime(b.createdAt)}`}
        actions={<BookingStatusBadge status={b.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Stay">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Room type" value={b.roomType.name} />
              <Item label="Assigned room" value={b.reservations.map((r) => r.room.name).join(", ") || "—"} />
              <Item label="Check-in" value={formatDate(b.checkIn)} />
              <Item label="Check-out" value={formatDate(b.checkOut)} />
              <Item label="Nights" value={String(b.nights)} />
              <Item
                label="Guests"
                value={`${b.adults} adult${b.adults === 1 ? "" : "s"}, ${b.children} child${b.children === 1 ? "" : "ren"}`}
              />
            </dl>
            {b.specialRequests && (
              <div className="bg-beige/50 mt-4 rounded-lg p-3 text-sm">
                <p className="text-forest font-semibold">Special requests</p>
                <p className="mt-1 whitespace-pre-line">{b.specialRequests}</p>
              </div>
            )}
          </Card>

          <Card title="Guest">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Name" value={b.guestName} />
              <Item
                label="Phone"
                value={
                  <a href={`tel:${b.guestPhone.replace(/\s/g, "")}`} className="text-forest underline">
                    {b.guestPhone}
                  </a>
                }
              />
              <Item
                label="Email"
                value={
                  <a href={`mailto:${b.guestEmail}`} className="text-forest underline">
                    {b.guestEmail}
                  </a>
                }
              />
            </dl>
          </Card>

          <Card title="Payments">
            {b.payments.length === 0 ? (
              <p className="text-ink-muted text-sm">
                No payment attempts yet. Online payments are connected in Phase 5.
              </p>
            ) : (
              <ul className="divide-line divide-y text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {formatPaise(p.amountPaise)} ·{" "}
                      <Pill tone={p.status === "CAPTURED" ? "green" : "neutral"}>{p.status}</Pill>
                      <span className="text-ink-muted block font-mono text-xs">
                        {p.razorpayPaymentId ?? p.razorpayOrderId}
                      </span>
                    </span>
                    <span className="text-ink-muted">{formatDateTime(p.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Amounts">
            <dl className="space-y-2 text-sm">
              {nightly.map((n) => (
                <Row key={n.date} label={formatDate(n.date)} value={formatPaise(toPaise(n.price))} muted />
              ))}
              {Number(b.taxPercent) > 0 && (
                <Row
                  label={`Tax (${b.taxPercent.toFixed(2)}%)`}
                  value={formatPaise(toPaise(b.taxAmount))}
                  muted
                />
              )}
              <Row label="Total" value={formatPaise(toPaise(b.totalAmount))} strong />
              <Row label={`Advance (${b.advancePercent}%)`} value={formatPaise(toPaise(b.advanceAmount))} />
              <Row label="Paid online" value={formatPaise(paidPaise)} />
              <Row label="Balance due at resort" value={formatPaise(toPaise(b.balanceAmount))} strong />
            </dl>
          </Card>

          {b.status === "CANCELLED" && (
            <Card title="Cancellation">
              <p className="text-sm">{b.cancellationReason}</p>
              {b.cancelledAt && (
                <p className="text-ink-muted mt-1 text-xs">{formatDateTime(b.cancelledAt)}</p>
              )}
            </Card>
          )}
          {canCancel && (
            <Card title="Cancel booking">
              <CancelBookingForm bookingId={b.id} refundablePaise={paidPaise} />
            </Card>
          )}
          {!canCancel && paidPaise > 0 && (
            <Card title="Refund">
              <RefundForm bookingId={b.id} refundablePaise={paidPaise} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "text-forest font-semibold" : ""} ${muted ? "text-ink-muted" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
