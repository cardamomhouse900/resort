"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { actionError, parseForm, type FormState } from "@/lib/form";
import { blockSchema } from "@/lib/validation-admin";
import { blockRoomDates, unblockRoomDates } from "@/services/booking";

export async function blockDatesAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = parseForm(blockSchema, form);
  if (parsed.state) return parsed.state;
  try {
    await blockRoomDates(await getDb(), {
      ...parsed.data,
      note: `${parsed.data.note ?? "Blocked"} — ${admin.name}`,
    });
  } catch (e) {
    return actionError(e);
  }
  revalidatePath("/admin/availability");
  return { ok: true, message: "Dates blocked. They are no longer bookable online." };
}

export async function unblockDatesAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("reservationId"));
  if (!id.success) return { ok: false, message: "Invalid block." };
  try {
    await unblockRoomDates(await getDb(), id.data);
  } catch (e) {
    return actionError(e);
  }
  revalidatePath("/admin/availability");
  return { ok: true, message: "Block removed." };
}
