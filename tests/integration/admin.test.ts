import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { findActiveAdmin } from "@/lib/auth";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseForm } from "@/lib/form";
import { activitySchema, facilitySchema, roomTypeSchema, settingsSchema } from "@/lib/validation-admin";
import { getBookingDetail, listBookings } from "@/services/admin/bookings";
import { getCalendar } from "@/services/admin/calendar";
import { activities, facilities, getSettingsForEdit, updateSettings } from "@/services/admin/content";
import { getDashboardStats } from "@/services/admin/dashboard";
import {
  addPricingRule,
  addRoomUnit,
  createRoomType,
  deleteRoomUnit,
  getRoomTypeForEdit,
  listAmenities,
  setRoomUnitActive,
  updateRoomType,
} from "@/services/admin/rooms";
import { blockRoomDates, createBookingHold, searchAvailability } from "@/services/booking";
import { addDays, todayAtResort } from "@/utils/dates";
import { resetAndSeed, testDb } from "../support/db";

const db: Db = testDb();
afterAll(() => db.$disconnect());
beforeEach(() => resetAndSeed(db));

const today = todayAtResort();
const d = (n: number) => addDays(today, n);
const guest = { name: "Admin Test Guest", email: "admintest@example.com", phone: "+91 90000 00001" };
const img = JSON.stringify([
  {
    src: "https://res.cloudinary.com/demo/image/upload/v1/room.jpg",
    alt: "Room with a mountain view",
    isPlaceholder: false,
  },
]);

function form(values: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(`${k}[]`, x));
    else f.append(k, v);
  }
  return f;
}

async function confirmedBooking(slug: string, checkIn: string, checkOut: string) {
  const hold = await createBookingHold(db, {
    roomTypeSlug: slug,
    checkIn,
    checkOut,
    adults: 2,
    children: 0,
    guest,
  });
  await db.booking.update({
    where: { id: hold.bookingId },
    data: { status: "CONFIRMED", holdExpiresAt: null },
  });
  await db.reservation.updateMany({
    where: { bookingId: hold.bookingId },
    data: { status: "CONFIRMED", holdExpiresAt: null },
  });
  return hold;
}

describe("admin authorisation", () => {
  it("allows only active rows in the admins table", async () => {
    const authUserId = "8f14e45f-ceea-467a-9f4e-2a6b1c3d4e5f";
    expect(await findActiveAdmin(db, authUserId)).toBeNull(); // valid Supabase user, not an admin
    await db.admin.create({ data: { authUserId, email: "owner@example.com", name: "Owner", role: "OWNER" } });
    expect((await findActiveAdmin(db, authUserId))?.role).toBe("OWNER");
    await db.admin.update({ where: { authUserId }, data: { isActive: false } });
    expect(await findActiveAdmin(db, authUserId)).toBeNull();
    expect(await findActiveAdmin(db, undefined)).toBeNull();
    expect(await findActiveAdmin(db, "' OR 1=1 --")).toBeNull();
  });
});

describe("room management", () => {
  const base = {
    slug: "tree-house",
    name: "Tree House",
    summary: "A sample tree house among tall trees.",
    description: "First paragraph about the view.\n\nSecond paragraph about the deck.",
    basePrice: "6200",
    maxAdults: "2",
    maxChildren: "1",
    maxOccupancy: "3",
    bedConfiguration: "1 king bed",
    sizeSqFt: "",
    sortOrder: "5",
    isActive: "on",
    images: img,
  };

  it("creates a room type with amenities and units, then sells it", async () => {
    const amenities = await listAmenities(db);
    const parsed = parseForm(
      roomTypeSchema,
      form({ ...base, amenityIds: amenities.slice(0, 2).map((a) => a.id) }),
    );
    expect(parsed.state).toBeUndefined();
    const { id } = await createRoomType(db, parsed.data!);
    const rt = await getRoomTypeForEdit(db, id);
    expect(rt?.description).toEqual(["First paragraph about the view.", "Second paragraph about the deck."]);
    expect(rt?.amenities).toHaveLength(2);

    // Not bookable until it has a physical unit.
    let search = await searchAvailability(db, {
      checkIn: d(5),
      checkOut: d(6),
      adults: 2,
      children: 0,
      roomTypeSlug: "tree-house",
    });
    expect(search.options[0].availableUnits).toBe(0);
    await addRoomUnit(db, id, { name: "Tree House 1", notes: null });
    search = await searchAvailability(db, {
      checkIn: d(5),
      checkOut: d(6),
      adults: 2,
      children: 0,
      roomTypeSlug: "tree-house",
    });
    expect(search.options[0].quote?.totalPaise).toBe(620_000);
  });

  it("rejects inconsistent occupancy and missing photos", () => {
    const bad = parseForm(roomTypeSchema, form({ ...base, maxOccupancy: "9", images: "[]" }));
    expect(bad.state?.errors?.maxOccupancy).toBeDefined();
    expect(bad.state?.errors?.images).toBeDefined();
  });

  it("rejects images from other hosts", () => {
    const evil = JSON.stringify([
      { src: "https://evil.example.com/x.jpg", alt: "Something long", isPlaceholder: false },
    ]);
    expect(parseForm(roomTypeSchema, form({ ...base, images: evil })).state?.errors?.images).toMatch(
      /hosted on/,
    );
    const http = JSON.stringify([
      { src: "http://res.cloudinary.com/x.jpg", alt: "Something long", isPlaceholder: false },
    ]);
    expect(parseForm(roomTypeSchema, form({ ...base, images: http })).state?.errors?.images).toBeDefined();
  });

  it("updates prices and replaces amenities; existing bookings keep their price", async () => {
    const hold = await createBookingHold(db, {
      roomTypeSlug: "hillside-room",
      checkIn: d(10),
      checkOut: d(11),
      adults: 1,
      children: 0,
      guest,
    });
    const rt = await db.roomType.findUniqueOrThrow({ where: { slug: "hillside-room" } });
    const parsed = parseForm(
      roomTypeSchema,
      form({ ...base, slug: "hillside-room", name: rt.name, basePrice: "4000" }),
    );
    await updateRoomType(db, rt.id, parsed.data!);
    expect((await getRoomTypeForEdit(db, rt.id))?.amenities).toHaveLength(0);
    const booking = await db.booking.findUniqueOrThrow({ where: { id: hold.bookingId } });
    expect(booking.totalAmount.toFixed(2)).toBe("3500.00");
  });

  it("will not take a room with upcoming stays out of service, or delete a room with history", async () => {
    await confirmedBooking("forest-family-cottage", d(20), d(22));
    const reservation = await db.reservation.findFirstOrThrow({ where: { status: "CONFIRMED" } });
    await expect(setRoomUnitActive(db, reservation.roomId, false)).rejects.toThrow(AppError);
    await expect(deleteRoomUnit(db, reservation.roomId)).rejects.toThrow(/booking history/);

    const free = await db.room.findFirstOrThrow({
      where: { id: { not: reservation.roomId }, roomType: { slug: "forest-family-cottage" } },
    });
    await setRoomUnitActive(db, free.id, false);
    await deleteRoomUnit(db, free.id);
  });

  it("pricing rules change quotes for matching nights", async () => {
    const rt = await db.roomType.findUniqueOrThrow({ where: { slug: "valley-view-cottage" } });
    await addPricingRule(db, rt.id, {
      name: "Festival",
      startDate: d(30),
      endDate: d(30),
      daysOfWeek: [],
      pricePerNight: 8000,
      priority: 1,
    });
    const s = await searchAvailability(db, {
      checkIn: d(30),
      checkOut: d(32),
      adults: 2,
      children: 0,
      roomTypeSlug: "valley-view-cottage",
    });
    expect(s.options[0].quote?.nightly.map((n) => n.pricePaise)).toEqual([800_000, 500_000]);
  });
});

describe("settings", () => {
  const valid = {
    resortName: "Test Resort",
    shortName: "Test",
    tagline: "A tagline here",
    description: "A description that is long enough to pass validation.",
    locationName: "Somewhere",
    address: "1 Road, Town",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "owner@example.com",
    mapsUrl: "",
    advancePercent: "50",
    holdMinutes: "20",
    taxPercent: "12",
    pricesIncludeTax: "on",
    minNights: "1",
    maxNights: "10",
    bookingWindowDays: "200",
    checkInTime: "12:00",
    checkOutTime: "10:30",
    bookingPolicy: "Booking policy text that is long enough.",
    cancellationPolicy: "Cancellation policy text that is long enough.",
  };

  it("updates the advance percentage used by new bookings", async () => {
    const parsed = parseForm(settingsSchema, form(valid));
    expect(parsed.state).toBeUndefined();
    await updateSettings(db, parsed.data!);
    const s = await getSettingsForEdit(db);
    expect(s.advancePercent).toBe(50);
    expect(s.isPlaceholder).toBe(false); // unchecked checkbox = false
    const hold = await createBookingHold(db, {
      roomTypeSlug: "hillside-room",
      checkIn: d(3),
      checkOut: d(4),
      adults: 1,
      children: 0,
      guest,
    });
    expect(hold.quote.advancePaise).toBe(175_000);
    expect(hold.quote.taxPaise).toBe(37_500); // 12% included in ₹3,500
  });

  it("rejects out-of-range values", () => {
    const r = parseForm(
      settingsSchema,
      form({ ...valid, advancePercent: "0", minNights: "5", maxNights: "2", checkInTime: "25:00" }),
    );
    expect(Object.keys(r.state?.errors ?? {})).toEqual(
      expect.arrayContaining(["advancePercent", "maxNights", "checkInTime"]),
    );
  });
});

describe("content", () => {
  it("saves facilities with and without a photo", async () => {
    const parsed = parseForm(
      facilitySchema,
      form({
        slug: "library",
        name: "Library",
        description: "Books and board games for rainy days.",
        icon: "leaf",
        image: "",
        sortOrder: "3",
        isActive: "on",
      }),
    );
    const created = await facilities.save(db, null, parsed.data!);
    expect(created.image).toBeNull();
    await facilities.remove(db, created.id);
  });

  it("maps the three activity pricing modes", async () => {
    const base = {
      slug: "x-activity",
      title: "Bird walk",
      summary: "An early morning bird walk.",
      description: "A gentle walk with a guide looking for birds.",
      duration: "2 hours",
      category: "NATURE",
      images: img,
      isActive: "on",
    };
    const a = await activities.save(
      db,
      null,
      parseForm(activitySchema, form({ ...base, pricing: "from", priceFrom: "750" })).data!,
    );
    expect(a.priceFrom?.toFixed(2)).toBe("750.00");
    const b = await activities.save(
      db,
      a.id,
      parseForm(activitySchema, form({ ...base, pricing: "included", priceFrom: "750" })).data!,
    );
    expect([b.priceIncluded, b.priceFrom]).toEqual([true, null]);
    const c = await activities.save(
      db,
      a.id,
      parseForm(activitySchema, form({ ...base, pricing: "on-request" })).data!,
    );
    expect([c.priceIncluded, c.priceFrom]).toEqual([false, null]);
  });
});

describe("bookings, dashboard and calendar", () => {
  it("lists and filters bookings", async () => {
    const a = await confirmedBooking("hillside-room", d(2), d(4));
    await createBookingHold(db, {
      roomTypeSlug: "hillside-room",
      checkIn: d(9),
      checkOut: d(10),
      adults: 1,
      children: 0,
      guest: { ...guest, name: "Priya Sharma" },
    });

    expect((await listBookings(db, { page: 1 })).total).toBe(2);
    expect((await listBookings(db, { page: 1, q: a.code.toLowerCase() })).items.map((b) => b.code)).toEqual([
      a.code,
    ]);
    expect((await listBookings(db, { page: 1, q: "priya" })).total).toBe(1);
    expect((await listBookings(db, { page: 1, status: "CONFIRMED" })).total).toBe(1);
    expect((await listBookings(db, { page: 1, from: d(5) })).total).toBe(1);

    const detail = await getBookingDetail(db, a.bookingId);
    expect(detail?.reservations[0].room.name).toMatch(/Hillside/);
  });

  it("dashboard counts arrivals, departures and outstanding balances", async () => {
    await confirmedBooking("hillside-room", d(1), d(3));
    await createBookingHold(db, {
      roomTypeSlug: "hillside-room",
      checkIn: d(5),
      checkOut: d(6),
      adults: 1,
      children: 0,
      guest,
    });
    const s = await getDashboardStats(db, today);
    expect(s.confirmed).toBe(1);
    expect(s.pendingPayment).toBe(1);
    expect(s.activeHolds).toBe(1);
    expect(s.upcomingCheckIns).toHaveLength(1);
    expect(s.upcomingCheckOuts).toHaveLength(1);
    expect(s.confirmedValuePaise).toBe(700_000);
    expect(s.outstandingPaise).toBe(490_000); // 70% of ₹7,000
  });

  it("calendar shows bookings, holds and blocks per room", async () => {
    const roomId = (await db.room.findFirstOrThrow({ where: { name: "Hillside 101" } })).id;
    await blockRoomDates(db, { roomId, checkIn: d(3), checkOut: d(5), note: "Painting" });
    await createBookingHold(db, {
      roomTypeSlug: "hillside-room",
      checkIn: d(3),
      checkOut: d(4),
      adults: 1,
      children: 0,
      guest,
    });
    const cal = await getCalendar(db, today, 14);
    const room101 = cal.find((r) => r.name === "Hillside 101")!;
    expect(room101.entries.map((e) => e.status)).toEqual(["BLOCKED"]);
    const held = cal.flatMap((r) => r.entries).filter((e) => e.status === "HELD");
    expect(held).toHaveLength(1);
    expect(held[0].label).toContain(guest.name);
  });
});
