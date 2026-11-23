import { RazorpayError, type PaymentGateway, type RazorpayPayment } from "@/lib/razorpay";

/**
 * In-memory stand-in for Razorpay with the behaviours the payment service
 * relies on (order amounts, capture, refund limits). Lets tests create
 * "payments" in any state, including tampered ones.
 */
export class FakeGateway implements PaymentGateway {
  orders = new Map<string, { amount: number; receipt: string }>();
  payments = new Map<string, RazorpayPayment>();
  refunds: { id: string; paymentId: string; amount: number }[] = [];
  private seq = 0;

  async createOrder({ amountPaise, receipt }: { amountPaise: number; receipt: string }) {
    const id = `order_T${++this.seq}x${Date.now().toString(36)}`;
    this.orders.set(id, { amount: amountPaise, receipt });
    return { id, amount: amountPaise, currency: "INR", receipt, status: "created" };
  }

  /** Simulates the guest paying an order (optionally with a tampered amount). */
  pay(orderId: string, opts: { status?: RazorpayPayment["status"]; amount?: number } = {}): RazorpayPayment {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`unknown order ${orderId}`);
    const payment: RazorpayPayment = {
      id: `pay_T${++this.seq}x${Date.now().toString(36)}`,
      order_id: orderId,
      amount: opts.amount ?? order.amount,
      currency: "INR",
      status: opts.status ?? "captured",
      method: "upi",
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async fetchPayment(id: string) {
    const p = this.payments.get(id);
    if (!p) throw new RazorpayError("The id provided does not exist", 400);
    return { ...p };
  }

  async capturePayment(id: string, amountPaise: number) {
    const p = this.payments.get(id);
    if (!p) throw new RazorpayError("not found", 400);
    if (p.status === "captured") throw new RazorpayError("This payment has already been captured", 400);
    if (p.amount !== amountPaise)
      throw new RazorpayError("Capture amount must be equal to the amount authorized", 400);
    p.status = "captured";
    return { ...p };
  }

  async refund(paymentId: string, amountPaise: number) {
    const p = this.payments.get(paymentId);
    if (!p || p.status !== "captured") throw new RazorpayError("Payment not captured", 400);
    const already = this.refunds.filter((r) => r.paymentId === paymentId).reduce((s, r) => s + r.amount, 0);
    if (already + amountPaise > p.amount) {
      throw new RazorpayError("The total refund amount is greater than the refund payment amount", 400);
    }
    const refund = { id: `rfnd_T${++this.seq}`, paymentId, amount: amountPaise };
    this.refunds.push(refund);
    return { id: refund.id, payment_id: paymentId, amount: amountPaise, status: "processed" as const };
  }
}
