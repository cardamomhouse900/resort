import type { EmailMessage, Mailer } from "@/lib/email";

/** Captures emails instead of sending them; can be switched to fail (provider outage). */
export class RecordingMailer implements Mailer {
  sent: EmailMessage[] = [];
  failing = false;

  async send(message: EmailMessage) {
    if (this.failing) throw new Error("simulated email provider outage");
    this.sent.push(message);
    return { id: `test-${this.sent.length}` };
  }

  to(address: string) {
    return this.sent.filter((m) => [m.to].flat().includes(address));
  }
  keys() {
    return this.sent.map((m) => m.idempotencyKey);
  }
}
