import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, formatDate } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getCalendar, type CalendarEntry } from "@/services/admin/calendar";
import { addDays, dayOfWeek, diffDays, isISODate, todayAtResort, type ISODate } from "@/utils/dates";
import { BlockForm, UnblockButton } from "./forms";

export const metadata: Metadata = { title: "Availability" };

const DAYS = 21;
const STYLE: Record<CalendarEntry["status"], string> = {
  CONFIRMED: "bg-forest text-cream",
  HELD: "bg-amber-200 text-amber-950",
  BLOCKED:
    "bg-earth/80 text-white bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.15)_6px_12px)]",
};
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

export default async function AvailabilityPage({ searchParams }: PageProps<"/admin/availability">) {
  await requireAdmin();
  const today = todayAtResort();
  const startParam = (await searchParams).start;
  const start: ISODate = typeof startParam === "string" && isISODate(startParam) ? startParam : today;
  const end = addDays(start, DAYS);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  const rooms = await getCalendar(await getDb(), start, DAYS);
  const blocks = rooms.flatMap((r) =>
    r.entries.filter((e) => e.kind === "BLOCK").map((e) => ({ ...e, room: r.name })),
  );

  return (
    <>
      <PageHeader
        title="Availability"
        description="Every physical room for the next three weeks. Bookings and holds come from the website; block dates for maintenance or private use."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/availability?start=${addDays(start, -14)}`}
            className="text-forest font-semibold"
          >
            ← 2 weeks
          </Link>
          <Link href="/admin/availability" className="text-forest underline">
            Today
          </Link>
          <Link
            href={`/admin/availability?start=${addDays(start, 14)}`}
            className="text-forest font-semibold"
          >
            2 weeks →
          </Link>
          <span className="text-ink-muted">
            {formatDate(start)} – {formatDate(addDays(end, -1))}
          </span>
        </div>
        <ul className="text-ink-muted flex flex-wrap gap-4 text-xs">
          <li className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${STYLE.CONFIRMED}`} /> Confirmed
          </li>
          <li className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${STYLE.HELD}`} /> Awaiting payment
          </li>
          <li className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded-sm ${STYLE.BLOCKED}`} /> Blocked
          </li>
        </ul>
      </div>

      <div className="border-line overflow-x-auto rounded-2xl border bg-white">
        <div
          className="min-w-max"
          style={{ display: "grid", gridTemplateColumns: `11rem repeat(${DAYS}, 2.75rem)` }}
        >
          <div className="bg-beige/50 sticky left-0 z-10 px-3 py-2 text-xs font-semibold">Room</div>
          {days.map((d) => (
            <div
              key={d}
              className={`bg-beige/50 border-line border-l py-1 text-center text-xs ${d === today ? "text-forest font-bold" : "text-ink-muted"} ${
                dayOfWeek(d) === 0 || dayOfWeek(d) === 6 ? "bg-beige" : ""
              }`}
            >
              {WEEKDAY[dayOfWeek(d)]}
              <span className="block">{Number(d.slice(8))}</span>
            </div>
          ))}

          {rooms.map((room) => (
            <div key={room.id} className="contents">
              <div className="border-line sticky left-0 z-10 border-t bg-white px-3 py-2 text-sm">
                <p className={`font-medium ${room.isActive ? "" : "text-ink-muted line-through"}`}>
                  {room.name}
                </p>
                <p className="text-ink-muted truncate text-xs">{room.roomType}</p>
              </div>
              <div
                className="border-line relative border-t"
                style={{
                  gridColumn: `span ${DAYS}`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${DAYS}, 2.75rem)`,
                }}
              >
                {days.map((d) => (
                  <div
                    key={d}
                    className={`border-line border-l ${d === today ? "bg-forest/5" : ""}`}
                    aria-hidden="true"
                  />
                ))}
                {room.entries.map((e) => {
                  const from = Math.max(0, diffDays(start, e.checkIn));
                  const to = Math.min(DAYS, diffDays(start, e.checkOut));
                  if (to <= from) return null;
                  const bar = (
                    <span
                      className={`absolute top-1.5 bottom-1.5 flex items-center overflow-hidden rounded-md px-2 text-xs font-medium whitespace-nowrap ${STYLE[e.status]}`}
                      style={{
                        left: `calc(${from} * 2.75rem + 2px)`,
                        width: `calc(${to - from} * 2.75rem - 4px)`,
                      }}
                      title={`${e.label} · ${formatDate(e.checkIn)} → ${formatDate(e.checkOut)}`}
                    >
                      {e.label}
                    </span>
                  );
                  return e.bookingId ? (
                    <Link
                      key={e.id}
                      href={`/admin/bookings/${e.bookingId}`}
                      aria-label={`Booking: ${e.label}`}
                    >
                      {bar}
                    </Link>
                  ) : (
                    <span key={e.id}>{bar}</span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Block dates">
          <BlockForm
            rooms={rooms
              .filter((r) => r.isActive)
              .map((r) => ({ id: r.id, label: `${r.name} (${r.roomType})` }))}
            today={today}
          />
        </Card>
        <Card title="Blocks in this period">
          {blocks.length === 0 ? (
            <p className="text-ink-muted text-sm">No blocked dates in this period.</p>
          ) : (
            <ul className="divide-line divide-y text-sm">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{b.room}</span> · {formatDate(b.checkIn)} →{" "}
                    {formatDate(b.checkOut)}
                    <span className="text-ink-muted block text-xs">{b.label}</span>
                  </span>
                  <UnblockButton reservationId={b.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
