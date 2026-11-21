import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { img } from "@/content/placeholder-images";
import type { Facility } from "@/types/content";

export function FacilitiesOverview({ facilities }: { facilities: Facility[] }) {
  return (
    <section aria-labelledby="facilities-title" className="py-20 md:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-16">
        <Photo
          image={img.patio}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="aspect-[4/3] rounded-sm lg:sticky lg:top-28 lg:col-span-5 lg:aspect-[3/4] lg:self-start"
          reveal
        />
        <div className="lg:col-span-7">
          <SectionHeading
            id="facilities-title"
            eyebrow="04 — Facilities"
            title="Everything you need for an easy stay"
            intro="Good food, warm water, a fire in the evening and space to play. The essentials, done well."
          />
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {facilities.slice(0, 8).map((f) => (
              <li key={f.slug} className="flex gap-4" data-reveal>
                <span className="bg-beige text-forest mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon name={f.icon} />
                </span>
                <div>
                  <h3 className="text-forest font-sans text-base font-semibold">{f.name}</h3>
                  <p className="text-ink-muted mt-1 text-[0.9375rem]">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <ButtonLink href="/facilities" variant="secondary" className="mt-12">
            All facilities
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
