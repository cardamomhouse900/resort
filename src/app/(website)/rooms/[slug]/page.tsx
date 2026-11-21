import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, Maximize, Users } from "lucide-react";
import { BookingCta } from "@/components/homepage/BookingCta";
import { RoomCard } from "@/components/rooms/RoomCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { GalleryCarousel } from "@/components/ui/GalleryCarousel";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { showSampleBadges } from "@/config/site";
import { getRoomTypeBySlug, getRoomTypes } from "@/services/content";
import { formatINR } from "@/utils/format";

export async function generateStaticParams() {
  const rooms = await getRoomTypes();
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/rooms/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomTypeBySlug(slug);
  if (!room) return {};
  return {
    title: room.name,
    description: `${room.summary} Sleeps up to ${room.maxOccupancy}. From ${formatINR(room.pricePerNight)} per night.`,
    alternates: { canonical: `/rooms/${room.slug}` },
    openGraph: { images: [{ url: room.images[0].src, alt: room.images[0].alt }] },
  };
}

export default async function RoomDetailPage({ params }: PageProps<"/rooms/[slug]">) {
  const { slug } = await params;
  const [room, allRooms] = await Promise.all([getRoomTypeBySlug(slug), getRoomTypes()]);
  if (!room) notFound();

  const others = allRooms.filter((r) => r.slug !== room.slug);
  const bookHref = `/booking?room=${room.slug}`;

  return (
    <>
      <PageHero
        title={room.name}
        eyebrow="Rooms & cottages"
        intro={room.summary}
        image={room.images[0]}
        breadcrumbs={[
          { name: "Rooms", href: "/rooms" },
          { name: room.name, href: `/rooms/${room.slug}` },
        ]}
      />

      <section className="container-page grid gap-14 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          {room.isPlaceholder && <SampleBadge label="Sample description & price" />}
          <h2 className="text-h2 mt-3">
            About this {room.name.toLowerCase().includes("cottage") ? "cottage" : "room"}
          </h2>
          <div className="text-ink-muted mt-6 space-y-5 text-lg">
            {room.description.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>

          <h2 className="text-h3 mt-14">Amenities</h2>
          <ul className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {room.amenities.map((a) => (
              <li key={a.name} className="flex items-center gap-3">
                <span className="bg-beige text-forest inline-flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon name={a.icon} className="size-[1.125rem]" />
                </span>
                {a.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Booking summary — sticky on desktop */}
        <aside className="lg:col-span-5" aria-label="Price and capacity">
          <div className="bg-beige rounded-2xl p-6 sm:p-8 lg:sticky lg:top-28">
            <p className="text-forest">
              <span className="font-serif text-5xl font-semibold">{formatINR(room.pricePerNight)}</span>
              <span className="text-ink-muted"> / night</span>
            </p>
            <p className="text-ink-muted mt-2 text-sm">
              Your total and the advance payment amount are shown before you pay.
            </p>
            <dl className="border-line mt-6 space-y-3 border-t pt-6 text-[0.9375rem]">
              <div className="flex items-center gap-3">
                <dt>
                  <Users className="text-olive size-4" aria-hidden="true" />

                  <span className="sr-only">Capacity</span>
                </dt>
                <dd>
                  Up to {room.maxOccupancy} guests ({room.maxAdults} adults
                  {room.maxChildren > 0
                    ? `, ${room.maxChildren} ${room.maxChildren === 1 ? "child" : "children"}`
                    : ""}
                  )
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt>
                  <BedDouble className="text-olive size-4" aria-hidden="true" />

                  <span className="sr-only">Beds</span>
                </dt>
                <dd>{room.bedConfiguration}</dd>
              </div>
              {room.sizeSqFt && (
                <div className="flex items-center gap-3">
                  <dt>
                    <Maximize className="text-olive size-4" aria-hidden="true" />

                    <span className="sr-only">Size</span>
                  </dt>
                  <dd>{room.sizeSqFt} sq ft</dd>
                </div>
              )}
            </dl>
            <ButtonLink href={bookHref} className="mt-8 w-full">
              Book Now
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" className="mt-3 w-full">
              Ask a question
            </ButtonLink>
          </div>
        </aside>
      </section>

      {room.images.length > 1 && (
        <section aria-labelledby="room-gallery" className="bg-beige overflow-hidden py-16 md:py-24">
          <div className="container-page">
            <h2 id="room-gallery" className="text-h2 mb-10">
              Photos
            </h2>
            <GalleryCarousel items={room.images} showBadges={showSampleBadges} />
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="other-rooms" className="container-page py-20 md:py-28">
          <h2 id="other-rooms" className="text-h2">
            Other places to stay
          </h2>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2">
            {others.map((r) => (
              <li key={r.slug}>
                <RoomCard room={r} sizes="(min-width: 640px) 45vw, 100vw" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <BookingCta />
    </>
  );
}
