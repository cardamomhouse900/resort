import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getRoomTypes } from "@/services/content";

// Rebuilt hourly, and whenever rooms change (getRoomTypes is tag-revalidated by the admin).
export const revalidate = 3600;

const STATIC_PATHS = [
  "/",
  "/rooms",
  "/facilities",
  "/activities",
  "/nearby-places",
  "/attractions",
  "/contact",
  "/booking",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rooms = await getRoomTypes();
  const url = (path: string) => new URL(path, siteConfig.url).toString();
  return [
    ...STATIC_PATHS.map((p) => ({ url: url(p) })),
    ...rooms.map((r) => ({
      url: url(`/rooms/${r.slug}`),
      images: r.images.filter((i) => !i.isPlaceholder).map((i) => i.src),
    })),
  ];
}
