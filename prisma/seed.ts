/**
 * Seeds a fresh database with the PLACEHOLDER content used during development.
 *   npm run db:seed
 *
 * Idempotent: content is upserted by slug, so re-running is safe. Gallery and
 * testimonials (no natural key) are inserted only when their table is empty,
 * so edits made in the admin dashboard are never overwritten.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { placeholderSettings } from "../src/config/site";
import {
  activities,
  attractions,
  facilities,
  gallery,
  nearbyPlaces,
  roomTypes,
  testimonials,
} from "../src/content/placeholder-data";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

/** Sample number of physical units per room type — replace with the real inventory. */
const SAMPLE_UNITS: Record<string, string[]> = {
  "valley-view-cottage": ["Valley View 1", "Valley View 2", "Valley View 3"],
  "forest-family-cottage": ["Forest Family 1", "Forest Family 2"],
  "hillside-room": ["Hillside 101", "Hillside 102", "Hillside 103", "Hillside 104"],
};

export async function seed(db: PrismaClient) {
  await db.siteSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...placeholderSettings },
    update: {}, // never overwrite settings edited in the dashboard
  });

  for (const [i, rt] of roomTypes.entries()) {
    const data = {
      name: rt.name,
      summary: rt.summary,
      description: rt.description,
      basePrice: rt.pricePerNight.toFixed(2),
      maxAdults: rt.maxAdults,
      maxChildren: rt.maxChildren,
      maxOccupancy: rt.maxOccupancy,
      bedConfiguration: rt.bedConfiguration,
      sizeSqFt: rt.sizeSqFt ?? null,
      images: rt.images,
      sortOrder: i,
      isPlaceholder: rt.isPlaceholder,
    };
    const roomType = await db.roomType.upsert({
      where: { slug: rt.slug },
      create: { slug: rt.slug, ...data },
      update: {},
    });

    for (const [j, a] of rt.amenities.entries()) {
      const amenity = await db.amenity.upsert({
        where: { name: a.name },
        create: { name: a.name, icon: a.icon },
        update: {},
      });
      await db.roomTypeAmenity.upsert({
        where: { roomTypeId_amenityId: { roomTypeId: roomType.id, amenityId: amenity.id } },
        create: { roomTypeId: roomType.id, amenityId: amenity.id, sortOrder: j },
        update: {},
      });
    }

    for (const name of SAMPLE_UNITS[rt.slug] ?? [`${rt.name} 1`]) {
      await db.room.upsert({
        where: { roomTypeId_name: { roomTypeId: roomType.id, name } },
        create: { roomTypeId: roomType.id, name, notes: "Sample unit — replace with real inventory" },
        update: {},
      });
    }
  }

  for (const [i, f] of facilities.entries()) {
    await db.facility.upsert({
      where: { slug: f.slug },
      create: {
        slug: f.slug,
        name: f.name,
        description: f.description,
        icon: f.icon,
        image: f.image ?? undefined,
        sortOrder: i,
        isPlaceholder: f.isPlaceholder,
      },
      update: {},
    });
  }

  for (const [i, a] of activities.entries()) {
    await db.activity.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        description: a.description,
        duration: a.duration,
        priceFrom: typeof a.priceFrom === "number" ? a.priceFrom.toFixed(2) : null,
        priceIncluded: a.priceFrom === null,
        priceNote: a.priceNote ?? null,
        category: a.category.toUpperCase() as "ADVENTURE" | "RELAXATION" | "FAMILY" | "NATURE",
        images: a.images,
        sortOrder: i,
        isPlaceholder: a.isPlaceholder,
      },
      update: {},
    });
  }

  const places = [
    ...nearbyPlaces.map((p) => ({ ...p, kind: "NEARBY" as const })),
    ...attractions.map((p) => ({ ...p, kind: "ATTRACTION" as const })),
  ];
  for (const [i, p] of places.entries()) {
    await db.place.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        kind: p.kind,
        name: p.name,
        description: p.description,
        distance: p.distance,
        travelTime: p.travelTime,
        location: p.location,
        image: p.image,
        directionsUrl: p.directionsUrl,
        sortOrder: i,
        isPlaceholder: p.isPlaceholder,
      },
      update: {},
    });
  }

  if ((await db.galleryImage.count()) === 0) {
    await db.galleryImage.createMany({
      data: gallery.map((g, i) => ({
        src: g.src,
        alt: g.alt,
        caption: g.caption ?? null,
        credit: g.credit ?? undefined,
        sortOrder: i,
        isPlaceholder: g.isPlaceholder,
      })),
    });
  }

  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: testimonials.map((t, i) => ({
        quote: t.quote,
        author: t.author,
        context: t.context ?? null,
        sortOrder: i,
        isPlaceholder: t.isPlaceholder,
      })),
    });
  }
}

// Run directly (npm run db:seed / prisma db seed) — not when imported by tests.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  seed(db)
    .then(async () => {
      const [types, rooms] = await Promise.all([db.roomType.count(), db.room.count()]);
      console.log(`Seeded: ${types} room types, ${rooms} rooms, settings, content.`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
