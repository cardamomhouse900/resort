import "server-only";
import { siteConfig } from "@/config/site";
import * as data from "@/content/placeholder-data";
import type { Activity, Facility, GalleryItem, Place, RoomType, Testimonial } from "@/types/content";

/**
 * Content service — the single entry point pages use to read website content.
 *
 * Phase 2: returns typed placeholder data.
 * Phase 3: the same functions read from PostgreSQL via Prisma, wrapped in
 * `unstable_cache` with tags (e.g. "rooms", "facilities") that the admin
 * dashboard revalidates after every edit. Pages do not change.
 */

export async function getSiteSettings() {
  return siteConfig;
}

export async function getRoomTypes(): Promise<RoomType[]> {
  return data.roomTypes;
}

export async function getRoomTypeBySlug(slug: string): Promise<RoomType | null> {
  return data.roomTypes.find((r) => r.slug === slug) ?? null;
}

export async function getFacilities(): Promise<Facility[]> {
  return data.facilities;
}

export async function getActivities(): Promise<Activity[]> {
  return data.activities;
}

export async function getNearbyPlaces(): Promise<Place[]> {
  return data.nearbyPlaces;
}

export async function getAttractions(): Promise<Place[]> {
  return data.attractions;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  // Placeholder testimonials are never shown in production builds:
  // publishing invented reviews would mislead visitors.
  const all = data.testimonials;
  return process.env.NEXT_PUBLIC_SHOW_SAMPLE_BADGES === "true" ? all : all.filter((t) => !t.isPlaceholder);
}

export async function getGallery(): Promise<GalleryItem[]> {
  return data.gallery;
}
