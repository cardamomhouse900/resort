"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { actionError, type FormState } from "@/lib/form";
import { setInquiryStatus } from "@/services/admin/content";

const schema = z.object({ id: z.uuid(), status: z.enum(["NEW", "REPLIED", "ARCHIVED"]) });

export async function setInquiryStatusAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  try {
    await setInquiryStatus(await getDb(), parsed.data.id, parsed.data.status);
  } catch (e) {
    return actionError(e);
  }
  revalidatePath("/admin", "layout"); // updates the unread badge in the sidebar too
  return { ok: true };
}
