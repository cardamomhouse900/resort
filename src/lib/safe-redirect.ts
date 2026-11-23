/**
 * Where to send an admin after signing in. Only paths inside /admin are
 * allowed, which prevents open redirects such as ?next=https://evil.example
 * or ?next=//evil.example.
 */
export function safeAdminRedirect(next: string | undefined | null): string {
  if (!next || next.length > 200) return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9\-/]*)?$/.test(next) || next.includes("//")) return "/admin";
  if (next === "/admin/login" || next.startsWith("/admin/login/")) return "/admin";
  return next;
}
