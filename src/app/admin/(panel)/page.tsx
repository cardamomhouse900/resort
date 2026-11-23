import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, formatDate } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getDashboardStats, type ArrivalRow } from "@/services/admin/dashboard";
import { todayAtResort } from "@/utils/dates";
import { formatPaise } from "@/utils/money";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const denied = (await searchParams).denied;
  const stats = await getDashboardStats(await getDb(), todayAtResort());

  const tiles = [
    { label: "Total bookings", value: String(stats.totalBookings), href: "/admin/bookings" },
    { label: "Confirmed", value: String(stats.confirmed), href: "/admin/bookings?status=CONFIRMED" },
    {
      label: "Awaiting payment",
      value: String(stats.pendingPayment),
      note: stats.activeHolds
        ? `${stats.activeHolds} hold${stats.activeHolds === 1 ? "" : "s"} active now`
        : undefined,
      href: "/admin/bookings?status=PENDING_PAYMENT",
    },
    {
      label: "Advance collected",
      value: formatPaise(stats.collectedPaise),
      note: "Online payments, net of refunds",
    },
    { label: "Confirmed booking value", value: formatPaise(stats.confirmedValuePaise) },
    {
      label: "Balance due at resort",
      value: formatPaise(stats.outstandingPaise),
      note: "Current and upcoming stays",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin.name.split(" ")[0]}`}
        description="Today's overview of bookings and arrivals."
      />
      {denied && (
        <p role="alert" className="bg-earth/10 text-earth mb-6 rounded-lg px-4 py-3 text-sm">
          That area is available to the owner account only.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-ink-muted text-xs font-semibold tracking-wide uppercase">{t.label}</p>
              <p className="text-forest mt-2 font-serif text-3xl font-semibold tabular-nums">{t.value}</p>
              {t.note && <p className="text-ink-muted mt-1 text-xs">{t.note}</p>}
            </>
          );
          return (
            <li key={t.label} className="border-line rounded-2xl border bg-white">
              {t.href ? (
                <Link href={t.href} className="hover:bg-beige/40 block h-full rounded-2xl p-4">
                  {body}
                </Link>
              ) : (
                <div className="p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Check-ins · next 7 days">
          <ArrivalList
            rows={stats.upcomingCheckIns}
            empty="No confirmed arrivals in the next 7 days."
            showBalance
          />
        </Card>
        <Card title="Check-outs · next 7 days">
          <ArrivalList rows={stats.upcomingCheckOuts} empty="No departures in the next 7 days." />
        </Card>
      </div>

      {stats.newInquiries > 0 && (
        <p className="mt-6 text-sm">
          <Link href="/admin/inquiries" className="text-forest font-semibold underline">
            {stats.newInquiries} new enquir{stats.newInquiries === 1 ? "y" : "ies"} waiting for a reply
          </Link>
        </p>
      )}
    </>
  );
}

function ArrivalList({
  rows,
  empty,
  showBalance,
}: {
  rows: ArrivalRow[];
  empty: string;
  showBalance?: boolean;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="divide-line divide-y">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div>
            <Link href={`/admin/bookings/${r.id}`} className="text-forest font-semibold hover:underline">
              {r.guestName}
            </Link>
            <p className="text-ink-muted">
              {r.roomType}
              {r.rooms && ` · ${r.rooms}`} · {r.adults + r.children} guest
              {r.adults + r.children === 1 ? "" : "s"} · {r.nights} night{r.nights === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatDate(r.date)}</p>
            {showBalance && <p className="text-ink-muted text-xs">Balance {formatPaise(r.balancePaise)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
