import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mountain } from "lucide-react";
import { getCurrentAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentAdmin()) redirect("/admin");
  const next = (await searchParams).next;
  const configured = isSupabaseConfigured();

  return (
    <main className="bg-forest flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="bg-cream w-full max-w-md rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-2">
          <Mountain className="text-olive size-7" aria-hidden="true" />
          <h1 className="text-h3">Admin sign in</h1>
        </div>
        {configured ? (
          <LoginForm next={typeof next === "string" ? next : undefined} />
        ) : (
          <div className="bg-earth/10 text-earth mt-6 rounded-lg p-4 text-sm">
            <p className="font-semibold">Admin login is not configured yet.</p>
            <p className="mt-2">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> from
              your Supabase project to the environment, then add an admin with <code>npm run admin:add</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
