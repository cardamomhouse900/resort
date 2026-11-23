import "server-only";
import type { Db, Tx } from "@/lib/db";
import { toDbDate, type ISODate } from "@/utils/dates";

/**
 * Availability is always computed from the database at request time — never
 * cached — and the database constraint remains the final guarantee.
 *
 * A reservation occupies a room when it is CONFIRMED, BLOCKED, or HELD with an
 * unexpired hold. Two stays overlap when a.checkIn < b.checkOut AND a.checkOut > b.checkIn.
 */

/** Marks expired payment holds as released / expired so their rooms become bookable. */
export async function releaseExpiredHolds(db: Db | Tx, now: Date = new Date()): Promise<number> {
  const released = await db.$executeRaw`
    UPDATE "reservations" SET "status" = 'RELEASED', "updatedAt" = now()
    WHERE "status" = 'HELD' AND "holdExpiresAt" <= ${now}`;
  await db.$executeRaw`
    UPDATE "bookings" SET "status" = 'EXPIRED', "updatedAt" = now()
    WHERE "status" = 'PENDING_PAYMENT' AND "holdExpiresAt" <= ${now}`;
  return released;
}

export type TypeAvailability = { roomTypeId: string; totalUnits: number; availableUnits: number };

/** Free / total active units per active room type for [checkIn, checkOut). */
export async function getAvailability(
  db: Db | Tx,
  checkIn: ISODate,
  checkOut: ISODate,
  now: Date = new Date(),
): Promise<TypeAvailability[]> {
  const rows = await db.$queryRaw<{ roomTypeId: string; total: bigint; available: bigint }[]>`
    SELECT rt."id" AS "roomTypeId",
           count(r."id") AS "total",
           count(r."id") FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM "reservations" res
             WHERE res."roomId" = r."id"
               AND res."checkIn" < ${toDbDate(checkOut)}::date
               AND res."checkOut" > ${toDbDate(checkIn)}::date
               AND (res."status" IN ('CONFIRMED', 'BLOCKED')
                    OR (res."status" = 'HELD' AND res."holdExpiresAt" > ${now}))
           )) AS "available"
    FROM "room_types" rt
    LEFT JOIN "rooms" r ON r."roomTypeId" = rt."id" AND r."isActive"
    WHERE rt."isActive"
    GROUP BY rt."id"`;
  return rows.map((r) => ({
    roomTypeId: r.roomTypeId,
    totalUnits: Number(r.total),
    availableUnits: Number(r.available),
  }));
}

/**
 * Rooms with no reservation row at all that could clash with an insert: any
 * HELD row counts, even if expired, because the exclusion constraint still
 * covers it until it is released. Used when allocating inside a transaction
 * that must not fail on a constraint violation.
 */
export async function findInsertableRooms(
  db: Db | Tx,
  roomTypeId: string,
  checkIn: ISODate,
  checkOut: ISODate,
): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT r."id" FROM "rooms" r
    WHERE r."roomTypeId" = ${roomTypeId}::uuid AND r."isActive"
      AND NOT EXISTS (
        SELECT 1 FROM "reservations" res
        WHERE res."roomId" = r."id"
          AND res."checkIn" < ${toDbDate(checkOut)}::date
          AND res."checkOut" > ${toDbDate(checkIn)}::date
          AND res."status" IN ('HELD', 'CONFIRMED', 'BLOCKED')
      )
    ORDER BY r."name"`;
  return rows.map((r) => r.id);
}

/** IDs of free, active rooms of one type for the stay, in a stable order (fills "Room 1" first). */
export async function findFreeRooms(
  db: Db | Tx,
  roomTypeId: string,
  checkIn: ISODate,
  checkOut: ISODate,
  now: Date = new Date(),
): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT r."id" FROM "rooms" r
    WHERE r."roomTypeId" = ${roomTypeId}::uuid AND r."isActive"
      AND NOT EXISTS (
        SELECT 1 FROM "reservations" res
        WHERE res."roomId" = r."id"
          AND res."checkIn" < ${toDbDate(checkOut)}::date
          AND res."checkOut" > ${toDbDate(checkIn)}::date
          AND (res."status" IN ('CONFIRMED', 'BLOCKED')
               OR (res."status" = 'HELD' AND res."holdExpiresAt" > ${now}))
      )
    ORDER BY r."name"`;
  return rows.map((r) => r.id);
}
