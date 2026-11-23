"use client";

import { AdminForm, SubmitButton, TextField } from "@/components/admin/form";
import { signIn } from "../auth-actions";

export function LoginForm({ next }: { next?: string }) {
  return (
    <AdminForm action={signIn} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField name="email" label="Email" type="email" autoComplete="username" required />
      <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
      <div className="pt-2">
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </div>
    </AdminForm>
  );
}
