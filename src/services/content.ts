import "server-only";
import { unstable_cache } from "next/cache";
import { siteConfig } from "@/config/site";
import { getDb } from "@/lib/db";
import type {
  Activity,
  Facility,
  GalleryItem,
  IconName,
  ImageAsset,
  Place,
  RoomType,
  SiteSettings,
  Testimonial,
} from "@/types/content";

/**
 * Content service — the single entry point pages use to read website content.
 *
 * Results are cached (they change only when an admin edits them) and tagged so
 * the admin dashboard can refresh exactly what changed with `revalidateTag()`.
 * A 1-hour time-based refresh is a safety net. Booking, availability and
 * payment data never go through this cache.
 */

export const CONTENT_TAGS = {
  settings: "content:settings",
  rooms: "content:rooms",
  facilities: "content:facilities",
  activities: "content:activities",
  places: "content:places",
  gallery: "content:gallery",
  testimonials: "content:testimonials",
} as const;

const REVALIDATE_SECONDS = 3600;

/* ----------------------------------------------------------- JSON helpers */

function asImage(value: unknown): ImageAsset | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.src !== "string" || typeof v.alt !== "string") return undefined;
  return {
    src: v.src,
    alt: v.alt,
    isPlaceholder: v.isPlaceholder === true,
    credit: v.credit && typeof v.credit === "object" ? (v.credit as ImageAsset["credit"]) : undefined,
  };
}

function asImages(value: unknown): ImageAsset[] {
  return Array.isArray(value) ? value.map(asImage).filter((i): i is ImageAsset => Boolean(i)) : [];
}

const money = (d: { toFixed(dp: number): string }) => Number(d.toFixed(2));

/* --------------------------------------------------------------- Loaders */

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const db = await getDb();
    const s = await db.siteSetting.findUnique({ where: { id: 1 } });
    if (!s) throw new Error("Site settings are missing — run the database seed (npm run db:seed).");
    return {
      name: s.resortName,
      shortName: s.shortName,
      tagline: s.tagline,
      description: s.description,
      url: siteConfig.url,
      locale: siteConfig.locale,
      location: s.locationName,
      isPlaceholder: s.isPlaceholder,
      contact: {
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        address: s.address,
        mapsUrl: s.mapsUrl,
      },
      geo:
        s.latitude !== null && s.longitude !== null
          ? { latitude: Number(s.latitude), longitude: Number(s.longitude) }
          : null,
      checkInTime: s.checkInTime,
      checkOutTime: s.checkOutTime,
      bookingPolicy: s.bookingPolicy,
      cancellationPolicy: s.cancellationPolicy,
      advancePercent: s.advancePercent,
    };
  },
  ["site-settings"],
  { tags: [CONTENT_TAGS.settings], revalidate: REVALIDATE_SECONDS },
);

export const getRoomTypes = unstable_cache(
  async (): Promise<RoomType[]> => {
    const db = await getDb();
    const rows = await db.roomType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { amenities: { include: { amenity: true }, orderBy: { sortOrder: "asc" } } },
    });
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      summary: r.summary,
      description: r.description,
      pricePerNight: money(r.basePrice),
      maxAdults: r.maxAdults,
      maxChildren: r.maxChildren,
      maxOccupancy: r.maxOccupancy,
      bedConfiguration: r.bedConfiguration,
      sizeSqFt: r.sizeSqFt ?? undefined,
      amenities: r.amenities.map((a) => ({ name: a.amenity.name, icon: a.amenity.icon as IconName })),
      images: asImages(r.images),
      isPlaceholder: r.isPlaceholder,
    }));
  },
  ["room-types"],
  { tags: [CONTENT_TAGS.rooms], revalidate: REVALIDATE_SECONDS },
);

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  return (await getRoomTypes()).find((r) => r.slug === slug) ?? null;
}

export const getFacilities = unstable_cache(
  async (): Promise<Facility[]> => {
    const db = await getDb();
    const rows = await db.facility.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] });
    return rows.map((f) => ({
      slug: f.slug,
      name: f.name,
      description: f.description,
      icon: f.icon as IconName,
      image: asImage(f.image),
      isPlaceholder: f.isPlaceholder,
    }));
  },
  ["facilities"],
  { tags: [CONTENT_TAGS.facilities], revalidate: REVALIDATE_SECONDS },
);

export const getActivities = unstable_cache(
  async (): Promise<Activity[]> => {
    const db = await getDb();
    const rows = await db.activity.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] });
    return rows.map((a) => ({
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      description: a.description,
      duration: a.duration,
      // null = included with the stay; undefined = price on request
      priceFrom: a.priceIncluded ? null : a.priceFrom ? money(a.priceFrom) : undefined,
      priceNote: a.priceNote ?? undefined,
      images: asImages(a.images),
      category: a.category.toLowerCase() as Activity["category"],
      isPlaceholder: a.isPlaceholder,
    }));
  },
  ["activities"],
  { tags: [CONTENT_TAGS.activities], revalidate: REVALIDATE_SECONDS },
);

const getPlaces = unstable_cache(
  async (): Promise<(Place & { kind: "NEARBY" | "ATTRACTION" })[]> => {
    const db = await getDb();
    const rows = await db.place.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }] });
    return rows.flatMap((p) => {
      const image = asImage(p.image);
      if (!image) return [];
      return [
        {
          kind: p.kind,
          slug: p.slug,
          name: p.name,
          description: p.description,
          distance: p.distance,
          travelTime: p.travelTime,
          location: p.location,
          image,
          directionsUrl: p.directionsUrl,
          isPlaceholder: p.isPlaceholder,
        },
      ];
    });
  },
  ["places"],
  { tags: [CONTENT_TAGS.places], revalidate: REVALIDATE_SECONDS },
);

export async function getNearbyPlaces(): Promise<Place[]> {
  return (await getPlaces()).filter((p) => p.kind === "NEARBY");
}

export async function getAttractions(): Promise<Place[]> {
  return (await getPlaces()).filter((p) => p.kind === "ATTRACTION");
}

export const getTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    const db = await getDb();
    // Placeholder testimonials are never shown in production builds:
    // publishing invented reviews would mislead visitors.
    const includePlaceholders = process.env.NEXT_PUBLIC_SHOW_SAMPLE_BADGES === "true";
    const rows = await db.testimonial.findMany({
      where: { isActive: true, ...(includePlaceholders ? {} : { isPlaceholder: false }) },
      orderBy: [{ sortOrder: "asc" }],
    });
    return rows.map((t) => ({
      quote: t.quote,
      author: t.author,
      context: t.context ?? undefined,
      isPlaceholder: t.isPlaceholder,
    }));
  },
  ["testimonials"],
  { tags: [CONTENT_TAGS.testimonials], revalidate: REVALIDATE_SECONDS },
);

export const getGallery = unstable_cache(
  async (): Promise<GalleryItem[]> => {
    const db = await getDb();
    const rows = await db.galleryImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }],
    });
    return rows.map((g) => ({
      src: g.src,
      alt: g.alt,
      caption: g.caption ?? undefined,
      isPlaceholder: g.isPlaceholder,
      credit: (g.credit as ImageAsset["credit"]) ?? undefined,
    }));
  },
  ["gallery"],
  { tags: [CONTENT_TAGS.gallery], revalidate: REVALIDATE_SECONDS },
);
