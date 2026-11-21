import { SampleBadge } from "@/components/ui/SampleBadge";
import type { Testimonial } from "@/types/content";

/**
 * Guest quotes on a CSS scroll-snap rail (no JS). Renders nothing when there
 * are no real testimonials — sample quotes are filtered out in production by
 * the content service, and no ratings/review markup is ever generated.
 */
export function Testimonials({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="words-title" className="bg-beige py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-wrap items-center gap-3" data-reveal>
          <p className="eyebrow">09 — Guest Words</p>
          {items.some((t) => t.isPlaceholder) && <SampleBadge label="Sample quotes" />}
        </div>
        <h2 id="words-title" className="sr-only">
          What guests say
        </h2>

        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-8 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8">
          {items.map((t, i) => (
            <li key={i} className="w-[88%] shrink-0 snap-start md:w-[70%] lg:w-[48%]" data-reveal>
              <figure>
                <span className="text-earth font-serif text-7xl leading-none" aria-hidden="true">
                  “
                </span>
                <blockquote className="text-forest -mt-6 font-serif text-[clamp(1.5rem,2.6vw,2.25rem)] leading-snug">
                  {t.quote}
                </blockquote>
                <figcaption className="text-ink-muted mt-6 text-sm">
                  <span className="text-forest font-semibold">{t.author}</span>
                  {t.context && <> · {t.context}</>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
