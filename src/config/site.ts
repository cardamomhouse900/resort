/**
 * Static site configuration.
 *
 * Business details (name, contact, address, policies) now live in the
 * `site_settings` database table and are edited in the admin dashboard.
 * The `placeholderSettings` below are only used to SEED a fresh database —
 * they are temporary sample values, not real business information.
 */
export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_IN",
} as const;

export const showSampleBadges = process.env.NEXT_PUBLIC_SHOW_SAMPLE_BADGES === "true";

/** PLACEHOLDER business details used by prisma/seed.ts. */
export const placeholderSettings = {
  resortName: "Greenridge Mountain Resort",
  shortName: "Greenridge",
  tagline: "Find Your Escape in the Mountains.",
  description:
    "A peaceful mountain getaway surrounded by lush greenery, scenic landscapes, comfortable cottages and outdoor experiences for families and friends.",
  locationName: "[Location to be confirmed]",
  address: "Sample address line, [Town], [District], [State] – 000000",
  phone: "+91 00000 00000",
  whatsapp: "+91 00000 00000",
  email: "hello@example.com",
  advancePercent: 30,
  holdMinutes: 15,
  taxPercent: 0,
  pricesIncludeTax: true,
  minNights: 1,
  maxNights: 14,
  bookingWindowDays: 365,
  checkInTime: "13:00",
  checkOutTime: "11:00",
  bookingPolicy:
    "SAMPLE POLICY — A 30% advance confirms your booking; the balance is paid at the resort on arrival. Valid photo ID is required at check-in for every adult guest.",
  cancellationPolicy:
    "SAMPLE POLICY — Cancellations made 7 or more days before check-in receive a full refund of the advance. Cancellations within 7 days of check-in are non-refundable. This text will be replaced with the resort's actual policy.",
  isPlaceholder: true,
};
