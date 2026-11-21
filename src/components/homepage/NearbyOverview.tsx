import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Place } from "@/types/content";

/** Numbered editorial list of places to explore, linking to both listing pages. */
export function NearbyOverview({ nearby, attractions }: { nearby: Place[]; attractions: Place[] }) {
  const items = [
    ...nearby.slice(0, 2).map((p) => ({ ...p, href: `/nearby-places#${p.slug}`, kind: "Nearby" })),
    ...attractions.slice(0, 2).map((p) => ({ ...p, href: `/attractions#${p.slug}`, kind: "Attraction" })),
  ];

  return (
    <section aria-labelledby="explore-title" className="py-20 md:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              id="explore-title"
              eyebrow="08 — Explore"
              title="Beyond the resort"
              intro="Tea gardens, waterfalls and viewpoints to discover on day trips. Distances and travel times will be confirmed before launch."
            />
            <div className="text-forest mt-8 flex flex-col gap-3" data-reveal>
              <Link
                href="/nearby-places"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                Nearby places <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/attractions"
                className="inline-flex items-center gap-2 font-semibold hover:underline"
              >
                Tourist attractions <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <ol className="divide-line border-line divide-y border-y lg:col-span-8">
          {items.map((p, i) => (
            <li
              key={p.slug}
              className="group relative grid grid-cols-[auto_1fr] gap-5 py-7 sm:grid-cols-[auto_1fr_10rem] sm:gap-8"
              data-reveal
            >
              <span className="text-olive font-serif text-3xl" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-olive-ink text-xs font-semibold tracking-[0.16em] uppercase">{p.kind}</p>
                <h3 className="text-h3 mt-1">
                  <Link href={p.href} className="group-hover:underline after:absolute after:inset-0">
                    {p.name}
                  </Link>
                </h3>
                <p className="text-ink-muted mt-2">{p.description}</p>
                <p className="text-earth mt-3 text-sm">Distance: {p.distance}</p>
              </div>
              <Photo
                image={p.image}
                sizes="160px"
                className="col-span-2 aspect-[16/9] rounded-sm max-sm:order-first sm:col-span-1 sm:aspect-[4/5]"
                compactBadge
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
