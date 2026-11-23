import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createBookingHold, type CreateHoldInput } from "@/services/booking";
import {
  confirmFromCheckout,
  createPaymentOrder,
  getBookingForGuest,
  issueRefund,
  processWebhook,
} from "@/services/payment";
import { addDays, todayAtResort } from "@/utils/dates";
import { resetAndSeed, testDb } from "../support/db";
import { FakeGateway } from "../support/fake-gateway";

const db: Db = testDb();
afterAll(() => db.$disconnect());
let gw: FakeGateway;
beforeEach(async () => {
  await resetAndSeed(db);
  gw = new FakeGateway();
});

const d = (n: number) => addDays(todayAtResort(), n);
const guest = { name: "Pay Tester", email: "pay@example.com", phone: "+91 90000 00002" };
const holdInput = (o: Partial<CreateHoldInput> = {}): CreateHoldInput => ({
  roomTypeSlug: "forest-family-cottage", // ₹7,500 × 2 nights → ₹4,500 advance; 2 units
  checkIn: d(30),
  checkOut: d(32),
  adults: 2,
  children: 0,
  guest,
  ...o,
});

async function bookAndOrder(o: Partial<CreateHoldInput> = {}, now = new Date()) {
  const hold = await createBookingHold(db, holdInput(o), now);
  const order = await createPaymentOrder(db, gw, hold.bookingId, now);
  return { hold, order };
}
const state = async (bookingId: string) =>
  db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { reservations: true, payments: { include: { refunds: true } } },
  });

const captured = (p: { id: string; order_id: string; amount: number }) => ({
  event: "payment.captured",
  payload: { payment: { entity: { ...p, currency: "INR", status: "captured" as const, method: "upi" } } },
});

describe("orders", () => {
  it("creates the order for the advance amount from the database and reuses it", async () => {
    const { hold, order } = await bookAndOrder();
    expect(order.amountPaise).toBe(450_000);
    expect(gw.orders.get(order.orderId)?.receipt).toBe(hold.code);
    const again = await createPaymentOrder(db, gw, hold.bookingId);
    expect(again.orderId).toBe(order.orderId);
    expect(gw.orders.size).toBe(1);
  });

  it("refuses to open payment for an expired hold", async () => {
    const t0 = new Date();
    const hold = await createBookingHold(db, holdInput(), t0);
    await expect(
      createPaymentOrder(db, gw, hold.bookingId, new Date(t0.getTime() + 16 * 60_000)),
    ).rejects.toThrow(AppError);
  });
});

describe("confirmation from the checkout callback", () => {
  it("confirms the booking only after re-fetching the payment from Razorpay", async () => {
    const { hold, order } = await bookAndOrder();
    const p = gw.pay(order.orderId);
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id })).toBe("confirmed");

    const s = await state(hold.bookingId);
    expect(s.status).toBe("CONFIRMED");
    expect(s.reservations.map((r) => r.status)).toEqual(["CONFIRMED"]);
    expect(s.payments[0]).toMatchObject({ status: "CAPTURED", razorpayPaymentId: p.id, method: "upi" });
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id })).toBe(
      "already_confirmed",
    );
  });

  it("captures authorised payments", async () => {
    const { order } = await bookAndOrder();
    const p = gw.pay(order.orderId, { status: "authorized" });
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id })).toBe("confirmed");
    expect(gw.payments.get(p.id)?.status).toBe("captured");
  });

  it("rejects a payment of the wrong amount or for another order", async () => {
    const { hold, order } = await bookAndOrder();
    const cheap = gw.pay(order.orderId, { amount: 100 });
    await expect(
      confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: cheap.id }),
    ).rejects.toThrow(/amount/);

    const other = await bookAndOrder({ checkIn: d(40), checkOut: d(41) });
    const foreign = gw.pay(other.order.orderId);
    await expect(
      confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: foreign.id }),
    ).rejects.toThrow(/order/);
    expect((await state(hold.bookingId)).status).toBe("PENDING_PAYMENT");
  });

  it("does not confirm payments that failed", async () => {
    const { hold, order } = await bookAndOrder();
    const p = gw.pay(order.orderId, { status: "failed" });
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id })).toBe(
      "not_captured",
    );
    expect((await state(hold.bookingId)).status).toBe("PENDING_PAYMENT");
  });
});

describe("webhooks", () => {
  it("confirms a booking when the guest closed the browser, and ignores duplicate deliveries", async () => {
    const { hold, order } = await bookAndOrder();
    const p = gw.pay(order.orderId);
    expect(await processWebhook(db, gw, "evt_1", captured(p))).toBe("processed");
    expect((await state(hold.bookingId)).status).toBe("CONFIRMED");
    expect(await processWebhook(db, gw, "evt_1", captured(p))).toBe("duplicate");
    // A different event for the same payment (order.paid) changes nothing.
    expect(await processWebhook(db, gw, "evt_2", { ...captured(p), event: "order.paid" })).toBe("processed");
    expect((await state(hold.bookingId)).reservations).toHaveLength(1);
  });

  it("handles the checkout callback and the webhook arriving at the same moment", async () => {
    const { hold, order } = await bookAndOrder();
    const p = gw.pay(order.orderId);
    const results = await Promise.all([
      confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id }),
      processWebhook(db, gw, "evt_race", captured(p)),
      confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id }),
    ]);
    expect(results.filter((r) => r === "confirmed")).toHaveLength(1);
    const s = await state(hold.bookingId);
    expect(s.status).toBe("CONFIRMED");
    expect(s.reservations.filter((r) => r.status === "CONFIRMED")).toHaveLength(1);
  });

  it("records failed attempts; a later successful attempt still confirms", async () => {
    const { hold, order } = await bookAndOrder();
    const failedEvent = {
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed1",
            order_id: order.orderId,
            amount: 450_000,
            currency: "INR",
            status: "failed" as const,
            error_code: "BAD_REQUEST_ERROR",
            error_description: "Card declined",
          },
        },
      },
    };
    await processWebhook(db, gw, "evt_f", failedEvent);
    expect((await state(hold.bookingId)).payments[0]).toMatchObject({
      status: "FAILED",
      errorDescription: "Card declined",
    });

    const p = gw.pay(order.orderId);
    await processWebhook(db, gw, "evt_ok", captured(p));
    const s = await state(hold.bookingId);
    expect(s.status).toBe("CONFIRMED");
    expect(s.payments[0].status).toBe("CAPTURED");
  });

  it("ignores events for orders that are not ours", async () => {
    expect(
      await processWebhook(
        db,
        gw,
        "evt_x",
        captured({ id: "pay_zzz", order_id: "order_notours", amount: 100 }),
      ),
    ).toBe("ignored");
  });
});

describe("late payments (after the hold expired)", () => {
  it("confirms in the same or another free room when one is available", async () => {
    const t0 = new Date();
    const { hold, order } = await bookAndOrder({}, t0);
    const later = new Date(t0.getTime() + 20 * 60_000);
    // Another guest's booking at the later time releases the expired hold.
    await createBookingHold(db, holdInput({ checkIn: d(31), checkOut: d(33) }), later);
    expect((await state(hold.bookingId)).status).toBe("EXPIRED");

    const p = gw.pay(order.orderId);
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id }, later)).toBe(
      "reallocated",
    );
    const s = await state(hold.bookingId);
    expect(s.status).toBe("CONFIRMED");
    expect(s.reservations.filter((r) => r.status === "CONFIRMED")).toHaveLength(1);
  });

  it("refunds automatically, exactly once, when no room is left", async () => {
    const t0 = new Date();
    const { hold, order } = await bookAndOrder({}, t0);
    const later = new Date(t0.getTime() + 20 * 60_000);
    // Both units of the cottage get booked by others after the hold expired.
    await createBookingHold(db, holdInput(), later);
    await createBookingHold(db, holdInput(), later);

    const p = gw.pay(order.orderId);
    expect(await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id }, later)).toBe(
      "refund_required",
    );
    await processWebhook(db, gw, "evt_late", captured(p), later); // duplicate signal must not refund again

    const s = await state(hold.bookingId);
    expect(s.status).toBe("CANCELLED");
    expect(s.cancellationReason).toMatch(/refunded automatically/);
    expect(gw.refunds).toHaveLength(1);
    expect(gw.refunds[0].amount).toBe(450_000);
    expect(s.payments[0]).toMatchObject({ status: "REFUNDED", refundedPaise: 450_000 });
  });
});

describe("refunds", () => {
  it("supports partial refunds, blocks over-refunds, and reconciles refund webhooks", async () => {
    const { hold, order } = await bookAndOrder();
    const p = gw.pay(order.orderId);
    await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id });
    const paymentRow = (await state(hold.bookingId)).payments[0];

    const r1 = await issueRefund(db, gw, paymentRow.id, 200_000, "Partial per policy");
    expect((await state(hold.bookingId)).payments[0]).toMatchObject({
      status: "PARTIALLY_REFUNDED",
      refundedPaise: 200_000,
    });
    await expect(issueRefund(db, gw, paymentRow.id, 300_000, "Too much")).rejects.toThrow(/remaining/);

    const refundEvent = (status: "processed" | "failed") => ({
      event: `refund.${status}`,
      payload: { refund: { entity: { id: r1.id, payment_id: p.id, amount: 200_000, status } } },
    });
    await processWebhook(db, gw, "evt_r1", refundEvent("processed"));
    await processWebhook(db, gw, "evt_r1", refundEvent("processed"));
    const s = await state(hold.bookingId);
    expect(s.payments[0].refunds).toHaveLength(1);
    expect(s.payments[0].refundedPaise).toBe(200_000);

    await issueRefund(db, gw, paymentRow.id, 250_000, "Remainder");
    expect((await state(hold.bookingId)).payments[0]).toMatchObject({
      status: "REFUNDED",
      refundedPaise: 450_000,
    });
  });
});

describe("guest booking link", () => {
  it("requires the secret token", async () => {
    const { hold } = await bookAndOrder();
    expect((await getBookingForGuest(db, hold.code, hold.accessToken))?.id).toBe(hold.bookingId);
    expect(await getBookingForGuest(db, hold.code, "x".repeat(43))).toBeNull();
    expect(await getBookingForGuest(db, "BK-ZZZZZZ", hold.accessToken)).toBeNull();
  });
});
