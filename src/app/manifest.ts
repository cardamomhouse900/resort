import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/services/content";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSiteSettings();
  return {
    name: s.name,
    short_name: s.shortName,
    description: s.description,
    start_url: "/",
    display: "browser",
    background_color: "#F7F5ED",
    theme_color: "#244A35",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
