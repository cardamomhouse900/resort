import "server-only";
import type { Db } from "@/lib/db";
import { AppError, isOverlapViolation, isUniqueViolation } from "@/lib/errors";
import { randomCode, randomToken, sha256Hex } from "@/lib/crypto";
import { diffDays, fromDbDate, toDbDate, todayAtResort, type ISODate } from "@/utils/dates";
import { fromPaise, toPaise } from "@/utils/money";
import { findFreeRooms, getAvailability, releaseExpiredHolds } from "./availability";
import {
  calculateQuote,
  checkStayDates,
  fitsOccupancy,
  type PriceRule,
  type Quote,
  type StayProblem,
} from "./pricing";
import { getBookingSettings, type BookingSettings } from "./settings";

export const STAY_PROBLEM_MESSAGES: Record<StayProblem, string> = {
  CHECK_IN_IN_PAST: "Check-in date cannot be in the past.",
  CHECK_OUT_BEFORE_CHECK_IN: "Check-out must be after check-in.",
  TOO_FEW_NIGHTS: "This stay is shorter than the minimum number of nights.",
  TOO_MANY_NIGHTS: "This stay is longer than the maximum number of nights we accept online.",
  TOO_FAR_AHEAD: "These dates are too far ahead to book online yet.",
};

type RoomTypeForQuote = {
  id: string;
  basePrice: { toFixed(dp: number): string };
  pricingRules: {
    startDate: Date;
    endDate: Date;
    daysOfWeek: number[];
    pricePerNight: { toFixed(dp: number): string };
    priority: number;
  }[];
};

function toPriceRules(rt: RoomTypeForQuote): PriceRule[] {
  return rt.pricingRules.map((r) => ({
    startDate: fromDbDate(r.startDate),
    endDate: fromDbDate(r.endDate),
    daysOfWeek: r.daysOfWeek,
    pricePaise: toPaise(r.pricePerNight),
    priority: r.priority,
  }));
}

/** Loads active pricing rules that overlap the stay. */
export function pricingRulesInclude(checkIn: ISODate, checkOut: ISODate) {
  return {
    pricingRules: {
      where: { isActive: true, startDate: { lt: toDbDate(checkOut) }, endDate: { gte: toDbDate(checkIn) } },
    },
  } as const;
}

export function quoteForRoomType(
  rt: RoomTypeForQuote,
  checkIn: ISODate,
  checkOut: ISODate,
  settings: BookingSettings,
): Quote {
  return calculateQuote({
    basePricePaise: toPaise(rt.basePrice),
    rules: toPriceRules(rt),
    checkIn,
    checkOut,
    taxPercent: settings.taxPercent,
    pricesIncludeTax: settings.pricesIncludeTax,
    advancePercent: settings.advancePercent,
  });
}

/** Throws INVALID_DATES when the stay breaks a booking rule. */
export function assertValidStay(checkIn: ISODate, checkOut: ISODate, settings: BookingSettings, now: Date) {
  const problem = checkStayDates(checkIn, checkOut, todayAtResort(now), settings);
  if (problem) throw new AppError("INVALID_DATES", STAY_PROBLEM_MESSAGES[problem], { reason: problem });
}

export type CreateHoldInput = {
  roomTypeSlug: string;
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  guest: { name: string; email: string; phone: string };
  specialRequests?: string;
};

export type CreatedHold = {
  bookingId: string;
  code: string;
  /** Secret for the guest's booking link — returned once, only its hash is stored. */
  accessToken: string;
  holdExpiresAt: Date;
  roomType: { slug: string; name: string };
  quote: Quote;
};

const MAX_ATTEMPTS = 8;

/**
 * Creates a PENDING_PAYMENT booking and holds one free unit of the requested
 * room type for `settings.holdMinutes`.
 *
 * Every amount is calculated here from database prices — nothing from the
 * browser is trusted. Concurrency: if two requests pick the same unit, the
 * exclusion constraint rejects one insert; that request retries with fresh
 * availability and either gets another unit or a NOT_AVAILABLE error.
 */
export async function createBookingHold(
  db: Db,
  input: CreateHoldInput,
  now: Date = new Date(),
): Promise<CreatedHold> {
  const settings = await getBookingSettings(db);
  assertValidStay(input.checkIn, input.checkOut, settings, now);

  const roomType = await db.roomType.findFirst({
    where: { slug: input.roomTypeSlug, isActive: true },
    include: pricingRulesInclude(input.checkIn, input.checkOut),
  });
  if (!roomType) throw new AppError("ROOM_TYPE_NOT_FOUND", "This room type is not available for booking.");

  if (!fitsOccupancy(input, roomType)) {
    throw new AppError(
      "OCCUPANCY_EXCEEDED",
      `${roomType.name} accommodates up to ${roomType.maxOccupancy} guests (${roomType.maxAdults} adults, ${roomType.maxChildren} children).`,
    );
  }

  const quote = quoteForRoomType(roomType, input.checkIn, input.checkOut, settings);
  const holdExpiresAt = new Date(now.getTime() + settings.holdMinutes * 60_000);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const accessToken = randomToken();
    const code = randomCode();
    try {
      const booking = await db.$transaction(async (tx) => {
        await releaseExpiredHolds(tx, now);
        const [roomId] = await findFreeRooms(tx, roomType.id, input.checkIn, input.checkOut, now);
        if (!roomId)
          throw new AppError("NOT_AVAILABLE", `Sorry, ${roomType.name} is fully booked for these dates.`);

        return tx.booking.create({
          data: {
            code,
            accessTokenHash: await sha256Hex(accessToken),
            status: "PENDING_PAYMENT",
            source: "WEBSITE",
            roomTypeId: roomType.id,
            checkIn: toDbDate(input.checkIn),
            checkOut: toDbDate(input.checkOut),
            nights: quote.nights,
            adults: input.adults,
            children: input.children,
            guestName: input.guest.name,
            guestEmail: input.guest.email,
            guestPhone: input.guest.phone,
            specialRequests: input.specialRequests || null,
            priceBreakdown: quote.nightly.map((n) => ({ date: n.date, price: fromPaise(n.pricePaise) })),
            subtotal: fromPaise(quote.subtotalPaise),
            taxPercent: settings.taxPercent.toFixed(2),
            taxAmount: fromPaise(quote.taxPaise),
            totalAmount: fromPaise(quote.totalPaise),
            advancePercent: quote.advancePercent,
            advanceAmount: fromPaise(quote.advancePaise),
            balanceAmount: fromPaise(quote.balancePaise),
            holdExpiresAt,
            reservations: {
              create: {
                roomId,
                kind: "BOOKING",
                status: "HELD",
                checkIn: toDbDate(input.checkIn),
                checkOut: toDbDate(input.checkOut),
                holdExpiresAt,
              },
            },
          },
          select: { id: true },
        });
      });

      return {
        bookingId: booking.id,
        code,
        accessToken,
        holdExpiresAt,
        roomType: { slug: roomType.slug, name: roomType.name },
        quote,
      };
    } catch (error) {
      // Another request took the same unit (or, very rarely, the same code) — try again.
      if ((isOverlapViolation(error) || isUniqueViolation(error)) && attempt < MAX_ATTEMPTS) continue;
      if (isOverlapViolation(error)) {
        throw new AppError("NOT_AVAILABLE", `Sorry, ${roomType.name} is fully booked for these dates.`);
      }
      throw error;
    }
  }
  throw new AppError("NOT_AVAILABLE", `Sorry, ${roomType.name} is fully booked for these dates.`);
}

export type AvailabilityOption = {
  roomType: {
    slug: string;
    name: string;
    summary: string;
    image: { src: string; alt: string; isPlaceholder: boolean } | null;
    maxAdults: number;
    maxChildren: number;
    maxOccupancy: number;
    bedConfiguration: string;
  };
  availableUnits: number;
  fitsGuests: boolean;
  /** Present when the room is bookable for this search. */
  quote: Quote | null;
};

/**
 * Availability + server-calculated prices for every active room type
 * (or one, when `roomTypeSlug` is given). Read-only; holds nothing.
 */
export async function searchAvailability(
  db: Db,
  input: { checkIn: ISODate; checkOut: ISODate; adults: number; children: number; roomTypeSlug?: string },
  now: Date = new Date(),
): Promise<{ nights: number; options: AvailabilityOption[] }> {
  const settings = await getBookingSettings(db);
  assertValidStay(input.checkIn, input.checkOut, settings, now);

  const [types, availability] = await Promise.all([
    db.roomType.findMany({
      where: { isActive: true, ...(input.roomTypeSlug ? { slug: input.roomTypeSlug } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: pricingRulesInclude(input.checkIn, input.checkOut),
    }),
    getAvailability(db, input.checkIn, input.checkOut, now),
  ]);
  if (input.roomTypeSlug && types.length === 0) {
    throw new AppError("ROOM_TYPE_NOT_FOUND", "This room type is not available for booking.");
  }

  const free = new Map(availability.map((a) => [a.roomTypeId, a.availableUnits]));
  const options = types.map((rt): AvailabilityOption => {
    const availableUnits = free.get(rt.id) ?? 0;
    const fitsGuests = fitsOccupancy(input, rt);
    const images = Array.isArray(rt.images)
      ? (rt.images as { src: string; alt: string; isPlaceholder?: boolean }[])
      : [];
    return {
      roomType: {
        slug: rt.slug,
        name: rt.name,
        summary: rt.summary,
        image: images[0]
          ? { src: images[0].src, alt: images[0].alt, isPlaceholder: images[0].isPlaceholder === true }
          : null,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        maxOccupancy: rt.maxOccupancy,
        bedConfiguration: rt.bedConfiguration,
      },
      availableUnits,
      fitsGuests,
      quote:
        availableUnits > 0 && fitsGuests
          ? quoteForRoomType(rt, input.checkIn, input.checkOut, settings)
          : null,
    };
  });

  return { nights: diffDays(input.checkIn, input.checkOut), options };
}

/**
 * Cancels a booking and frees its room(s). Idempotent: cancelling an already
 * cancelled booking is a no-op. Refunds are handled by the payment service (Phase 5).
 */
export async function cancelBooking(db: Db, bookingId: string, reason: string, now: Date = new Date()) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
    if (!booking) throw new AppError("NOT_FOUND", "Booking not found.");
    if (booking.status === "CANCELLED") return { changed: false };

    await tx.reservation.updateMany({
      where: { bookingId, status: { in: ["HELD", "CONFIRMED"] } },
      data: { status: "RELEASED" },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelledAt: now, cancellationReason: reason, holdExpiresAt: null },
    });
    return { changed: true };
  });
}

/** Blocks a physical room for maintenance or private use. Fails if it overlaps a booking or block. */
export async function blockRoomDates(
  db: Db,
  input: { roomId: string; checkIn: ISODate; checkOut: ISODate; note?: string },
) {
  if (input.checkOut <= input.checkIn)
    throw new AppError("INVALID_DATES", "The end date must be after the start date.");
  try {
    return await db.reservation.create({
      data: {
        roomId: input.roomId,
        kind: "BLOCK",
        status: "BLOCKED",
        checkIn: toDbDate(input.checkIn),
        checkOut: toDbDate(input.checkOut),
        note: input.note ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isOverlapViolation(error)) {
      throw new AppError("CONFLICT", "These dates overlap an existing booking or block for this room.");
    }
    throw error;
  }
}

export async function unblockRoomDates(db: Db, reservationId: string) {
  const result = await db.reservation.updateMany({
    where: { id: reservationId, kind: "BLOCK", status: "BLOCKED" },
    data: { status: "RELEASED" },
  });
  if (result.count === 0) throw new AppError("NOT_FOUND", "Block not found.");
}
