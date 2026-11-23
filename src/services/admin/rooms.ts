import "server-only";
import type { z } from "zod";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  amenitySchema,
  pricingRuleSchema,
  roomTypeSchema,
  roomUnitSchema,
} from "@/lib/validation-admin";
import { todayAtResort, toDbDate } from "@/utils/dates";

type RoomTypeInput = z.infer<typeof roomTypeSchema>;

export async function listRoomTypesForAdmin(db: Db) {
  return db.roomType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      maxOccupancy: true,
      isActive: true,
      isPlaceholder: true,
      images: true,
      _count: { select: { rooms: { where: { isActive: true } } } },
    },
  });
}

export async function getRoomTypeForEdit(db: Db, id: string) {
  return db.roomType.findUnique({
    where: { id },
    include: {
      amenities: { orderBy: { sortOrder: "asc" }, select: { amenityId: true } },
      rooms: { orderBy: { name: "asc" } },
      pricingRules: { orderBy: [{ startDate: "asc" }] },
    },
  });
}

export async function listAmenities(db: Db) {
  return db.amenity.findMany({ orderBy: { name: "asc" } });
}

function roomTypeData(input: RoomTypeInput) {
  return {
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    description: input.description,
    basePrice: input.basePrice.toFixed(2),
    maxAdults: input.maxAdults,
    maxChildren: input.maxChildren,
    maxOccupancy: input.maxOccupancy,
    bedConfiguration: input.bedConfiguration,
    sizeSqFt: input.sizeSqFt ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    isPlaceholder: input.isPlaceholder,
    images: input.images,
  };
}

export async function createRoomType(db: Db, input: RoomTypeInput) {
  return db.roomType.create({
    data: {
      ...roomTypeData(input),
      amenities: { create: input.amenityIds.map((amenityId, i) => ({ amenityId, sortOrder: i })) },
    },
    select: { id: true },
  });
}

/** Updates fields and replaces the amenity list atomically. Existing bookings keep their price snapshot. */
export async function updateRoomType(db: Db, id: string, input: RoomTypeInput) {
  await db.$transaction(async (tx) => {
    await tx.roomType.update({ where: { id }, data: roomTypeData(input) });
    await tx.roomTypeAmenity.deleteMany({ where: { roomTypeId: id } });
    if (input.amenityIds.length) {
      await tx.roomTypeAmenity.createMany({
        data: input.amenityIds.map((amenityId, i) => ({ roomTypeId: id, amenityId, sortOrder: i })),
      });
    }
  });
}

export async function createAmenity(db: Db, input: z.infer<typeof amenitySchema>) {
  return db.amenity.create({ data: input, select: { id: true } });
}

/* ------------------------------------------------------------- Physical units */

export async function addRoomUnit(db: Db, roomTypeId: string, input: z.infer<typeof roomUnitSchema>) {
  return db.room.create({ data: { roomTypeId, name: input.name, notes: input.notes }, select: { id: true } });
}

async function futureActiveReservations(db: Db, roomId: string) {
  return db.reservation.count({
    where: {
      roomId,
      checkOut: { gt: toDbDate(todayAtResort()) },
      OR: [{ status: "CONFIRMED" }, { status: "HELD", holdExpiresAt: { gt: new Date() } }],
    },
  });
}

/**
 * Activates/deactivates a unit. A unit with upcoming guest stays cannot be
 * deactivated — those bookings would silently lose their room.
 */
export async function setRoomUnitActive(db: Db, roomId: string, isActive: boolean) {
  if (!isActive && (await futureActiveReservations(db, roomId)) > 0) {
    throw new AppError(
      "CONFLICT",
      "This room has upcoming bookings. Move or cancel them before taking the room out of service — or block its dates instead.",
    );
  }
  await db.room.update({ where: { id: roomId }, data: { isActive } });
}

export async function renameRoomUnit(db: Db, roomId: string, input: z.infer<typeof roomUnitSchema>) {
  await db.room.update({ where: { id: roomId }, data: { name: input.name, notes: input.notes } });
}

/** Deletes a unit only if it has never been booked or blocked; otherwise deactivate it. */
export async function deleteRoomUnit(db: Db, roomId: string) {
  const used = await db.reservation.count({ where: { roomId } });
  if (used > 0)
    throw new AppError("CONFLICT", "This room has booking history. Deactivate it instead of deleting.");
  await db.room.delete({ where: { id: roomId } });
}

/* ------------------------------------------------------------- Pricing rules */

export async function addPricingRule(db: Db, roomTypeId: string, input: z.infer<typeof pricingRuleSchema>) {
  return db.pricingRule.create({
    data: {
      roomTypeId,
      name: input.name,
      startDate: toDbDate(input.startDate),
      endDate: toDbDate(input.endDate),
      daysOfWeek: [...new Set(input.daysOfWeek)].sort(),
      pricePerNight: input.pricePerNight.toFixed(2),
      priority: input.priority,
    },
    select: { id: true },
  });
}

export async function deletePricingRule(db: Db, ruleId: string) {
  await db.pricingRule.delete({ where: { id: ruleId } });
}
