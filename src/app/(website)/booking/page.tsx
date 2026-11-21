import type { Metadata } from "next";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { getRoomTypes, getSiteSettings } from "@/services/content";
import { formatINR, phoneDigits } from "@/utils/format";

export const metadata: Metadata = {
  title: "Book Your Stay",
  description:
    "Check availability, choose your room and reserve your mountain stay with a small advance payment.",
  alternates: { canonical: "/booking" },
};

type Search = { checkIn?: string; checkOut?: string; adults?: string; children?: string; room?: string };

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function nightsBetween(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut || !isoDate.test(checkIn) || !isoDate.test(checkOut)) return null;
  const diff = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
  return Number.isFinite(diff) && diff > 0 ? diff : null;
}

const field =
  "mt-2 block w-full min-h-12 rounded-lg border border-line bg-white px-4 text-base text-ink focus:border-forest focus:ring-2 focus:ring-forest/20 focus:outline-none";
const label = "text-sm font-semibold text-forest";

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const raw = (await searchParams) as Record<string, string | string[] | undefined>;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const date = (v?: string) => (v && isoDate.test(v) ? v : undefined);
  const count = (v: string | undefined, min: number, max: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? String(n) : undefined;
  };
  // Only well-formed values are echoed back. Real validation happens in the booking API (Phase 3).
  const sp: Search = {
    checkIn: date(one(raw.checkIn)),
    checkOut: date(one(raw.checkOut)),
    adults: count(one(raw.adults), 1, 6),
    children: count(one(raw.children), 0, 4),
    room: one(raw.room),
  };
  const [rooms, settings] = await Promise.all([getRoomTypes(), getSiteSettings()]);
  const selectedRoom = rooms.find((r) => r.slug === sp.room);
  const nights = nightsBetween(sp.checkIn, sp.checkOut);
  const hasSearch = Boolean(sp.checkIn || sp.checkOut);
  const whatsapp = `https://wa.me/${phoneDigits(settings.contact.whatsapp).replace("+", "")}`;

  return (
    <>
      <section className="bg-forest text-cream pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="container-page">
          <Breadcrumbs items={[{ name: "Book Your Stay", href: "/booking" }]} />
          <h1 className="text-h1 text-cream! mt-8">Book your stay</h1>
          <p className="text-cream/85 mt-4 max-w-2xl text-lg">
            Choose your dates and room. You&apos;ll see the total price and the advance amount before paying.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-12 py-14 md:py-20 lg:grid-cols-12">
        <form action="/booking" method="get" className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
          <label className="block">
            <span className={label}>Check-in</span>
            <input type="date" name="checkIn" required defaultValue={sp.checkIn} className={field} />
          </label>
          <label className="block">
            <span className={label}>Check-out</span>
            <input type="date" name="checkOut" required defaultValue={sp.checkOut} className={field} />
          </label>
          <label className="block">
            <span className={label}>Adults</span>
            <select name="adults" defaultValue={sp.adults ?? "2"} className={field}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={label}>Children</span>
            <select name="children" defaultValue={sp.children ?? "0"} className={field}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Room type</span>
            <select name="room" defaultValue={selectedRoom?.slug ?? ""} className={field}>
              <option value="">Any available room</option>
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name} — {formatINR(r.pricePerNight)} / night
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="bg-forest text-cream hover:bg-mountain inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-8 font-semibold transition-colors sm:w-auto"
            >
              <CalendarDays className="size-5" aria-hidden="true" /> Check availability
            </button>
          </div>
        </form>

        <aside className="lg:col-span-5" aria-live="polite">
          <div className="bg-beige rounded-2xl p-6 sm:p-8">
            {hasSearch ? (
              <>
                <h2 className="text-h3">Your search</h2>
                <dl className="mt-5 space-y-2 text-[0.9375rem]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Dates</dt>
                    <dd className="text-right">
                      {sp.checkIn || "—"} → {sp.checkOut || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Nights</dt>
                    <dd>{nights ?? "Please choose a check-out date after check-in"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Guests</dt>
                    <dd>
                      {sp.adults ?? 2} adults, {sp.children ?? 0} children
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Room</dt>
                    <dd className="text-right">{selectedRoom?.name ?? "Any available room"}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <h2 className="text-h3">How booking works</h2>
            )}

            <div className="border-line mt-6 border-t pt-6">
              <SampleBadge label="In development" />
              <p className="text-ink-muted mt-3">
                Live availability, price breakdown and secure advance payment are being connected. Until then,
                please contact us to reserve — we&apos;ll confirm your dates personally.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-forest text-cream hover:bg-mountain inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 font-semibold"
                >
                  <MessageCircle className="size-5" aria-hidden="true" /> WhatsApp us
                </a>
                <a
                  href={`tel:${phoneDigits(settings.contact.phone)}`}
                  className="text-forest ring-forest/30 hover:bg-cream inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 font-semibold ring-1"
                >
                  <Phone className="size-5" aria-hidden="true" /> Call
                </a>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
