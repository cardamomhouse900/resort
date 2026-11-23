import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Maximize, Users } from "lucide-react";
import { BookingCta } from "@/components/homepage/BookingCta";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { Photo } from "@/components/ui/Photo";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { img } from "@/content/placeholder-images";
import { getRoomTypes } from "@/services/content";
import { formatINR } from "@/utils/format";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Rooms & Cottages",
    description:
      "Comfortable cottages and rooms surrounded by greenery and mountain views — for couples, friends and families. See occupancy, beds, amenities and prices.",
    path: "/rooms",
    image: img.cabinsPath,
  });
}

export default async function RoomsPage() {
  const rooms = await getRoomTypes();

  return (
    <>
      <PageHero
        title="Rooms & cottages"
        eyebrow="Stay with us"
        intro="Simple, comfortable spaces with views of the hills. Every stay includes access to the restaurant, campfire evenings and the walking paths."
        image={img.cabinsPath}
        breadcrumbs={[{ name: "Rooms", href: "/rooms" }]}
      />

      <section className="container-page py-20 md:py-28" aria-label="Room types">
        <ul className="space-y-24 md:space-y-32">
          {rooms.map((room, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={room.slug} className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                <Link
                  href={`/rooms/${room.slug}`}
                  className={`group block lg:col-span-7 ${flip ? "lg:order-2" : ""}`}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Photo
                    image={room.images[0]}
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="aspect-[4/3] rounded-sm"
                    imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    reveal
                  />
                </Link>

                <div className={`self-center lg:col-span-5 ${flip ? "lg:order-1" : ""}`} data-reveal>
                  {room.isPlaceholder && <SampleBadge label="Sample room & price" />}
                  <h2 className="text-h1 mt-3">{room.name}</h2>
                  <p className="text-ink-muted mt-4 text-lg">{room.summary}</p>

                  <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
                    <li className="inline-flex items-center gap-2">
                      <Users className="text-olive size-4" aria-hidden="true" />
                      Up to {room.maxOccupancy} guests
                    </li>
                    <li className="inline-flex items-center gap-2">
                      <BedDouble className="text-olive size-4" aria-hidden="true" />
                      {room.bedConfiguration}
                    </li>
                    {room.sizeSqFt && (
                      <li className="inline-flex items-center gap-2">
                        <Maximize className="text-olive size-4" aria-hidden="true" />
                        {room.sizeSqFt} sq ft
                      </li>
                    )}
                  </ul>

                  <ul className="border-line text-ink-muted mt-6 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-6 text-[0.9375rem]">
                    {room.amenities.slice(0, 6).map((a) => (
                      <li key={a.name} className="flex items-center gap-2">
                        <Icon name={a.icon} className="text-olive size-4 shrink-0" />
                        {a.name}
                      </li>
                    ))}
                  </ul>

                  <p className="text-forest mt-8">
                    <span className="font-serif text-4xl font-semibold">{formatINR(room.pricePerNight)}</span>
                    <span className="text-ink-muted"> / night</span>
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <ButtonLink href={`/booking?room=${room.slug}`}>Book Now</ButtonLink>
                    <ButtonLink href={`/rooms/${room.slug}`} variant="secondary">
                      Explore Room <span className="sr-only">— {room.name}</span>
                    </ButtonLink>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <BookingCta />
    </>
  );
}
