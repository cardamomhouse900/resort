import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { AdminRole } from "@/generated/prisma/client";
import { getDb, type Db } from "./db";
import { createSupabaseServerClient, isSupabaseConfigured } from "./supabase/server";

export type AdminUser = { id: string; email: string; name: string; role: AdminRole };

/**
 * Authorisation rule, kept separate so it can be unit-tested: a verified
 * Supabase identity is NOT enough — the user must also be an active row in
 * the `admins` table.
 */
export async function findActiveAdmin(db: Db, authUserId: string | undefined): Promise<AdminUser | null> {
  if (!authUserId || !/^[0-9a-f-]{36}$/i.test(authUserId)) return null;
  return db.admin.findFirst({
    where: { authUserId, isActive: true },
    select: { id: true, email: true, name: true, role: true },
  });
}

/**
 * The signed-in admin for this request, or null. `getClaims()` verifies the
 * session JWT's signature (locally via Supabase's published keys), so a forged
 * or expired cookie is rejected. Cached per request.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  // Always render per request: an auth decision must never be prerendered or cached,
  // whatever the configuration (e.g. no Supabase keys at build time).
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return findActiveAdmin(await getDb(), data.claims.sub);
});

/**
 * Guard for every admin page and Server Action. Redirects to the login page
 * when there is no valid admin session; `role: "OWNER"` additionally restricts
 * owner-only areas such as settings.
 */
export async function requireAdmin(options: { role?: AdminRole } = {}): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (options.role === "OWNER" && admin.role !== "OWNER") redirect("/admin?denied=1");
  return admin;
}
