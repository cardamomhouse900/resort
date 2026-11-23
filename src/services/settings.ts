import "server-only";
import type { Db, Tx } from "@/lib/db";

/** Rules the booking engine needs. Always read fresh — never cached. */
export type BookingSettings = {
  advancePercent: number;
  holdMinutes: number;
  taxPercent: number;
  pricesIncludeTax: boolean;
  minNights: number;
  maxNights: number;
  bookingWindowDays: number;
};

export async function getBookingSettings(db: Db | Tx): Promise<BookingSettings> {
  const s = await db.siteSetting.findUnique({
    where: { id: 1 },
    select: {
      advancePercent: true,
      holdMinutes: true,
      taxPercent: true,
      pricesIncludeTax: true,
      minNights: true,
      maxNights: true,
      bookingWindowDays: true,
    },
  });
  if (!s) throw new Error("Site settings are missing — run the database seed (npm run db:seed).");
  return { ...s, taxPercent: Number(s.taxPercent.toFixed(2)) };
}
