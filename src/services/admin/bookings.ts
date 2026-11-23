import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/db";
import type { BookingFilters } from "@/lib/validation-admin";
import { toDbDate } from "@/utils/dates";

export const BOOKINGS_PAGE_SIZE = 20;

export async function listBookings(db: Db, filters: BookingFilters) {
  const where: Prisma.BookingWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.checkIn = {
      ...(filters.from ? { gte: toDbDate(filters.from) } : {}),
      ...(filters.to ? { lte: toDbDate(filters.to) } : {}),
    };
  }
  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { guestName: { contains: q, mode: "insensitive" } },
      { guestEmail: { contains: q, mode: "insensitive" } },
      { guestPhone: { contains: q.replace(/\s+/g, "") } },
      { guestPhone: { contains: q } },
    ];
  }

  const [total, items] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * BOOKINGS_PAGE_SIZE,
      take: BOOKINGS_PAGE_SIZE,
      select: {
        id: true,
        code: true,
        status: true,
        guestName: true,
        guestEmail: true,
        checkIn: true,
        checkOut: true,
        nights: true,
        totalAmount: true,
        balanceAmount: true,
        createdAt: true,
        roomType: { select: { name: true } },
      },
    }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE)) };
}

export async function getBookingDetail(db: Db, id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      roomType: { select: { name: true, slug: true } },
      reservations: { include: { room: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}
