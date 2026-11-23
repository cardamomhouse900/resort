"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { formatPaise } from "@/utils/money";

export type CheckoutOrder = { orderId: string; amountPaise: number; currency: "INR"; keyId?: string };

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open(): void;
  on(event: "payment.failed", cb: (r: { error: { description?: string } }) => void): void;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads Razorpay Checkout only when the guest is about to pay (keeps every other page light). */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load the payment window. Check your connection and try again.")),
      {
        once: true,
      },
    );
    if (!existing) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

/**
 * Opens Razorpay Checkout for an existing order. After a successful payment the
 * server verifies it; whatever happens next, the guest lands on their booking
 * page, which shows the authoritative status (the webhook may confirm a moment later).
 */
export function PayButton({
  order,
  bookingCode,
  accessToken,
  resortName,
  prefill,
  className = "",
}: {
  order: CheckoutOrder;
  bookingCode: string;
  accessToken: string;
  resortName: string;
  prefill?: { name?: string; email?: string; contact?: string };
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "opening" | "verifying">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const bookingPage = `/booking/confirmation?code=${encodeURIComponent(bookingCode)}&t=${encodeURIComponent(accessToken)}`;

  async function pay() {
    setMessage(null);
    setState("opening");
    try {
      await loadCheckout();
      if (!window.Razorpay || !order.keyId) throw new Error("Online payment is not available right now.");
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: resortName,
        description: `Advance for booking ${bookingCode}`,
        prefill,
        notes: { bookingCode },
        theme: { color: "#244A35" },
        modal: {
          ondismiss: () => {
            setState("idle");
            setMessage("Payment was not completed. Your room is still held — you can try again.");
          },
        },
        handler: async (response: RazorpayResponse) => {
          setState("verifying");
          try {
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
          } catch {
            // Network hiccup: the webhook will still confirm the booking.
          }
          router.push(bookingPage);
        },
      });
      rzp.on("payment.failed", (r) => {
        setMessage(
          `Payment failed${r.error?.description ? `: ${r.error.description}` : ""}. You can try again or use another method.`,
        );
      });
      rzp.open();
      setState("idle");
    } catch (e) {
      setState("idle");
      setMessage((e as Error).message);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={state !== "idle"}
        className={`bg-forest text-cream hover:bg-mountain inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-8 text-base font-semibold transition-colors disabled:opacity-60 sm:w-auto ${className}`}
      >
        <Lock className="size-4" aria-hidden="true" />
        {state === "verifying"
          ? "Confirming your payment…"
          : state === "opening"
            ? "Opening secure payment…"
            : `Pay ${formatPaise(order.amountPaise)} securely`}
      </button>
      <p className="text-ink-muted mt-3 text-xs">
        Payments are processed by Razorpay. Cards, UPI, net banking and wallets accepted.
      </p>
      <p role="alert" aria-live="assertive" className="text-earth mt-3 text-sm empty:hidden">
        {message}
      </p>
    </div>
  );
}
