import "server-only";
import type { z } from "zod";
import { Prisma } from "#prisma";
import type { Db } from "@/lib/db";
import type {
  activitySchema,
  facilitySchema,
  galleryImageSchema,
  placeSchema,
  settingsSchema,
  testimonialSchema,
} from "@/lib/validation-admin";

/* Thin, explicit CRUD for website content. Validation happens in the schemas. */

type Facility = z.infer<typeof facilitySchema>;
type Activity = z.infer<typeof activitySchema>;
type Place = z.infer<typeof placeSchema>;
type Gallery = z.infer<typeof galleryImageSchema>;
type Testimonial = z.infer<typeof testimonialSchema>;
type Settings = z.infer<typeof settingsSchema>;

const order = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/* ------------------------------------------------------------ Facilities */
export const facilities = {
  list: (db: Db) => db.facility.findMany({ orderBy: order }),
  get: (db: Db, id: string) => db.facility.findUnique({ where: { id } }),
  save: (db: Db, id: string | null, input: Facility) => {
    // Prisma needs the JsonNull sentinel to store an SQL NULL in a JSON column.
    const data = { ...input, image: input.image ?? Prisma.JsonNull };
    return id ? db.facility.update({ where: { id }, data }) : db.facility.create({ data });
  },
  remove: (db: Db, id: string) => db.facility.delete({ where: { id } }),
};

/* ------------------------------------------------------------ Activities */
function activityData(input: Activity) {
  const { pricing, priceFrom, ...rest } = input;
  return {
    ...rest,
    priceIncluded: pricing === "included",
    priceFrom: pricing === "from" && priceFrom !== undefined ? priceFrom.toFixed(2) : null,
  };
}
export const activities = {
  list: (db: Db) => db.activity.findMany({ orderBy: order }),
  get: (db: Db, id: string) => db.activity.findUnique({ where: { id } }),
  save: (db: Db, id: string | null, input: Activity) =>
    id
      ? db.activity.update({ where: { id }, data: activityData(input) })
      : db.activity.create({ data: activityData(input) }),
  remove: (db: Db, id: string) => db.activity.delete({ where: { id } }),
};

/* ------------------------------------------------------- Places & sights */
export const places = {
  list: (db: Db) => db.place.findMany({ orderBy: [{ kind: "asc" }, ...order] }),
  get: (db: Db, id: string) => db.place.findUnique({ where: { id } }),
  save: (db: Db, id: string | null, input: Place) => {
    const data = { ...input, image: input.image! };
    return id ? db.place.update({ where: { id }, data }) : db.place.create({ data });
  },
  remove: (db: Db, id: string) => db.place.delete({ where: { id } }),
};

/* --------------------------------------------------------------- Gallery */
export const gallery = {
  list: (db: Db) => db.galleryImage.findMany({ orderBy: order }),
  get: (db: Db, id: string) => db.galleryImage.findUnique({ where: { id } }),
  save: (db: Db, id: string | null, input: Gallery) => {
    const img = input.image!;
    const data = {
      src: img.src,
      alt: img.alt,
      isPlaceholder: img.isPlaceholder,
      credit: img.credit ?? undefined,
      caption: input.caption,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
    return id ? db.galleryImage.update({ where: { id }, data }) : db.galleryImage.create({ data });
  },
  remove: (db: Db, id: string) => db.galleryImage.delete({ where: { id } }),
};

/* ---------------------------------------------------------- Testimonials */
export const testimonials = {
  list: (db: Db) => db.testimonial.findMany({ orderBy: order }),
  get: (db: Db, id: string) => db.testimonial.findUnique({ where: { id } }),
  save: (db: Db, id: string | null, input: Testimonial) =>
    id ? db.testimonial.update({ where: { id }, data: input }) : db.testimonial.create({ data: input }),
  remove: (db: Db, id: string) => db.testimonial.delete({ where: { id } }),
};

/* -------------------------------------------------------------- Settings */
export async function getSettingsForEdit(db: Db) {
  return db.siteSetting.findUniqueOrThrow({ where: { id: 1 } });
}

export async function updateSettings(db: Db, input: Settings) {
  await db.siteSetting.update({
    where: { id: 1 },
    data: {
      ...input,
      taxPercent: input.taxPercent.toFixed(2),
      latitude: input.latitude?.toFixed(6) ?? null,
      longitude: input.longitude?.toFixed(6) ?? null,
    },
  });
}

/* ------------------------------------------------------------- Inquiries */
export async function listInquiries(db: Db, status?: "NEW" | "REPLIED" | "ARCHIVED") {
  return db.contactInquiry.findMany({
    where: status ? { status } : { status: { in: ["NEW", "REPLIED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function setInquiryStatus(db: Db, id: string, status: "NEW" | "REPLIED" | "ARCHIVED") {
  await db.contactInquiry.update({ where: { id }, data: { status } });
}
