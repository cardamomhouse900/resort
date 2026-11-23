import { defineConfig, devices } from "@playwright/test";

/**
 * Browser (end-to-end) tests.
 *
 *   npm run build && npm run e2e        against a local production server (port 3100, local database)
 *   E2E_BASE_URL=https://… npm run e2e  against a deployed site (no local server is started)
 *
 * Against a deployed site the tests never pay and never send the contact form: they create at
 * most a short payment hold (released automatically) and open Razorpay Checkout.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const local = !process.env.E2E_BASE_URL;
// Windows dev machines use the installed Edge; CI installs Playwright's Chromium.
const channel = process.env.PW_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: local ? 4 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "test-results/e2e",
  use: { baseURL, channel, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, channel },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: local
    ? {
        command: "npm run start -- -p 3100",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
