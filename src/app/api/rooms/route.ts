import { handle } from "@/lib/api";
import { getRoomTypes } from "@/services/content";
import { NextResponse } from "next/server";

/**
 * GET /api/rooms — public list of active room types (content only; no
 * availability). Served from the content cache, refreshed when an admin edits rooms.
 */
export const GET = handle(async () => {
  const rooms = await getRoomTypes();
  return NextResponse.json(
    { rooms },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" } },
  );
});
