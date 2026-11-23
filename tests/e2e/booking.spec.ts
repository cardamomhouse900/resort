import { expect, test } from "@playwright/test";
import { asUniqueClient, dayFromToday, isLive, watchForErrors } from "./helpers";

test.beforeEach(async ({ page }) => asUniqueClient(page));

// A random date far ahead so parallel and repeated runs don't compete for the same rooms.
const offset = () => 120 + Math.floor(Math.random() * 200);

test("guest books a room and reaches Razorpay Checkout", async ({ page }) => {
  const errors = watchForErrors(page);
  const start = offset();
  await page.goto(
    `/booking?checkIn=${dayFromToday(start)}&checkOut=${dayFromToday(start + 2)}&adults=2&children=0&room=valley-view-cottage`,
  );

  // Step 2: availability results with a price, then pick the room.
  await expect(page.getByRole("heading", { name: /2 nights/ })).toBeVisible();
  await page.getByRole("button", { name: /Select Valley View Cottage/ }).click();

  // Step 3: guest details. The policy must be accepted before continuing.
  await page.fill('input[name="name"]', "E2E Test Guest");
  await page.fill('input[name="email"]', "e2e-guest@example.com");
  await page.fill('input[name="phone"]', "+91 90000 90000");
  const cont = page.getByRole("button", { name: /Continue — advance ₹[\d,]+/ });
  const advance = (await cont.innerText()).match(/₹[\d,]+/)![0];
  await page.getByLabel(/I have read and accept/).check();
  await cont.click();

  // Step 4: the room is held for this guest and the same advance is charged.
  await expect(page.getByText(/Booking reference BK-[A-Z0-9]+/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Your room is reserved for \d+ more minute/)).toBeVisible();
  const pay = page.getByRole("button", { name: `Pay ${advance} securely` });
  await expect(pay).toBeVisible();

  await pay.click();
  await expect(page.locator("iframe.razorpay-checkout-frame")).toBeVisible({ timeout: 30_000 });
  errors.expectNone();
});

test("rooms too small for the party cannot be selected", async ({ page }) => {
  const start = offset();
  await page.goto(
    `/booking?checkIn=${dayFromToday(start)}&checkOut=${dayFromToday(start + 1)}&adults=6&children=4`,
  );
  await expect(page.getByRole("heading", { name: /1 night/ })).toBeVisible();
  // No room type sleeps 10: each one explains its capacity and none can be chosen.
  await expect(page.getByText(/Fits up to \d+ guests/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Select /, disabled: false })).toHaveCount(0);
});

test("contact form sends an enquiry", async ({ page }) => {
  test.skip(isLive, "never sends real enquiries to the resort from tests");
  await page.goto("/contact");
  await page.fill('input[name="name"]', "E2E Test");
  await page.fill('input[name="email"]', "e2e@example.com");
  await page.fill('textarea[name="message"]', "Automated test enquiry — please ignore.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("we have received your message");
});
