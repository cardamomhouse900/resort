import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb, type Db } from "@/lib/db";
import { actionError, parseForm, type FormState } from "@/lib/form";
import {
  activitySchema,
  facilitySchema,
  galleryImageSchema,
  placeSchema,
  testimonialSchema,
} from "@/lib/validation-admin";
import { activities, facilities, gallery, places, testimonials } from "@/services/admin/content";
import { CONTENT_TAGS } from "@/services/content";

/**
 * Shared implementation for the content Server Actions (see content-actions.ts).
 * Every call checks admin access, validates input, saves, refreshes the public
 * pages that show this content, and refreshes the admin list.
 */

type Repo = {
  save: (db: Db, id: string | null, input: never) => Promise<{ id: string }>;
  remove: (db: Db, id: string) => Promise<unknown>;
};

const CONFIG = {
  facilities: {
    schema: facilitySchema,
    repo: facilities,
    tag: CONTENT_TAGS.facilities,
    path: "/admin/facilities",
  },
  activities: {
    schema: activitySchema,
    repo: activities,
    tag: CONTENT_TAGS.activities,
    path: "/admin/activities",
  },
  places: { schema: placeSchema, repo: places, tag: CONTENT_TAGS.places, path: "/admin/places" },
  gallery: { schema: galleryImageSchema, repo: gallery, tag: CONTENT_TAGS.gallery, path: "/admin/gallery" },
  testimonials: {
    schema: testimonialSchema,
    repo: testimonials,
    tag: CONTENT_TAGS.testimonials,
    path: "/admin/testimonials",
  },
} as const;

export type ContentKind = keyof typeof CONFIG;

const uuid = z.uuid();

export async function saveContent(kind: ContentKind, form: FormData): Promise<FormState> {
  await requireAdmin();
  const c = CONFIG[kind];
  const parsed = parseForm(c.schema as z.ZodType, form);
  if (parsed.state) return parsed.state;

  const rawId = form.get("id");
  const id = typeof rawId === "string" && uuid.safeParse(rawId).success ? rawId : null;
  let savedId: string;
  try {
    savedId = (await (c.repo as unknown as Repo).save(await getDb(), id, parsed.data as never)).id;
  } catch (e) {
    return actionError(e);
  }
  updateTag(c.tag);
  revalidatePath(c.path);
  if (!id) redirect(`${c.path}/${savedId}?created=1`);
  return { ok: true, message: "Saved. The website has been updated." };
}

export async function deleteContent(kind: ContentKind, form: FormData): Promise<FormState> {
  await requireAdmin();
  const c = CONFIG[kind];
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "Invalid item." };
  try {
    await (c.repo as unknown as Repo).remove(await getDb(), id.data);
  } catch (e) {
    return actionError(e);
  }
  updateTag(c.tag);
  revalidatePath(c.path);
  redirect(`${c.path}?deleted=1`);
}
