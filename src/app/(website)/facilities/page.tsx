import type { Metadata } from "next";
import { BookingCta } from "@/components/homepage/BookingCta";
import { Icon } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { Photo } from "@/components/ui/Photo";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { img } from "@/content/placeholder-images";
import { getFacilities } from "@/services/content";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Resort Facilities & Amenities",
    description:
      "Restaurant, campfire evenings, outdoor seating, free parking, Wi-Fi, indoor and outdoor games — the facilities that make your mountain stay easy.",
    path: "/facilities",
    image: img.patio,
  });
}

export default async function FacilitiesPage() {
  const facilities = await getFacilities();
  const featured = facilities.filter((f) => f.image);
  const others = facilities.filter((f) => !f.image);

  return (
    <>
      <PageHero
        title="Facilities"
        eyebrow="Your stay"
        intro="The essentials for a relaxed stay in the hills: good food, warm rooms, places to sit outside and plenty to do."
        image={img.patio}
        breadcrumbs={[{ name: "Facilities", href: "/facilities" }]}
      />

      <section className="container-page py-20 md:py-28" aria-label="Featured facilities">
        <ul className="grid gap-x-8 gap-y-16 md:grid-cols-2">
          {featured.map((f, i) => (
            <li key={f.slug} id={f.slug} className={`scroll-mt-28 ${i % 2 === 1 ? "md:mt-24" : ""}`}>
              {f.image && (
                <Photo
                  image={f.image}
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="aspect-[4/3] rounded-sm"
                  reveal
                />
              )}
              <div className="mt-6 flex items-start gap-4" data-reveal>
                <span className="bg-beige text-forest inline-flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon name={f.icon} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-h3">{f.name}</h2>
                    {f.isPlaceholder && <SampleBadge />}
                  </div>
                  <p className="text-ink-muted mt-2">{f.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {others.length > 0 && (
        <section className="bg-beige py-20 md:py-28" aria-labelledby="more-facilities">
          <div className="container-page">
            <SectionHeading id="more-facilities" eyebrow="Also available" title="Practical comforts" />
            <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((f) => (
                <li key={f.slug} id={f.slug} className="flex scroll-mt-28 gap-4" data-reveal>
                  <span className="bg-cream text-forest inline-flex size-11 shrink-0 items-center justify-center rounded-full">
                    <Icon name={f.icon} />
                  </span>
                  <div>
                    <h3 className="text-forest font-sans text-base font-semibold">{f.name}</h3>
                    <p className="text-ink-muted mt-1 text-[0.9375rem]">{f.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <BookingCta />
    </>
  );
}
