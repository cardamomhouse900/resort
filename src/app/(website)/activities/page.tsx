import type { Metadata } from "next";
import { Clock, IndianRupee } from "lucide-react";
import { BookingCta } from "@/components/homepage/BookingCta";
import { PageHero } from "@/components/ui/PageHero";
import { Photo } from "@/components/ui/Photo";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { img } from "@/content/placeholder-images";
import { getActivities } from "@/services/content";
import { activityPriceLabel } from "@/utils/format";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Activities & Experiences",
    description:
      "Off-road trail drives, guided nature walks, sunrise treks, campfire evenings and picnics — outdoor experiences for families and friends in the mountains.",
    path: "/activities",
    image: img.jeepRoad,
  });
}

export default async function ActivitiesPage() {
  const activities = await getActivities();

  return (
    <>
      <PageHero
        title="Activities & experiences"
        eyebrow="Things to do"
        intro="From muddy trail drives to quiet mornings in the mist — choose your own pace. Details below are samples until confirmed."
        image={img.jeepRoad}
        breadcrumbs={[{ name: "Activities", href: "/activities" }]}
      />

      <section className="container-page py-20 md:py-28">
        <ul className="space-y-24 md:space-y-32">
          {activities.map((a, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={a.slug} id={a.slug} className="grid scroll-mt-28 gap-10 md:grid-cols-12 md:gap-12">
                <div className={`grid grid-cols-6 gap-3 md:col-span-7 ${flip ? "md:order-2" : ""}`}>
                  <Photo
                    image={a.images[0]}
                    sizes="(min-width: 768px) 55vw, 100vw"
                    className="col-span-6 aspect-[3/2] rounded-sm"
                    reveal
                  />
                  {a.images.slice(1, 3).map((image, _, extras) => (
                    <Photo
                      key={image.src}
                      image={image}
                      sizes="(min-width: 768px) 27vw, 50vw"
                      className={`aspect-[4/3] rounded-sm ${
                        extras.length === 1
                          ? `col-span-4 ${flip ? "col-start-1" : "col-start-3"} border-cream -mt-12 border-8 md:-mt-20`
                          : "col-span-3"
                      }`}
                      compactBadge
                      reveal
                    />
                  ))}
                </div>
                <div className={`self-center md:col-span-5 ${flip ? "md:order-1" : ""}`} data-reveal>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="eyebrow">{a.category}</p>
                    {a.isPlaceholder && <SampleBadge label="Sample activity" />}
                  </div>
                  <h2 className="text-h2 mt-3">{a.title}</h2>
                  <p className="text-ink-muted mt-5 text-lg">{a.description}</p>
                  <dl className="border-line mt-7 space-y-3 border-t pt-5">
                    <div className="flex items-center gap-3">
                      <dt>
                        <Clock className="text-olive size-4" aria-hidden="true" />

                        <span className="sr-only">Duration</span>
                      </dt>
                      <dd>{a.duration}</dd>
                    </div>
                    <div className="flex items-center gap-3">
                      <dt>
                        <IndianRupee className="text-olive size-4" aria-hidden="true" />

                        <span className="sr-only">Price</span>
                      </dt>
                      <dd>{activityPriceLabel(a.priceFrom, a.priceNote)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <BookingCta title="Plan your days in the hills." image={img.campfireGuitar} />
    </>
  );
}
