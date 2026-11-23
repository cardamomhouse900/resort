import { expect, type Page } from "@playwright/test";

export const isLive = Boolean(process.env.E2E_BASE_URL);

/**
 * Locally all tests share one IP, so each test gets its own fake client address to stay under
 * the per-IP rate limits. (Cloudflare ignores this header and uses the real address.)
 */
export async function asUniqueClient(page: Page) {
  const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
}

/** Collects console errors, uncaught exceptions and CSP violations for the page's lifetime. */
export function watchForErrors(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    const text = m.text();
    const csp = /Content.Security.Policy|Refused to/i.test(text);
    // Razorpay Checkout's own analytics calls intermittently fail its CORS check; that is their
    // service, not this site. CSP violations are still always reported.
    const fromRazorpay = /razorpay\.com/.test(`${text} ${m.location().url}`);
    if (csp || (m.type() === "error" && !fromRazorpay)) problems.push(text);
  });
  page.on("pageerror", (e) => problems.push(String(e)));
  return {
    problems,
    expectNone: () => expect(problems, problems.join("\n")).toEqual([]),
  };
}

/** YYYY-MM-DD `n` days from today in India (the resort's time zone). */
export function dayFromToday(n: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
