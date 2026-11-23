import { z } from "zod";
import { isISODate } from "@/utils/dates";

/**
 * Input schemas for admin forms. Even though admins are trusted users, every
 * value is validated on the server: it protects the public site from mistakes
 * and limits damage if an admin account is ever compromised.
 */

/** Images may only come from our image CDN (or the development placeholders). */
export const ALLOWED_IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com"];

const imageUrl = z
  .url({ protocol: /^https$/, message: "Use an https:// image URL." })
  .refine((u) => ALLOWED_IMAGE_HOSTS.includes(new URL(u).hostname), {
    message: `Images must be hosted on ${ALLOWED_IMAGE_HOSTS.join(" or ")}.`,
  });

export const imageSchema = z.object({
  src: imageUrl,
  alt: z
    .string()
    .trim()
    .min(5, "Describe the image (at least 5 characters) for accessibility and SEO.")
    .max(200),
  isPlaceholder: z.boolean().default(false),
  credit: z
    .object({ name: z.string().max(100), url: z.url().max(300), source: z.enum(["Unsplash", "Resort"]) })
    .optional(),
});
export type ImageInput = z.infer<typeof imageSchema>;

const jsonArray = <T extends z.ZodType>(item: T) =>
  z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s || "[]");
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid list." });
        return z.NEVER;
      }
    })
    .pipe(z.array(item));

const optionalJsonImage = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid image." });
      return z.NEVER;
    }
  })
  .pipe(imageSchema.nullable());

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens (e.g. valley-view-cottage).",
  );
const text = (max: number, min = 1) => z.string().trim().min(min, "Required.").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const rupees = z.coerce.number().min(0).max(10_000_000).multipleOf(0.01, "Use at most 2 decimal places.");
const isoDate = z.string().refine(isISODate, "Choose a valid date.");

export const roomTypeSchema = z
  .object({
    slug,
    name: text(100, 2),
    summary: text(300, 10),
    description: text(5000, 10).transform((t) =>
      t
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    ),
    basePrice: rupees.refine((v) => v > 0, "Price must be more than zero."),
    maxAdults: int(1, 20),
    maxChildren: int(0, 20),
    maxOccupancy: int(1, 40),
    bedConfiguration: text(150, 3),
    sizeSqFt: z.preprocess((v) => (v === "" ? undefined : v), int(50, 20_000).optional()),
    sortOrder: int(0, 1000).default(0),
    isActive: checkbox,
    isPlaceholder: checkbox,
    images: jsonArray(imageSchema).refine((a) => a.length > 0, "Add at least one photo."),
    amenityIds: z.array(z.uuid()).default([]),
  })
  .refine((v) => v.maxOccupancy <= v.maxAdults + v.maxChildren, {
    message: "Max occupancy cannot exceed max adults + max children.",
    path: ["maxOccupancy"],
  });

export const roomUnitSchema = z.object({ name: text(60, 1), notes: optionalText(300) });

export const pricingRuleSchema = z
  .object({
    name: text(80, 2),
    startDate: isoDate,
    endDate: isoDate,
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    pricePerNight: rupees.refine((v) => v > 0, "Price must be more than zero."),
    priority: int(0, 100).default(0),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export const amenitySchema = z.object({ name: text(60, 2), icon: text(40) });

export const facilitySchema = z.object({
  slug,
  name: text(80, 2),
  description: text(600, 10),
  icon: text(40),
  image: optionalJsonImage,
  sortOrder: int(0, 1000).default(0),
  isActive: checkbox,
  isPlaceholder: checkbox,
});

export const activitySchema = z.object({
  slug,
  title: text(100, 2),
  summary: text(300, 10),
  description: text(3000, 10),
  duration: text(60),
  pricing: z.enum(["included", "from", "on-request"]),
  priceFrom: z.preprocess((v) => (v === "" ? undefined : v), rupees.optional()),
  priceNote: optionalText(120),
  category: z.enum(["ADVENTURE", "RELAXATION", "FAMILY", "NATURE"]),
  images: jsonArray(imageSchema).refine((a) => a.length > 0, "Add at least one photo."),
  sortOrder: int(0, 1000).default(0),
  isActive: checkbox,
  isPlaceholder: checkbox,
});

export const placeSchema = z.object({
  slug,
  kind: z.enum(["NEARBY", "ATTRACTION"]),
  name: text(100, 2),
  description: text(1000, 10),
  distance: text(40),
  travelTime: text(40),
  location: text(120),
  image: optionalJsonImage.refine((i) => i !== null, "Add a photo."),
  directionsUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .pipe(
      z
        .url()
        .refine((u) => /^https:\/\/(www\.)?google\.[a-z.]+\/maps|^https:\/\/maps\.app\.goo\.gl\//.test(u), {
          message: "Use a Google Maps link.",
        })
        .nullable(),
    ),
  sortOrder: int(0, 1000).default(0),
  isActive: checkbox,
  isPlaceholder: checkbox,
});

export const galleryImageSchema = z.object({
  image: optionalJsonImage.refine((i) => i !== null, "Add a photo."),
  caption: optionalText(120),
  sortOrder: int(0, 1000).default(0),
  isActive: checkbox,
});

export const testimonialSchema = z.object({
  quote: text(800, 10),
  author: text(80, 2),
  context: optionalText(80),
  sortOrder: int(0, 1000).default(0),
  isActive: checkbox,
  isPlaceholder: checkbox,
});

/** Optional decimal coordinate; empty means "not set". */
const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().min(-limit).max(limit).nullable());

export const settingsSchema = z
  .object({
    resortName: text(100, 2),
    shortName: text(40, 2),
    tagline: text(120, 5),
    description: text(400, 20),
    locationName: text(120, 2),
    address: text(300, 5),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Enter a valid phone number."),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Enter a valid WhatsApp number."),
    email: z.email(),
    mapsUrl: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .pipe(z.url().nullable()),
    latitude: coordinate(90),
    longitude: coordinate(180),
    advancePercent: int(1, 100),
    holdMinutes: int(5, 60),
    taxPercent: z.coerce.number().min(0).max(99.99),
    pricesIncludeTax: checkbox,
    minNights: int(1, 30),
    maxNights: int(1, 60),
    bookingWindowDays: int(1, 730),
    checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
    checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM."),
    bookingPolicy: text(3000, 20),
    cancellationPolicy: text(3000, 20),
    isPlaceholder: checkbox,
  })
  .refine((v) => v.maxNights >= v.minNights, {
    message: "Must be at least the minimum nights.",
    path: ["maxNights"],
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    message: "Enter both latitude and longitude, or leave both empty.",
    path: ["longitude"],
  });

export const blockSchema = z
  .object({
    roomId: z.uuid(),
    checkIn: isoDate,
    checkOut: isoDate,
    note: optionalText(200),
  })
  .refine((v) => v.checkOut > v.checkIn, {
    message: "End date must be after the start date.",
    path: ["checkOut"],
  });

export const cancelSchema = z.object({
  bookingId: z.uuid(),
  reason: text(300, 3),
});

export const bookingFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"]).optional().catch(undefined),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
