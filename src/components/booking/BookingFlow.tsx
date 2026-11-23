"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { BedDouble, CalendarDays, Check, Clock, Users } from "lucide-react";
import type { AvailabilityOption } from "@/services/booking";
import type { Quote } from "@/services/pricing";
import { addDays, formatStayDate, type ISODate } from "@/utils/dates";
import { formatPaise } from "@/utils/money";
import { PayButton, type CheckoutOrder } from "./PayButton";

type Search = { checkIn: ISODate; checkOut: ISODate; adults: number; children: number };
type HeldBooking = {
  code: string;
  holdExpiresAt: string;
  roomType: { slug: string; name: string };
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  children: number;
  quote: Quote;
};
type Held = HeldBooking & {
  payment: CheckoutOrder;
  accessToken: string;
  prefill: { name: string; email: string; contact: string };
};
type ApiError = { error: { code: string; message: string; details?: { field: string; message: string }[] } };

type Props = {
  today: ISODate;
  initial: Partial<Search> & { roomType?: string };
  policies: { booking: string; cancellation: string };
  showSampleBadges: boolean;
  resortName: string;
};

const field =
  "mt-2 block w-full min-h-12 rounded-lg border border-line bg-white px-4 text-base text-ink focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none disabled:bg-beige/50";
const label = "text-sm font-semibold text-forest";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const err = (data as ApiError | null)?.error;
    throw Object.assign(new Error(err?.message ?? "Something went wrong. Please try again."), {
      code: err?.code,
      details: err?.details,
    });
  }
  return data as T;
}

const guestsLabel = (a: number, c: number) =>
  `${a} adult${a === 1 ? "" : "s"}${c ? `, ${c} child${c === 1 ? "" : "ren"}` : ""}`;

/**
 * Booking flow: search → choose a room → guest details → room held.
 * Every price shown comes from the server; the browser only displays it.
 */
export function BookingFlow({ today, initial, policies, showSampleBadges, resortName }: Props) {
  const [search, setSearch] = useState<Search>({
    checkIn: initial.checkIn ?? "",
    checkOut: initial.checkOut ?? "",
    adults: initial.adults ?? 2,
    children: initial.children ?? 0,
  });
  const [results, setResults] = useState<{
    nights: number;
    options: AvailabilityOption[];
    for: Search;
  } | null>(null);
  const [selected, setSelected] = useState<AvailabilityOption | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [busy, setBusy] = useState<"search" | "book" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const stepRef = useRef<HTMLDivElement>(null);

  const focusStep = () => requestAnimationFrame(() => stepRef.current?.focus());

  const runSearch = useCallback(
    async (s: Search) => {
      setBusy("search");
      setError(null);
      setSelected(null);
      try {
        const data = await post<{ nights: number; options: AvailabilityOption[] }>("/api/availability", s);
        // Preferred room type (from "Book Now" on a room page) first.
        const options = [...data.options].sort(
          (a, b) =>
            Number(b.roomType.slug === initial.roomType) - Number(a.roomType.slug === initial.roomType),
        );
        setResults({ ...data, options, for: s });
        const params = new URLSearchParams({
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          adults: String(s.adults),
          children: String(s.children),
          ...(initial.roomType ? { room: initial.roomType } : {}),
        });
        window.history.replaceState(null, "", `/booking?${params}`);
        focusStep();
      } catch (e) {
        setResults(null);
        setError((e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [initial.roomType],
  );

  // Arriving with dates (from the homepage search or a room page) runs the search immediately.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !initial.checkIn || !initial.checkOut) return;
    autoRan.current = true;
    void runSearch({
      checkIn: initial.checkIn,
      checkOut: initial.checkOut,
      adults: initial.adults ?? 2,
      children: initial.children ?? 0,
    });
  }, [initial, runSearch]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void runSearch(search);
  }

  async function onBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !results) return;
    const form = new FormData(e.currentTarget);
    setBusy("book");
    setError(null);
    setFieldErrors({});
    try {
      const guest = {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
      };
      const data = await post<{ booking: HeldBooking; payment: CheckoutOrder; accessToken: string }>(
        "/api/bookings",
        {
          ...results.for,
          roomType: selected.roomType.slug,
          guest,
          specialRequests: form.get("specialRequests") || undefined,
          website: form.get("website") || undefined,
        },
      );
      setHeld({
        ...data.booking,
        payment: data.payment,
        accessToken: data.accessToken,
        prefill: { name: guest.name, email: guest.email, contact: guest.phone.replace(/\s+/g, "") },
      });
      // HoldConfirmation scrolls itself into view and takes focus when it mounts.
    } catch (err) {
      const details = (err as { details?: { field: string; message: string }[] }).details;
      if (details?.length) {
        setFieldErrors(Object.fromEntries(details.map((d) => [d.field.replace("guest.", ""), d.message])));
      }
      setError((err as Error).message);
      if ((err as { code?: string }).code === "NOT_AVAILABLE") void runSearch(results.for);
    } finally {
      setBusy(null);
    }
  }

  /* ------------------------------------------------------------ Held */
  if (held) {
    return (
      <HoldConfirmation
        held={held}
        showSampleBadges={showSampleBadges}
        resortName={resortName}
        stepRef={stepRef}
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {/* Step 1 — search */}
        <form onSubmit={onSearch} className="grid gap-5 sm:grid-cols-2" aria-label="Search availability">
          <label className="block">
            <span className={label}>Check-in</span>
            <input
              type="date"
              name="checkIn"
              required
              min={today}
              value={search.checkIn}
              onChange={(e) => {
                const checkIn = e.target.value;
                setSearch((s) => ({
                  ...s,
                  checkIn,
                  checkOut:
                    s.checkOut && s.checkOut > checkIn ? s.checkOut : checkIn ? addDays(checkIn, 1) : "",
                }));
              }}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Check-out</span>
            <input
              type="date"
              name="checkOut"
              required
              min={search.checkIn ? addDays(search.checkIn, 1) : addDays(today, 1)}
              value={search.checkOut}
              onChange={(e) => setSearch((s) => ({ ...s, checkOut: e.target.value }))}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Adults</span>
            <select
              name="adults"
              value={search.adults}
              onChange={(e) => setSearch((s) => ({ ...s, adults: Number(e.target.value) }))}
              className={field}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Children</span>
            <select
              name="children"
              value={search.children}
              onChange={(e) => setSearch((s) => ({ ...s, children: Number(e.target.value) }))}
              className={field}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy !== null}
              className="bg-forest text-cream hover:bg-mountain inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-8 font-semibold transition-colors disabled:opacity-60 sm:w-auto"
            >
              <CalendarDays className="size-5" aria-hidden="true" />
              {busy === "search" ? "Checking…" : "Check availability"}
            </button>
          </div>
        </form>

        <p role="alert" aria-live="assertive" className="text-earth mt-6 empty:hidden">
          {error}
        </p>

        {/* Step 2 — choose a room */}
        {results && (
          <div ref={stepRef} tabIndex={-1} className="mt-12 outline-none">
            <h2 className="text-h3">
              {results.nights} night{results.nights === 1 ? "" : "s"} · {formatStayDate(results.for.checkIn)}{" "}
              → {formatStayDate(results.for.checkOut)}
            </h2>
            <ul className="mt-6 space-y-5">
              {results.options.map((o) => (
                <RoomOption
                  key={o.roomType.slug}
                  option={o}
                  selected={selected?.roomType.slug === o.roomType.slug}
                  onSelect={() => {
                    setSelected(o);
                    setError(null);
                    requestAnimationFrame(() =>
                      document.getElementById("guest-details")?.scrollIntoView({ behavior: "smooth" }),
                    );
                  }}
                  guests={results.for}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Step 3 — guest details */}
        {selected?.quote && results && (
          <form
            id="guest-details"
            onSubmit={onBook}
            className="mt-14 scroll-mt-28"
            aria-label="Guest details"
          >
            <h2 className="text-h3">Your details</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={label}>Full name</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  className={field}
                  aria-invalid={!!fieldErrors.name}
                />
                {fieldErrors.name && (
                  <span className="text-earth mt-1 block text-sm">{fieldErrors.name}</span>
                )}
              </label>
              <label className="block">
                <span className={label}>Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                  className={field}
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <span className="text-earth mt-1 block text-sm">{fieldErrors.email}</span>
                )}
              </label>
              <label className="block">
                <span className={label}>Phone (with country code)</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  defaultValue="+91 "
                  maxLength={20}
                  autoComplete="tel"
                  className={field}
                  aria-invalid={!!fieldErrors.phone}
                />
                {fieldErrors.phone && (
                  <span className="text-earth mt-1 block text-sm">{fieldErrors.phone}</span>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>
                  Special requests <span className="text-ink-muted font-normal">(optional)</span>
                </span>
                <textarea name="specialRequests" rows={3} maxLength={1000} className={`${field} py-3`} />
              </label>
              <div className="hidden" aria-hidden="true">
                <label>
                  Leave empty
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </div>

            <details className="bg-beige/60 mt-6 rounded-lg p-4 text-[0.9375rem]">
              <summary className="text-forest cursor-pointer font-semibold">
                Booking & cancellation policy
              </summary>
              <p className="text-ink-muted mt-3">{policies.booking}</p>
              <p className="text-ink-muted mt-2">{policies.cancellation}</p>
            </details>
            <label className="mt-5 flex items-start gap-3 text-[0.9375rem]">
              <input type="checkbox" required className="accent-forest mt-1 size-5 shrink-0" />
              <span>I have read and accept the booking and cancellation policy.</span>
            </label>

            <button
              type="submit"
              disabled={busy !== null}
              className="bg-forest text-cream hover:bg-mountain mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-full px-8 text-base font-semibold transition-colors disabled:opacity-60"
            >
              {busy === "book"
                ? "Reserving your room…"
                : `Continue — advance ${formatPaise(selected.quote.advancePaise)}`}
            </button>
          </form>
        )}
      </div>

      {/* Summary */}
      <aside className="lg:col-span-5" aria-label="Booking summary">
        <div className="bg-beige rounded-2xl p-6 sm:p-8 lg:sticky lg:top-28">
          {selected?.quote && results ? (
            <PriceSummary name={selected.roomType.name} quote={selected.quote} search={results.for} />
          ) : (
            <>
              <h2 className="text-h3">How booking works</h2>
              <ol className="text-ink-muted mt-4 space-y-3 text-[0.9375rem]">
                {[
                  "Choose your dates and see live availability.",
                  "Pick a room — the full price and advance amount are shown before you pay.",
                  "Pay the advance online to confirm; the balance is paid at the resort.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="bg-forest text-cream inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function RoomOption({
  option,
  selected,
  onSelect,
  guests,
}: {
  option: AvailabilityOption;
  selected: boolean;
  onSelect: () => void;
  guests: Search;
}) {
  const { roomType: rt, quote } = option;
  const reason =
    option.availableUnits === 0
      ? "Fully booked for these dates"
      : !option.fitsGuests
        ? `Fits up to ${rt.maxOccupancy} guests (${rt.maxAdults} adults, ${rt.maxChildren} children)`
        : null;

  return (
    <li
      className={`grid gap-4 rounded-2xl border p-4 transition-colors sm:grid-cols-[10rem_1fr] sm:p-5 ${
        selected ? "border-forest bg-white" : "border-line bg-white/60"
      } ${reason ? "opacity-70" : ""}`}
    >
      {rt.image && (
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg sm:aspect-square">
          <Image
            src={rt.image.src}
            alt={rt.image.alt}
            fill
            sizes="(min-width: 640px) 160px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col">
        <h3 className="text-h3">{rt.name}</h3>
        <p className="text-ink-muted mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" /> Up to {rt.maxOccupancy}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="size-4" aria-hidden="true" /> {rt.bedConfiguration}
          </span>
        </p>
        {quote ? (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-forest font-serif text-3xl font-semibold">{formatPaise(quote.totalPaise)}</p>
              <p className="text-ink-muted text-sm">
                {quote.nights} night{quote.nights === 1 ? "" : "s"} ·{" "}
                {guestsLabel(guests.adults, guests.children)}
                {option.availableUnits <= 2 && ` · only ${option.availableUnits} left`}
              </p>
            </div>
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors ${
                selected ? "bg-forest text-cream" : "text-forest ring-forest/30 hover:bg-beige ring-1"
              }`}
            >
              {selected && <Check className="size-4" aria-hidden="true" />}
              {selected ? "Selected" : "Select"}
              <span className="sr-only"> {rt.name}</span>
            </button>
          </div>
        ) : (
          <p className="text-earth mt-4 text-sm font-medium">{reason}</p>
        )}
      </div>
    </li>
  );
}

function PriceSummary({ name, quote, search }: { name: string; quote: Quote; search: Search }) {
  const uniform = quote.nightly.every((n) => n.pricePaise === quote.nightly[0].pricePaise);
  return (
    <>
      <h2 className="text-h3">{name}</h2>
      <p className="text-ink-muted mt-1 text-sm">
        {formatStayDate(search.checkIn)} → {formatStayDate(search.checkOut)} ·{" "}
        {guestsLabel(search.adults, search.children)}
      </p>
      <dl className="border-line mt-6 space-y-2 border-t pt-5 text-[0.9375rem]">
        {uniform ? (
          <Row
            label={`${formatPaise(quote.nightly[0].pricePaise)} × ${quote.nights} night${quote.nights === 1 ? "" : "s"}`}
            value={formatPaise(quote.subtotalPaise)}
          />
        ) : (
          quote.nightly.map((n) => (
            <Row key={n.date} label={formatStayDate(n.date)} value={formatPaise(n.pricePaise)} />
          ))
        )}
        {quote.taxPercent > 0 && (
          <Row
            label={
              quote.pricesIncludeTax
                ? `Includes taxes (${quote.taxPercent}%)`
                : `Taxes (${quote.taxPercent}%)`
            }
            value={formatPaise(quote.taxPaise)}
            muted={quote.pricesIncludeTax}
          />
        )}
        <Row label="Total" value={formatPaise(quote.totalPaise)} strong />
      </dl>
      <dl className="border-line mt-5 space-y-2 border-t pt-5 text-[0.9375rem]">
        <Row
          label={`Advance payable now (${quote.advancePercent}%)`}
          value={formatPaise(quote.advancePaise)}
          strong
        />
        <Row label="Balance payable at the resort" value={formatPaise(quote.balancePaise)} />
      </dl>
    </>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "text-forest font-semibold" : ""} ${muted ? "text-ink-muted" : ""}`}
    >
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

function HoldConfirmation({
  held,
  showSampleBadges,
  resortName,
  stepRef,
}: {
  held: Held;
  showSampleBadges: boolean;
  resortName: string;
  stepRef: RefObject<HTMLDivElement | null>;
}) {
  const [minutesLeft, setMinutesLeft] = useState(() =>
    Math.max(0, Math.ceil((Date.parse(held.holdExpiresAt) - Date.now()) / 60_000)),
  );
  // The confirmation replaces the whole form: bring it into view and move focus to it.
  useEffect(() => {
    const el = stepRef.current;
    if (!el) return;
    // One instant scroll (the site uses smooth scrolling, which a second call would interrupt);
    // 96px keeps the heading clear of the fixed header.
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    el.focus({ preventScroll: true });
  }, [stepRef]);

  useEffect(() => {
    const id = setInterval(
      () => setMinutesLeft(Math.max(0, Math.ceil((Date.parse(held.holdExpiresAt) - Date.now()) / 60_000))),
      15_000,
    );
    return () => clearInterval(id);
  }, [held.holdExpiresAt]);

  return (
    <div ref={stepRef} tabIndex={-1} className="grid gap-12 outline-none lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="eyebrow">Booking reference {held.code}</p>
        <h2 className="text-h2 mt-3">
          Your room is reserved for {minutesLeft} more minute{minutesLeft === 1 ? "" : "s"}
        </h2>
        <p className="text-ink-muted mt-4 text-lg">
          Pay the advance of <strong className="text-forest">{formatPaise(held.quote.advancePaise)}</strong>{" "}
          to confirm your stay. If payment isn&apos;t completed in time, the room is released automatically.
        </p>
        <p className="text-ink-muted mt-3 flex items-center gap-2 text-sm">
          <Clock className="size-4" aria-hidden="true" /> Held until{" "}
          {new Date(held.holdExpiresAt).toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST
        </p>

        <div className="mt-8">
          <PayButton
            order={held.payment}
            bookingCode={held.code}
            accessToken={held.accessToken}
            resortName={resortName}
            prefill={held.prefill}
          />
        </div>
        {showSampleBadges && (
          <p className="bg-earth/10 text-earth mt-4 rounded-lg p-3 text-sm">
            Test mode: use Razorpay test cards or the UPI ID <code>success@razorpay</code>. No real money is
            charged.
          </p>
        )}
      </div>
      <aside className="lg:col-span-5">
        <div className="bg-beige rounded-2xl p-6 sm:p-8">
          <PriceSummary name={held.roomType.name} quote={held.quote} search={held} />
        </div>
      </aside>
    </div>
  );
}
