import Link from "next/link";
import type { ReactNode } from "react";
import type { BookingStatus } from "@/generated/prisma/enums";

/** Small server-rendered building blocks shared by admin pages. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-h2">{title}</h1>
        {description && <p className="text-ink-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section className={`border-line rounded-2xl border bg-white p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-forest mb-4 font-sans text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-forest text-cream hover:bg-mountain"
      : "text-forest ring-1 ring-forest/30 hover:bg-beige";
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors ${styles}`}
    >
      {children}
    </Link>
  );
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: "bg-forest/10 text-forest",
  PENDING_PAYMENT: "bg-amber-100 text-amber-900",
  CANCELLED: "bg-earth/10 text-earth",
  EXPIRED: "bg-ink/5 text-ink-muted",
};
const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Awaiting payment",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "brown";
}) {
  const styles = {
    neutral: "bg-ink/5 text-ink-muted",
    green: "bg-forest/10 text-forest",
    brown: "bg-earth/10 text-earth",
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="border-line text-ink-muted rounded-2xl border border-dashed p-8 text-center">{children}</p>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="border-line overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-beige/50 text-ink-muted text-xs uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(d);
}
