"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { actionError, parseForm, type FormState } from "@/lib/form";
import { amenitySchema, pricingRuleSchema, roomTypeSchema, roomUnitSchema } from "@/lib/validation-admin";
import {
  addPricingRule,
  addRoomUnit,
  createAmenity,
  createRoomType,
  deletePricingRule,
  deleteRoomUnit,
  renameRoomUnit,
  setRoomUnitActive,
  updateRoomType,
} from "@/services/admin/rooms";
import { CONTENT_TAGS } from "@/services/content";

const uuid = z.uuid();

/** Refresh the public pages that show rooms, and the admin page itself. */
function refresh(roomTypeId?: string) {
  updateTag(CONTENT_TAGS.rooms);
  revalidatePath("/admin/rooms");
  if (roomTypeId) revalidatePath(`/admin/rooms/${roomTypeId}`);
}

export async function saveRoomTypeAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(roomTypeSchema, form);
  if (parsed.state) return parsed.state;
  const id = form.get("id");
  let createdId: string | undefined;
  try {
    const db = await getDb();
    if (typeof id === "string" && uuid.safeParse(id).success) {
      await updateRoomType(db, id, parsed.data);
    } else {
      createdId = (await createRoomType(db, parsed.data)).id;
    }
  } catch (e) {
    return actionError(e);
  }
  refresh(typeof id === "string" ? id : undefined);
  if (createdId) redirect(`/admin/rooms/${createdId}?created=1`);
  return { ok: true, message: "Saved. The website has been updated." };
}

export async function createAmenityAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = parseForm(amenitySchema, form);
  if (parsed.state) return parsed.state;
  try {
    await createAmenity(await getDb(), parsed.data);
  } catch (e) {
    return actionError(e);
  }
  revalidatePath("/admin/rooms", "layout");
  return { ok: true, message: `Amenity “${parsed.data.name}” added — tick it in the list above.` };
}

export async function addUnitAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const roomTypeId = uuid.parse(form.get("roomTypeId"));
  const parsed = parseForm(roomUnitSchema, form);
  if (parsed.state) return parsed.state;
  try {
    await addRoomUnit(await getDb(), roomTypeId, parsed.data);
  } catch (e) {
    return actionError(e);
  }
  refresh(roomTypeId);
  return { ok: true, message: `Room “${parsed.data.name}” added and now bookable.` };
}

export async function updateUnitAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const roomId = uuid.parse(form.get("roomId"));
  const roomTypeId = uuid.parse(form.get("roomTypeId"));
  const intent = form.get("intent");
  try {
    const db = await getDb();
    if (intent === "activate" || intent === "deactivate") {
      await setRoomUnitActive(db, roomId, intent === "activate");
    } else if (intent === "delete") {
      await deleteRoomUnit(db, roomId);
    } else {
      const parsed = parseForm(roomUnitSchema, form);
      if (parsed.state) return parsed.state;
      await renameRoomUnit(db, roomId, parsed.data);
    }
  } catch (e) {
    return actionError(e);
  }
  refresh(roomTypeId);
  return { ok: true, message: "Room updated." };
}

export async function addPricingRuleAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const roomTypeId = uuid.parse(form.get("roomTypeId"));
  const parsed = parseForm(pricingRuleSchema, form);
  if (parsed.state) return parsed.state;
  try {
    await addPricingRule(await getDb(), roomTypeId, parsed.data);
  } catch (e) {
    return actionError(e);
  }
  refresh(roomTypeId);
  return { ok: true, message: "Pricing rule added. New quotes use it immediately." };
}

export async function deletePricingRuleAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const ruleId = uuid.parse(form.get("ruleId"));
  const roomTypeId = uuid.parse(form.get("roomTypeId"));
  try {
    await deletePricingRule(await getDb(), ruleId);
  } catch (e) {
    return actionError(e);
  }
  refresh(roomTypeId);
  return { ok: true, message: "Pricing rule removed." };
}
