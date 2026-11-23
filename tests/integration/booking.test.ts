import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getAvailability, releaseExpiredHolds } from "@/services/availability";
import {
  blockRoomDates,
  cancelBooking,
  createBookingHold,
  searchAvailability,
  unblockRoomDates,
  type CreateHoldInput,
} from "@/services/booking";
import { addDays, toDbDate, todayAtResort } from "@/utils/dates";
import { resetAndSeed, testDb } from "../support/db";

const db: Db = testDb();
afterAll(() => db.$disconnect());
beforeEach(() => resetAndSeed(db));

const today = todayAtResort();
const d = (offset: number) => addDays(today, offset);

const guest = { name: "Test Guest", email: "guest@example.com", phone: "+91 98765 43210" };
const hold = (overrides: Partial<CreateHoldInput> = {}): CreateHoldInput => ({
  roomTypeSlug: "forest-family-cottage", // seeded with 2 units
  checkIn: d(30),
  checkOut: d(32),
  adults: 2,
  children: 1,
  guest,
  ...overrides,
});

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

async function roomTypeId(slug: string) {
  return (await db.roomType.findUniqueOrThrow({ where: { slug } })).id;
}

/** Leaves exactly one active unit for the room type. */
async function makeSingleUnit(slug: string) {
  const rooms = await db.room.findMany({
    where: { roomTypeId: await roomTypeId(slug) },
    orderBy: { name: "asc" },
  });
  await db.room.updateMany({
    where: { id: { in: rooms.slice(1).map((r) => r.id) } },
    data: { isActive: false },
  });
  return rooms[0].id;
}

describe("availability search", () => {
  it("returns every room type with live availability and a server-side quote", async () => {
    const result = await searchAvailability(db, { checkIn: d(10), checkOut: d(12), adults: 2, children: 0 });
    expect(result.nights).toBe(2);
    expect(result.options).toHaveLength(3);
    const hillside = result.options.find((o) => o.roomType.slug === "hillside-room")!;
    expect(hillside.availableUnits).toBe(4);
    expect(hillside.quote?.totalPaise).toBe(700_000); // 2 × ₹3,500
    expect(hillside.quote?.advancePaise).toBe(210_000); // 30%
  });

  it("returns no quote when the party does not fit the room", async () => {
    const result = await searchAvailability(db, { checkIn: d(10), checkOut: d(12), adults: 4, children: 0 });
    const valley = result.options.find((o) => o.roomType.slug === "valley-view-cottage")!;
    expect(valley.fitsGuests).toBe(false);
    expect(valley.quote).toBeNull();
  });

  it("uses the advance percentage from settings, not a hard-coded value", async () => {
    await db.siteSetting.update({ where: { id: 1 }, data: { advancePercent: 50 } });
    const result = await searchAvailability(db, {
      checkIn: d(10),
      checkOut: d(12),
      adults: 2,
      children: 0,
      roomTypeSlug: "hillside-room",
    });
    expect(result.options[0].quote?.advancePaise).toBe(350_000);
  });

  it("applies pricing rules stored in the database", async () => {
    await db.pricingRule.create({
      data: {
        roomTypeId: await roomTypeId("hillside-room"),
        name: "Peak season",
        startDate: toDbDate(d(10)),
        endDate: toDbDate(d(10)),
        daysOfWeek: [],
        pricePerNight: "4500.00",
        priority: 1,
      },
    });
    const result = await searchAvailability(db, {
      checkIn: d(10),
      checkOut: d(12),
      adults: 1,
      children: 0,
      roomTypeSlug: "hillside-room",
    });
    expect(result.options[0].quote?.nightly.map((n) => n.pricePaise)).toEqual([450_000, 350_000]);
  });

  it("rejects past dates and unknown room types", async () => {
    await expectAppError(
      searchAvailability(db, { checkIn: d(-1), checkOut: d(1), adults: 1, children: 0 }),
      "INVALID_DATES",
    );
    await expectAppError(
      searchAvailability(db, { checkIn: d(5), checkOut: d(6), adults: 1, children: 0, roomTypeSlug: "nope" }),
      "ROOM_TYPE_NOT_FOUND",
    );
  });
});

describe("booking holds", () => {
  it("creates a pending booking with a held unit and server-calculated amounts", async () => {
    const result = await createBookingHold(db, hold());
    expect(result.code).toMatch(/^BK-[0-9A-Z]{6}$/);
    expect(result.accessToken.length).toBeGreaterThan(40);

    const booking = await db.booking.findUniqueOrThrow({
      where: { code: result.code },
      include: { reservations: true },
    });
    expect(booking.status).toBe("PENDING_PAYMENT");
    expect(booking.totalAmount.toFixed(2)).toBe("15000.00"); // 2 × ₹7,500
    expect(booking.advanceAmount.toFixed(2)).toBe("4500.00");
    expect(booking.balanceAmount.toFixed(2)).toBe("10500.00");
    expect(booking.accessTokenHash).not.toBe(result.accessToken); // only the hash is stored
    expect(booking.reservations).toHaveLength(1);
    expect(booking.reservations[0].status).toBe("HELD");
  });

  it("fills every unit, then reports the room type as unavailable", async () => {
    await createBookingHold(db, hold());
    await createBookingHold(db, hold());
    await expectAppError(createBookingHold(db, hold()), "NOT_AVAILABLE");
    const forestId = await roomTypeId("forest-family-cottage");
    const forest = (await getAvailability(db, d(30), d(32))).find((a) => a.roomTypeId === forestId);
    expect(forest).toEqual({ roomTypeId: forestId, totalUnits: 2, availableUnits: 0 });
    // Other dates are unaffected.
    const later = (await getAvailability(db, d(32), d(34))).find((a) => a.roomTypeId === forestId);
    expect(later?.availableUnits).toBe(2);
  });

  it("never double-books under concurrent requests", async () => {
    // 12 guests try to book the same 2-unit room type at the same moment.
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => createBookingHold(db, hold())));
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(2);
    expect(failed).toHaveLength(10);
    for (const f of failed) expect((f.reason as AppError).code).toBe("NOT_AVAILABLE");

    const overlaps = await db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM "reservations" a JOIN "reservations" b
        ON a."roomId" = b."roomId" AND a."id" < b."id"
       AND daterange(a."checkIn", a."checkOut") && daterange(b."checkIn", b."checkOut")
      WHERE a."status" IN ('HELD','CONFIRMED','BLOCKED') AND b."status" IN ('HELD','CONFIRMED','BLOCKED')`;
    expect(Number(overlaps[0].n)).toBe(0);
  });

  it("allows back-to-back stays (check-out day = next check-in day)", async () => {
    await makeSingleUnit("forest-family-cottage");
    await createBookingHold(db, hold({ checkIn: d(30), checkOut: d(32) }));
    await expect(createBookingHold(db, hold({ checkIn: d(32), checkOut: d(34) }))).resolves.toBeDefined();
    await expect(createBookingHold(db, hold({ checkIn: d(28), checkOut: d(30) }))).resolves.toBeDefined();
  });

  it("rejects partially overlapping stays on the same unit", async () => {
    await makeSingleUnit("forest-family-cottage");
    await createBookingHold(db, hold({ checkIn: d(30), checkOut: d(33) }));
    await expectAppError(createBookingHold(db, hold({ checkIn: d(32), checkOut: d(35) })), "NOT_AVAILABLE");
    await expectAppError(createBookingHold(db, hold({ checkIn: d(29), checkOut: d(31) })), "NOT_AVAILABLE");
    await expectAppError(createBookingHold(db, hold({ checkIn: d(31), checkOut: d(32) })), "NOT_AVAILABLE");
  });

  it("releases expired holds so the unit can be booked again", async () => {
    await makeSingleUnit("forest-family-cottage");
    const t0 = new Date();
    const first = await createBookingHold(db, hold(), t0);

    // 16 minutes later the 15-minute hold has expired.
    const later = new Date(t0.getTime() + 16 * 60_000);
    await expect(createBookingHold(db, hold(), later)).resolves.toBeDefined();

    const expired = await db.booking.findUniqueOrThrow({
      where: { code: first.code },
      include: { reservations: true },
    });
    expect(expired.status).toBe("EXPIRED");
    expect(expired.reservations[0].status).toBe("RELEASED");
  });

  it("does not release holds that are still valid", async () => {
    await makeSingleUnit("forest-family-cottage");
    const t0 = new Date();
    await createBookingHold(db, hold(), t0);
    expect(await releaseExpiredHolds(db, new Date(t0.getTime() + 5 * 60_000))).toBe(0);
    await expectAppError(createBookingHold(db, hold(), new Date(t0.getTime() + 5 * 60_000)), "NOT_AVAILABLE");
  });

  it("validates occupancy and dates on the server", async () => {
    await expectAppError(createBookingHold(db, hold({ adults: 5, children: 2 })), "OCCUPANCY_EXCEEDED");
    await expectAppError(createBookingHold(db, hold({ checkIn: d(-2), checkOut: d(1) })), "INVALID_DATES");
    await expectAppError(
      createBookingHold(db, hold({ roomTypeSlug: "hillside-room", checkIn: d(1), checkOut: d(30) })),
      "INVALID_DATES",
    );
  });

  it("does not offer deactivated room types", async () => {
    await db.roomType.update({ where: { slug: "forest-family-cottage" }, data: { isActive: false } });
    await expectAppError(createBookingHold(db, hold()), "ROOM_TYPE_NOT_FOUND");
  });
});

describe("cancellation and admin blocks", () => {
  it("cancelling frees the unit and is idempotent", async () => {
    await makeSingleUnit("forest-family-cottage");
    const first = await createBookingHold(db, hold());
    expect(await cancelBooking(db, first.bookingId, "Guest request")).toEqual({ changed: true });
    expect(await cancelBooking(db, first.bookingId, "Guest request")).toEqual({ changed: false });
    await expect(createBookingHold(db, hold())).resolves.toBeDefined();
  });

  it("blocked dates reduce availability and cannot overlap a booking", async () => {
    const roomId = await makeSingleUnit("forest-family-cottage");
    const block = await blockRoomDates(db, { roomId, checkIn: d(40), checkOut: d(45), note: "Maintenance" });
    await expectAppError(createBookingHold(db, hold({ checkIn: d(44), checkOut: d(46) })), "NOT_AVAILABLE");

    await createBookingHold(db, hold({ checkIn: d(50), checkOut: d(52) }));
    await expectAppError(blockRoomDates(db, { roomId, checkIn: d(51), checkOut: d(53) }), "CONFLICT");

    await unblockRoomDates(db, block.id);
    await expect(createBookingHold(db, hold({ checkIn: d(44), checkOut: d(46) }))).resolves.toBeDefined();
  });
});

describe("database-level guarantee", () => {
  it("the exclusion constraint rejects overlapping rows even when the application is bypassed", async () => {
    const roomId = await makeSingleUnit("hillside-room");
    const row = { roomId, kind: "BLOCK" as const, status: "BLOCKED" as const };
    await db.reservation.create({ data: { ...row, checkIn: toDbDate(d(60)), checkOut: toDbDate(d(63)) } });
    await expect(
      db.reservation.create({ data: { ...row, checkIn: toDbDate(d(62)), checkOut: toDbDate(d(64)) } }),
    ).rejects.toThrow();
    // Released rows do not count.
    await db.reservation.create({
      data: { ...row, status: "RELEASED", checkIn: toDbDate(d(61)), checkOut: toDbDate(d(62)) },
    });
  });

  it("rejects bookings whose amounts do not add up", async () => {
    const first = await createBookingHold(db, hold());
    await expect(
      db.booking.update({ where: { code: first.code }, data: { advanceAmount: "1.00" } }),
    ).rejects.toThrow();
  });
});
