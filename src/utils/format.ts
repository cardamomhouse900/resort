const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹5,000 style formatting (Indian digit grouping). */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** Human-readable activity price: a number, "included" (null) or "on request" (undefined). */
export function activityPriceLabel(priceFrom: number | null | undefined, note?: string): string {
  if (priceFrom === null)
    return note ? note.charAt(0).toUpperCase() + note.slice(1) : "Included with your stay";
  if (priceFrom === undefined) return "Price on request";
  return `From ${formatINR(priceFrom)}${note ? ` ${note}` : ""}`;
}

/** Google Maps directions link for a destination name or "lat,lng". */
export function directionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Digits-only phone number for tel: and wa.me links. */
export function phoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
