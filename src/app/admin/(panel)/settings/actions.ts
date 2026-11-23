"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { actionError, parseForm, type FormState } from "@/lib/form";
import { settingsSchema } from "@/lib/validation-admin";
import { updateSettings } from "@/services/admin/content";
import { CONTENT_TAGS } from "@/services/content";

/** Owner only: business details and booking rules. */
export async function saveSettingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin({ role: "OWNER" });
  const parsed = parseForm(settingsSchema, form);
  if (parsed.state) return parsed.state;
  try {
    await updateSettings(await getDb(), parsed.data);
  } catch (e) {
    return actionError(e);
  }
  updateTag(CONTENT_TAGS.settings);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Settings saved. New bookings use the updated rules immediately." };
}
