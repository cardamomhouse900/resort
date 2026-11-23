import "server-only";
import { getEnv } from "./env";

/**
 * Minimal Razorpay client over fetch + Web Crypto (works in Node and on
 * Cloudflare Workers — the official SDK depends on Node-only modules).
 *
 * Only the server ever sees the key secret. The browser receives the public
 * key id and an order id, nothing else.
 */

const API = "https://api.razorpay.com/v1";

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };
export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  captured?: boolean;
  error_code?: string | null;
  error_description?: string | null;
};
export type RazorpayRefund = {
  id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "processed" | "failed";
};

/** The operations the payment service needs — implemented by Razorpay, faked in tests. */
export interface PaymentGateway {
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<RazorpayOrder>;
  fetchPayment(paymentId: string): Promise<RazorpayPayment>;
  capturePayment(paymentId: string, amountPaise: number): Promise<RazorpayPayment>;
  refund(paymentId: string, amountPaise: number, notes: Record<string, string>): Promise<RazorpayRefund>;
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

export function razorpayGateway(): PaymentGateway {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = getEnv("razorpay");
  const auth = `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`;

  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: auth, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      error?: { code?: string; description?: string };
    };
    if (!res.ok) {
      throw new RazorpayError(
        data.error?.description ?? `Razorpay ${method} ${path} failed`,
        res.status,
        data.error?.code,
      );
    }
    return data;
  }

  return {
    createOrder: ({ amountPaise, receipt, notes }) =>
      call<RazorpayOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes }),
    fetchPayment: (id) => call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(id)}`),
    capturePayment: (id, amountPaise) =>
      call<RazorpayPayment>("POST", `/payments/${encodeURIComponent(id)}/capture`, {
        amount: amountPaise,
        currency: "INR",
      }),
    refund: (id, amountPaise, notes) =>
      call<RazorpayRefund>("POST", `/payments/${encodeURIComponent(id)}/refund`, {
        amount: amountPaise,
        speed: "normal",
        notes,
      }),
  };
}

/* ------------------------------------------------------------ Signatures */

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison, so response timing reveals nothing about the expected signature. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyCheckoutSignature(
  input: { orderId: string; paymentId: string; signature: string },
  keySecret: string,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(input.signature)) return false;
  return safeEqual(await hmacSha256Hex(keySecret, `${input.orderId}|${input.paymentId}`), input.signature);
}

/** Webhooks: X-Razorpay-Signature = HMAC_SHA256(raw request body, webhook_secret). */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): Promise<boolean> {
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return safeEqual(await hmacSha256Hex(webhookSecret, rawBody), signature);
}
