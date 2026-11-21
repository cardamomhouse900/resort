"use client";

import { useState, type FormEvent } from "react";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const input =
  "mt-2 block w-full min-h-12 rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none";
const label = "text-sm font-semibold text-forest";

/**
 * Contact inquiry form. Uses native HTML validation in the browser; the server
 * route (/api/contact, Phase 3) re-validates everything and stores the inquiry.
 */
export function ContactForm({ fallbackPhone }: { fallbackPhone: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus({ kind: "sent" });
    } catch {
      setStatus({
        kind: "error",
        message: `Sorry, your message could not be sent right now. Please call or WhatsApp us on ${fallbackPhone}.`,
      });
    }
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="bg-beige rounded-2xl p-8">
        <p className="text-h3 text-forest font-serif">Thank you — we have received your message.</p>
        <p className="text-ink-muted mt-2">We usually reply within one working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className={label}>Full name</span>
        <input name="name" required minLength={2} maxLength={100} autoComplete="name" className={input} />
      </label>
      <label className="block">
        <span className={label}>Email</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" className={input} />
      </label>
      <label className="block">
        <span className={label}>
          Phone <span className="text-ink-muted font-normal">(optional)</span>
        </span>
        <input
          name="phone"
          type="tel"
          maxLength={20}
          pattern="[0-9+\-\s()]{7,20}"
          autoComplete="tel"
          className={input}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className={label}>Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className={`${input} resize-y`}
        />
      </label>
      {/* Honeypot: hidden from people, often filled in by spam bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field empty
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="bg-forest text-cream hover:bg-mountain inline-flex min-h-12 items-center justify-center rounded-full px-8 font-semibold transition-colors disabled:opacity-60"
        >
          {status.kind === "sending" ? "Sending…" : "Send message"}
        </button>
        <p aria-live="polite" className="text-earth mt-4 text-[0.9375rem]">
          {status.kind === "error" ? status.message : ""}
        </p>
      </div>
    </form>
  );
}
