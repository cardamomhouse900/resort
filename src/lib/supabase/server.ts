import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** True once real Supabase keys are configured (not the .env.example placeholders). */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !url.includes("PROJECT_REF") && key.length > 30;
}

/**
 * Supabase client bound to the request's cookies (Server Components, Server
 * Actions, Route Handlers). Uses only the public anon key — the admin session
 * comes from the user's own cookies; no service-role key is involved.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The proxy refreshes the session on the next request instead.
          }
        },
      },
    },
  );
}
