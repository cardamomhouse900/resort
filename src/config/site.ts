/**
 * PLACEHOLDER business details.
 *
 * These are temporary values used until the real resort information is
 * available. From Phase 3 onward they live in the `SiteSetting` database table
 * (editable in the admin dashboard); this file then only seeds the database
 * and acts as a build-time fallback.
 *
 * Do NOT publish these values as real business information.
 */
export const siteConfig = {
  name: "Greenridge Mountain Resort",
  shortName: "Greenridge",
  isPlaceholder: true,
  tagline: "Find Your Escape in the Mountains.",
  description:
    "A peaceful mountain getaway surrounded by lush greenery, scenic landscapes, comfortable cottages and outdoor experiences for families and friends.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
  // Location is intentionally generic until verified.
  location: "[Location to be confirmed]",
  contact: {
    phone: "+91 00000 00000",
    whatsapp: "+91 00000 00000",
    email: "hello@example.com",
    address: "Sample address line, [Town], [District], [State] – 000000",
  },
} as const;

export const showSampleBadges = process.env.NEXT_PUBLIC_SHOW_SAMPLE_BADGES === "true";
