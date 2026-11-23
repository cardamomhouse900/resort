import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { showSampleBadges } from "@/config/site";
import { getSiteSettings } from "@/services/content";
import { isISODate, todayAtResort } from "@/utils/dates";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Book Your Stay",
    description:
      "Check live availability, choose your room and reserve your mountain stay with a small advance payment.",
    path: "/booking",
  });
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const count = (v: string | undefined, min: number, max: number) => {
  const n = Number(v);
  return v !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const raw = (await searchParams) as Raw;
  const settings = await getSiteSettings();

  // Only well-formed values are passed on; the API validates everything again.
  const checkIn = one(raw.checkIn);
  const checkOut = one(raw.checkOut);
  const room = one(raw.room);
  const initial = {
    checkIn: isISODate(checkIn) ? checkIn : undefined,
    checkOut: isISODate(checkOut) ? checkOut : undefined,
    adults: count(one(raw.adults), 1, 6),
    children: count(one(raw.children), 0, 4),
    roomType: room && /^[a-z0-9-]{1,80}$/.test(room) ? room : undefined,
  };

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

      <section className="container-page py-14 md:py-20">
        <BookingFlow
          today={todayAtResort()}
          initial={initial}
          policies={{ booking: settings.bookingPolicy, cancellation: settings.cancellationPolicy }}
          showSampleBadges={showSampleBadges}
          resortName={settings.name}
        />
      </section>
    </>
  );
}
