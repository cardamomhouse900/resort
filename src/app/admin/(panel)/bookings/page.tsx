import type { Metadata } from "next";
import Link from "next/link";
import { BookingStatusBadge, EmptyState, PageHeader, Table, formatDate } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { bookingFiltersSchema } from "@/lib/validation-admin";
import { listBookings } from "@/services/admin/bookings";
import { formatPaise, toPaise } from "@/utils/money";

export const metadata: Metadata = { title: "Bookings" };

const field =
  "border-line focus:border-forest block w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none";

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireAdmin();
  const raw = await searchParams;
  const filters = bookingFiltersSchema.parse({
    q: raw.q,
    status: raw.status || undefined,
    from: raw.from || undefined,
    to: raw.to || undefined,
    page: raw.page ?? 1,
  });
  const { items, total, pages } = await listBookings(await getDb(), filters);

  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page })) if (v) p.set(k, String(v));
    return `/admin/bookings?${p}`;
  };

  return (
    <>
      <PageHeader title="Bookings" description="Search by reference, guest name, email or phone." />

      <form className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
        <label>
          <span className="sr-only">Search</span>
          <input name="q" defaultValue={filters.q} placeholder="BK-…, name, email, phone" className={field} />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={filters.status ?? ""} className={field}>
            <option value="">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING_PAYMENT">Awaiting payment</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
        <label>
          <span className="text-ink-muted text-xs">Check-in from</span>
          <input type="date" name="from" defaultValue={filters.from} className={field} />
        </label>
        <label>
          <span className="text-ink-muted text-xs">Check-in to</span>
          <input type="date" name="to" defaultValue={filters.to} className={field} />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="bg-forest text-cream min-h-10 rounded-full px-5 text-sm font-semibold"
          >
            Filter
          </button>
          <Link href="/admin/bookings" className="text-ink-muted px-2 py-2 text-sm underline">
            Reset
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState>No bookings match these filters.</EmptyState>
      ) : (
        <Table head={["Reference", "Guest", "Room", "Stay", "Total", "Balance", "Status"]}>
          {items.map((b) => (
            <tr key={b.id} className="hover:bg-beige/30">
              <td className="px-4 py-3 font-mono text-xs">
                <Link href={`/admin/bookings/${b.id}`} className="text-forest font-semibold hover:underline">
                  {b.code}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{b.guestName}</p>
                <p className="text-ink-muted text-xs">{b.guestEmail}</p>
              </td>
              <td className="px-4 py-3">{b.roomType.name}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                <span className="text-ink-muted block text-xs">
                  {b.nights} night{b.nights === 1 ? "" : "s"}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums">{formatPaise(toPaise(b.totalAmount))}</td>
              <td className="px-4 py-3 tabular-nums">{formatPaise(toPaise(b.balanceAmount))}</td>
              <td className="px-4 py-3">
                <BookingStatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}

      <nav aria-label="Pagination" className="text-ink-muted mt-4 flex items-center justify-between text-sm">
        <span>
          {total} booking{total === 1 ? "" : "s"} · page {filters.page} of {pages}
        </span>
        <span className="flex gap-3">
          {filters.page > 1 && (
            <Link href={pageHref(filters.page - 1)} className="text-forest font-semibold">
              ← Previous
            </Link>
          )}
          {filters.page < pages && (
            <Link href={pageHref(filters.page + 1)} className="text-forest font-semibold">
              Next →
            </Link>
          )}
        </span>
      </nav>
    </>
  );
}
