import "server-only";
import type { Db } from "@/lib/db";
import { addDays, fromDbDate, toDbDate, type ISODate } from "@/utils/dates";

export type CalendarEntry = {
  id: string;
  kind: "BOOKING" | "BLOCK";
  status: "HELD" | "CONFIRMED" | "BLOCKED";
  checkIn: ISODate;
  checkOut: ISODate;
  label: string;
  bookingId: string | null;
};

export type CalendarRoom = {
  id: string;
  name: string;
  roomType: string;
  isActive: boolean;
  entries: CalendarEntry[];
};

/** Rooms with every active reservation/block overlapping [start, start + days). */
export async function getCalendar(db: Db, start: ISODate, days: number, now: Date = new Date()) {
  const end = addDays(start, days);
  const rooms = await db.room.findMany({
    orderBy: [{ roomType: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      roomType: { select: { name: true } },
      reservations: {
        where: {
          checkIn: { lt: toDbDate(end) },
          checkOut: { gt: toDbDate(start) },
          OR: [{ status: { in: ["CONFIRMED", "BLOCKED"] } }, { status: "HELD", holdExpiresAt: { gt: now } }],
        },
        orderBy: { checkIn: "asc" },
        select: {
          id: true,
          kind: true,
          status: true,
          checkIn: true,
          checkOut: true,
          note: true,
          bookingId: true,
          booking: { select: { code: true, guestName: true } },
        },
      },
    },
  });

  return rooms.map((r): CalendarRoom => ({
    id: r.id,
    name: r.name,
    roomType: r.roomType.name,
    isActive: r.isActive,
    entries: r.reservations.map((res) => ({
      id: res.id,
      kind: res.kind,
      status: res.status as CalendarEntry["status"],
      checkIn: fromDbDate(res.checkIn),
      checkOut: fromDbDate(res.checkOut),
      label: res.booking ? `${res.booking.guestName} · ${res.booking.code}` : res.note || "Blocked",
      bookingId: res.bookingId,
    })),
  }));
}
