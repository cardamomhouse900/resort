import "server-only";
import type { Db } from "@/lib/db";
import { addDays, toDbDate, type ISODate } from "@/utils/dates";
import { toPaise } from "@/utils/money";

export type ArrivalRow = {
  id: string;
  code: string;
  guestName: string;
  guestPhone: string;
  roomType: string;
  rooms: string;
  date: Date;
  nights: number;
  adults: number;
  children: number;
  balancePaise: number;
};

const arrivalSelect = {
  id: true,
  code: true,
  guestName: true,
  guestPhone: true,
  checkIn: true,
  checkOut: true,
  nights: true,
  adults: true,
  children: true,
  balanceAmount: true,
  roomType: { select: { name: true } },
  reservations: { select: { room: { select: { name: true } } }, where: { status: "CONFIRMED" as const } },
} as const;

export async function getDashboardStats(db: Db, today: ISODate, now: Date = new Date()) {
  const in7 = toDbDate(addDays(today, 7));
  const todayDb = toDbDate(today);

  const [byStatus, captured, confirmedValue, outstanding, checkIns, checkOuts, newInquiries, activeHolds] =
    await Promise.all([
      db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      db.payment.aggregate({
        where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } },
        _sum: { amountPaise: true, refundedPaise: true },
      }),
      db.booking.aggregate({ where: { status: "CONFIRMED" }, _sum: { totalAmount: true } }),
      db.booking.aggregate({
        where: { status: "CONFIRMED", checkOut: { gte: todayDb } },
        _sum: { balanceAmount: true },
      }),
      db.booking.findMany({
        where: { status: "CONFIRMED", checkIn: { gte: todayDb, lt: in7 } },
        orderBy: { checkIn: "asc" },
        take: 20,
        select: arrivalSelect,
      }),
      db.booking.findMany({
        where: { status: "CONFIRMED", checkOut: { gte: todayDb, lt: in7 } },
        orderBy: { checkOut: "asc" },
        take: 20,
        select: arrivalSelect,
      }),
      db.contactInquiry.count({ where: { status: "NEW" } }),
      db.booking.count({ where: { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } } }),
    ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const toRow = (b: (typeof checkIns)[number], date: Date): ArrivalRow => ({
    id: b.id,
    code: b.code,
    guestName: b.guestName,
    guestPhone: b.guestPhone,
    roomType: b.roomType.name,
    rooms: b.reservations.map((r) => r.room.name).join(", "),
    date,
    nights: b.nights,
    adults: b.adults,
    children: b.children,
    balancePaise: toPaise(b.balanceAmount),
  });

  return {
    totalBookings: byStatus.reduce((s, b) => s + b._count._all, 0),
    confirmed: count("CONFIRMED"),
    pendingPayment: count("PENDING_PAYMENT"),
    activeHolds,
    cancelled: count("CANCELLED"),
    /** Advance payments actually received (net of refunds). */
    collectedPaise: (captured._sum.amountPaise ?? 0) - (captured._sum.refundedPaise ?? 0),
    /** Total value of confirmed bookings. */
    confirmedValuePaise: confirmedValue._sum.totalAmount ? toPaise(confirmedValue._sum.totalAmount) : 0,
    /** Balance still to be collected at the resort for current/upcoming stays. */
    outstandingPaise: outstanding._sum.balanceAmount ? toPaise(outstanding._sum.balanceAmount) : 0,
    upcomingCheckIns: checkIns.map((b) => toRow(b, b.checkIn)),
    upcomingCheckOuts: checkOuts.map((b) => toRow(b, b.checkOut)),
    newInquiries,
  };
}
