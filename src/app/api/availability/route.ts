import { enforceRateLimit, handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { availabilitySchema } from "@/lib/validation";
import { searchAvailability } from "@/services/booking";

/**
 * POST /api/availability
 * { checkIn, checkOut, adults, children, roomType? }
 * → { nights, options: [{ roomType, availableUnits, fitsGuests, quote }] }
 *
 * Always computed live from the database; prices are calculated server-side.
 */
export const POST = handle(async (req) => {
  await enforceRateLimit(req, "RL_AVAILABILITY");
  const body = await readJson(req, availabilitySchema);
  const db = await getDb();
  const result = await searchAvailability(db, { ...body, roomTypeSlug: body.roomType });
  return json(result);
});
