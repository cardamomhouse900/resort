import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Activity } from "@/types/content";
import { activityPriceLabel } from "@/utils/format";

/** Alternating image/text rows for three featured experiences. */
export function ActivitiesOverview({ activities }: { activities: Activity[] }) {
  return (
    <section aria-labelledby="activities-title" className="py-20 md:py-32">
      <div className="container-page">
        <SectionHeading
          id="activities-title"
          eyebrow="06 — Experiences"
          title="Slow mornings, active afternoons, fireside evenings"
          intro="Pick as much or as little as you like. Some experiences are included with your stay; others can be arranged at the reception."
        />

        <ul className="mt-16 space-y-20 md:mt-24 md:space-y-28">
          {activities.map((a, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={a.slug} className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
                <Photo
                  image={a.images[0]}
                  sizes="(min-width: 768px) 55vw, 100vw"
                  className={`aspect-[3/2] rounded-sm md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}
                  reveal
                />
                <div
                  className={`md:col-span-5 ${flip ? "md:order-1 md:col-start-1 md:row-start-1" : ""}`}
                  data-reveal
                >
                  <p className="text-olive/50 font-serif text-6xl leading-none" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-h2 mt-4">{a.title}</h3>
                  <p className="text-ink-muted mt-4 text-lg">{a.summary}</p>
                  <p className="text-ink-muted mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4" aria-hidden="true" /> {a.duration}
                    </span>
                    <span>{activityPriceLabel(a.priceFrom, a.priceNote)}</span>
                  </p>
                  <Link
                    href={`/activities#${a.slug}`}
                    className="text-forest mt-6 inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
                  >
                    Learn more <ArrowRight className="size-4" aria-hidden="true" />
                    <span className="sr-only">about {a.title}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-20 text-center">
          <ButtonLink href="/activities" variant="secondary">
            See all activities
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
