import { ButtonLink } from "@/components/ui/ButtonLink";
import { Photo } from "@/components/ui/Photo";
import { SampleBadge } from "@/components/ui/SampleBadge";
import type { Activity } from "@/types/content";
import { formatINR } from "@/utils/format";

/** Deep-green split section featuring the off-road experience. */
export function OffRoad({ activity }: { activity: Activity }) {
  return (
    <section aria-labelledby="offroad-title" className="bg-forest text-cream">
      <div className="grid lg:grid-cols-2">
        <Photo
          image={activity.images[0]}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-[4/3] lg:aspect-auto lg:min-h-[720px]"
          reveal
        />
        <div className="flex items-center px-4 py-16 sm:px-8 md:py-24 lg:px-16 xl:px-24">
          <div className="max-w-xl" data-reveal>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow text-beige!">05 — Off-Road Adventures</p>
              {activity.isPlaceholder && <SampleBadge label="Sample experience" />}
            </div>
            <h2 id="offroad-title" className="text-h1 text-cream! mt-4">
              Mud, rocks and the best views in the hills.
            </h2>
            <p className="text-cream/85 mt-6 text-lg">{activity.description}</p>
            <dl className="border-cream/20 mt-8 grid grid-cols-2 gap-6 border-t pt-6">
              <div>
                <dt className="text-cream/75 text-sm">Duration</dt>
                <dd className="mt-1 font-serif text-2xl">{activity.duration}</dd>
              </div>
              {typeof activity.priceFrom === "number" && (
                <div>
                  <dt className="text-cream/75 text-sm">From</dt>
                  <dd className="mt-1 font-serif text-2xl">
                    {formatINR(activity.priceFrom)}
                    {activity.priceNote && (
                      <span className="text-cream/75 block font-sans text-sm">{activity.priceNote}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <ButtonLink href={`/activities#${activity.slug}`} variant="light" className="mt-10">
              About the trail drive
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
