import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import { adminRecipients } from "@/lib/email";
import { createBookingHold, type CreateHoldInput } from "@/services/booking";
import { paymentNotifier, sendInquiryNotice, sendPendingConfirmations } from "@/services/notifications";
import { confirmFromCheckout, createPaymentOrder, processWebhook } from "@/services/payment";
import { addDays, todayAtResort } from "@/utils/dates";
import { resetAndSeed, testDb } from "../support/db";
import { FakeGateway } from "../support/fake-gateway";
import { RecordingMailer } from "../support/recording-mailer";

const db: Db = testDb();
afterAll(() => db.$disconnect());
let gw: FakeGateway;
let mail: RecordingMailer;
const ADMIN = "owner@resort.test";
beforeEach(async () => {
  await resetAndSeed(db);
  gw = new FakeGateway();
  mail = new RecordingMailer();
  process.env.ADMIN_NOTIFICATION_EMAIL = ADMIN;
});
afterEach(() => {
  Reflect.deleteProperty(process.env, "ADMIN_NOTIFICATION_EMAIL");
});

const d = (n: number) => addDays(todayAtResort(), n);
const GUEST = "guest@example.com";
const holdInput = (o: Partial<CreateHoldInput> = {}): CreateHoldInput => ({
  roomTypeSlug: "forest-family-cottage",
  checkIn: d(30),
  checkOut: d(32),
  adults: 2,
  children: 0,
  guest: { name: "Mail Tester", email: GUEST, phone: "+91 90000 90000" },
  ...o,
});
async function paidBooking(o: Partial<CreateHoldInput> = {}, now = new Date()) {
  const hold = await createBookingHold(db, holdInput(o), now);
  const order = await createPaymentOrder(db, gw, hold.bookingId, now);
  return { hold, order, payment: gw.pay(order.orderId) };
}
const capturedEvent = (p: { id: string; order_id: string; amount: number }) => ({
  event: "payment.captured",
  payload: { payment: { entity: { ...p, currency: "INR", status: "captured" as const, method: "upi" } } },
});

describe("booking confirmation emails", () => {
  it("emails the guest and the resort once, and records it", async () => {
    const { hold, order, payment } = await paidBooking();
    const notify = paymentNotifier(db, mail);
    await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: payment.id }, new Date(), notify);
    await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: payment.id }, new Date(), notify);
    await processWebhook(db, gw, "evt_mail", capturedEvent(payment), new Date(), notify);

    expect(mail.to(GUEST)).toHaveLength(1);
    expect(mail.to(GUEST)[0].subject).toContain(hold.code);
    expect(mail.to(GUEST)[0].replyTo).toBe("hello@example.com");
    expect(mail.to(ADMIN)).toHaveLength(1);
    expect(mail.to(ADMIN)[0].replyTo).toBe(GUEST);
    const b = await db.booking.findUniqueOrThrow({ where: { id: hold.bookingId } });
    expect(b.confirmationEmailSentAt).not.toBeNull();
  });

  it("sends a single confirmation when callback and webhook race", async () => {
    const { order, payment } = await paidBooking();
    const notify = paymentNotifier(db, mail);
    await Promise.all([
      confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: payment.id }, new Date(), notify),
      processWebhook(db, gw, "evt_race_mail", capturedEvent(payment), new Date(), notify),
    ]);
    expect(mail.to(GUEST)).toHaveLength(1);
  });

  it("an email outage never blocks the booking, and the cron retries later", async () => {
    const { hold, order, payment } = await paidBooking();
    mail.failing = true;
    expect(
      await confirmFromCheckout(
        db,
        gw,
        { orderId: order.orderId, paymentId: payment.id },
        new Date(),
        paymentNotifier(db, mail),
      ),
    ).toBe("confirmed");
    let b = await db.booking.findUniqueOrThrow({ where: { id: hold.bookingId } });
    expect(b.status).toBe("CONFIRMED");
    expect(b.confirmationEmailSentAt).toBeNull();

    mail.failing = false;
    expect(await sendPendingConfirmations(db, mail)).toBe(1);
    expect(await sendPendingConfirmations(db, mail)).toBe(0); // nothing left to send
    expect(mail.to(GUEST)).toHaveLength(1);
    b = await db.booking.findUniqueOrThrow({ where: { id: hold.bookingId } });
    expect(b.confirmationEmailSentAt).not.toBeNull();
  });

  it("emails the guest about an automatic refund when their late payment can't be honoured", async () => {
    const t0 = new Date();
    const { hold, order } = await paidBooking({}, t0);
    const later = new Date(t0.getTime() + 20 * 60_000);
    await createBookingHold(db, holdInput(), later);
    await createBookingHold(db, holdInput(), later);
    const p = [...gw.payments.values()].find((x) => x.order_id === order.orderId)!;
    const notify = paymentNotifier(db, mail);
    await confirmFromCheckout(db, gw, { orderId: order.orderId, paymentId: p.id }, later, notify);
    await processWebhook(db, gw, "evt_late_mail", capturedEvent(p), later, notify);

    const guestMails = mail.to(GUEST);
    expect(guestMails).toHaveLength(1);
    expect(guestMails[0].subject).toContain(`Refund issued for ${hold.code}`);
    expect(mail.to(ADMIN)).toHaveLength(0);
  });
});

describe("other notifications", () => {
  it("forwards enquiries to the resort with the guest as reply-to", async () => {
    await sendInquiryNotice(db, mail, {
      id: "inq-1",
      name: "Ravi",
      email: "ravi@example.com",
      phone: null,
      message: "Parking for a bus?",
    });
    expect(mail.sent[0]).toMatchObject({
      to: [ADMIN],
      replyTo: "ravi@example.com",
      idempotencyKey: "inquiry-inq-1",
    });
  });

  it("parses admin recipients and falls back to the resort email", () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "a@x.com, not-an-email ,b@y.org";
    expect(adminRecipients("fallback@z.com")).toEqual(["a@x.com", "b@y.org"]);
    Reflect.deleteProperty(process.env, "ADMIN_NOTIFICATION_EMAIL");
    expect(adminRecipients("fallback@z.com")).toEqual(["fallback@z.com"]);
  });
});
