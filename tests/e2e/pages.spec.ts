import { expect, test } from "@playwright/test";
import { watchForErrors } from "./helpers";

const PAGES = [
  "/",
  "/rooms",
  "/rooms/valley-view-cottage",
  "/facilities",
  "/activities",
  "/nearby-places",
  "/attractions",
  "/contact",
  "/booking",
];

test.describe("public pages", () => {
  for (const path of PAGES) {
    test(`${path} renders with SEO tags and no errors`, async ({ page }) => {
      const errors = watchForErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page).toHaveTitle(/\S/);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length ?? 0).toBeGreaterThan(50);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(path);
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

      // Every image has alt text (decorative images use alt="").
      expect(await page.locator("img:not([alt])").count()).toBe(0);
      // Nothing overflows the viewport horizontally (catches layout bugs on phones).
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      errors.expectNone();
    });
  }

  test("unknown pages return 404 with a way back", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "Back to the homepage" })).toBeVisible();
  });

  test("mobile menu navigates to a room and on to booking", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile navigation only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Rooms" }).click();
    await expect(page).toHaveURL(/\/rooms$/);
    await page.locator('a[href^="/rooms/"]').first().click();
    await expect(page).toHaveURL(/\/rooms\/[a-z-]+$/);
    await page.getByRole("link", { name: "Book Now" }).first().click();
    await expect(page).toHaveURL(/\/booking\?room=/);
  });

  test("gallery scrolls and opens the lightbox", async ({ page }) => {
    await page.goto("/");
    const track = page.getByRole("list", { name: "Photo gallery" });
    await track.scrollIntoViewIfNeeded();
    const next = page.getByRole("button", { name: "Next photos" });
    await expect(page.getByRole("button", { name: "Previous photos" })).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((t) => t.scrollLeft)).toBeGreaterThan(0);
    await track.getByRole("button").first().click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
  });
});

test.describe("crawler files and protections", () => {
  test("robots.txt and sitemap.xml", async ({ request, baseURL }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/rooms", "/attractions", "/rooms/"]) expect(sitemap).toContain(p);
    // Production builds must point at the real site, never localhost.
    if (!baseURL?.includes("localhost")) expect(sitemap).not.toContain("localhost");
  });

  test("security headers are sent", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("health check reports the database is reachable", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("admin pages require login", async ({ page }) => {
    await page.goto("/admin/bookings");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("cron and webhook endpoints reject unauthenticated calls", async ({ request }) => {
    expect((await request.post("/api/cron/release-holds")).status()).toBe(401);
    const forged = await request.post("/api/webhooks/razorpay", {
      data: { event: "payment.captured", payload: {} },
      headers: { "x-razorpay-signature": "forged" },
    });
    expect(forged.status()).toBe(401);
  });
});
