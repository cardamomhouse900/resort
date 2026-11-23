import "server-only";

/**
 * Transactional email via Resend's HTTP API (fetch — works on Cloudflare Workers).
 *
 * Every message carries an idempotency key, so a retried send (e.g. the
 * checkout callback and the webhook both confirming) never emails twice.
 * Without RESEND_API_KEY the mailer only logs, so development works offline.
 */

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Same key within 24 h = same email; Resend ignores the duplicate. */
  idempotencyKey: string;
  tags?: Record<string, string>;
};

export interface Mailer {
  send(message: EmailMessage): Promise<{ id: string }>;
}

export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

class ResendMailer implements Mailer {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async send(m: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": m.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: this.from,
        to: Array.isArray(m.to) ? m.to : [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        reply_to: m.replyTo,
        tags: m.tags
          ? Object.entries(m.tags).map(([name, value]) => ({ name, value: value.replace(/[^\w-]/g, "_") }))
          : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !data.id)
      throw new EmailError(data.message ?? `Resend responded ${res.status}`, res.status);
    return { id: data.id };
  }
}

/** Development fallback: logs instead of sending. */
class LogMailer implements Mailer {
  async send(m: EmailMessage) {
    console.info(
      `[email:not-sent] to=${[m.to].flat().join(",")} subject="${m.subject}" key=${m.idempotencyKey}`,
    );
    return { id: `log-${m.idempotencyKey}` };
  }
}

export function getMailer(): Mailer {
  if (isEmailConfigured()) return new ResendMailer(process.env.RESEND_API_KEY!, process.env.EMAIL_FROM!);
  if (process.env.NODE_ENV === "production") {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set — emails are only logged");
  }
  return new LogMailer();
}

/** Admin recipients: ADMIN_NOTIFICATION_EMAIL (comma-separated), else the resort's public email. */
export function adminRecipients(fallback: string): string[] {
  const list = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return list.length ? list : [fallback];
}
