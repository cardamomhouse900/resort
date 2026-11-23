import { config } from "dotenv";
import { createDb, type Db } from "@/lib/db";
import { seed } from "../../prisma/seed";

config({ path: ".env.local", quiet: true });

export function testDb(): Db {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:54329/resort_test";
  if (!/test/i.test(url)) throw new Error(`Refusing to use a non-test database: ${url}`);
  return createDb(url);
}

/** Empties every table and re-seeds the placeholder content. */
export async function resetAndSeed(db: Db) {
  await db.$executeRawUnsafe(`
    TRUNCATE "reservations", "payments", "bookings", "pricing_rules", "room_type_amenities",
             "rooms", "room_types", "amenities", "facilities", "activities", "places",
             "gallery_images", "testimonials", "contact_inquiries", "webhook_events",
             "admins", "site_settings", "refunds" RESTART IDENTITY CASCADE`);
  await seed(db);
}
