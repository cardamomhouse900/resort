import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/razorpay";

const KEY_SECRET = "test_key_secret_123";
const WEBHOOK_SECRET = "whsec_test_456";
const sign = (secret: string, msg: string) => createHmac("sha256", secret).update(msg).digest("hex");

describe("checkout signature (order_id|payment_id)", () => {
  const orderId = "order_ABC123xyz";
  const paymentId = "pay_DEF456uvw";
  const good = sign(KEY_SECRET, `${orderId}|${paymentId}`);

  it("accepts Razorpay's signature", async () => {
    expect(await verifyCheckoutSignature({ orderId, paymentId, signature: good }, KEY_SECRET)).toBe(true);
  });
  it("rejects a signature for a different payment or order", async () => {
    expect(
      await verifyCheckoutSignature({ orderId, paymentId: "pay_OTHER", signature: good }, KEY_SECRET),
    ).toBe(false);
    expect(
      await verifyCheckoutSignature({ orderId: "order_OTHER", paymentId, signature: good }, KEY_SECRET),
    ).toBe(false);
  });
  it("rejects a signature made with another secret, and malformed input", async () => {
    const forged = sign("attacker_secret", `${orderId}|${paymentId}`);
    expect(await verifyCheckoutSignature({ orderId, paymentId, signature: forged }, KEY_SECRET)).toBe(false);
    expect(await verifyCheckoutSignature({ orderId, paymentId, signature: "" }, KEY_SECRET)).toBe(false);
    expect(
      await verifyCheckoutSignature({ orderId, paymentId, signature: good.toUpperCase() }, KEY_SECRET),
    ).toBe(false);
  });
});

describe("webhook signature (raw body)", () => {
  const body = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", amount: 300000 } } },
  });

  it("accepts the exact raw body", async () => {
    expect(await verifyWebhookSignature(body, sign(WEBHOOK_SECRET, body), WEBHOOK_SECRET)).toBe(true);
  });
  it("rejects a body that was modified, even by whitespace", async () => {
    const sig = sign(WEBHOOK_SECRET, body);
    expect(await verifyWebhookSignature(body.replace("300000", "100"), sig, WEBHOOK_SECRET)).toBe(false);
    expect(await verifyWebhookSignature(JSON.stringify(JSON.parse(body), null, 2), sig, WEBHOOK_SECRET)).toBe(
      false,
    );
  });
  it("rejects missing or wrong signatures", async () => {
    expect(await verifyWebhookSignature(body, null, WEBHOOK_SECRET)).toBe(false);
    expect(await verifyWebhookSignature(body, sign("other", body), WEBHOOK_SECRET)).toBe(false);
  });
});
