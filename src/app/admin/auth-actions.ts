"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { findActiveAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { FormState } from "@/lib/form";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeAdminRedirect } from "@/lib/safe-redirect";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Admin login is not configured yet (Supabase keys are missing)." };
  }
  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit("RL_LOGIN", ip))) {
    return { ok: false, message: "Too many sign-in attempts. Please wait a minute and try again." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Enter your email address and password." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Same message for unknown email and wrong password — don't reveal which accounts exist.
  if (error || !data.user) return { ok: false, message: "Incorrect email or password." };

  const admin = await findActiveAdmin(await getDb(), data.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    return { ok: false, message: "This account does not have access to the admin dashboard." };
  }

  redirect(safeAdminRedirect(parsed.data.next));
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
