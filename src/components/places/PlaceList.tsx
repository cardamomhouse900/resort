import { Clock, MapPin, Navigation, Route } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { SampleBadge } from "@/components/ui/SampleBadge";
import type { Place } from "@/types/content";

/** Editorial list used by the Nearby Places and Attractions pages. */
export function PlaceList({ places }: { places: Place[] }) {
  return (
    <ol className="space-y-20 md:space-y-28">
      {places.map((p, i) => {
        const flip = i % 2 === 1;
        return (
          <li
            key={p.slug}
            id={p.slug}
            className="grid scroll-mt-28 items-center gap-8 md:grid-cols-12 md:gap-12"
          >
            <Photo
              image={p.image}
              sizes="(min-width: 768px) 55vw, 100vw"
              className={`aspect-[3/2] rounded-sm md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}
              reveal
            />
            <div
              className={`md:col-span-5 ${flip ? "md:order-1 md:col-start-1 md:row-start-1" : ""}`}
              data-reveal
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-olive font-serif text-3xl" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {p.isPlaceholder && <SampleBadge label="Placeholder destination" />}
              </div>
              <h2 className="text-h2 mt-3">{p.name}</h2>
              <p className="text-ink-muted mt-4 text-lg">{p.description}</p>

              <dl className="border-line mt-6 grid grid-cols-1 gap-3 border-t pt-5 text-[0.9375rem] sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {[
                  { Icon: MapPin, label: "Location", value: p.location },
                  { Icon: Route, label: "Distance", value: p.distance },
                  { Icon: Clock, label: "Travel time", value: p.travelTime },
                ].map(({ Icon, label, value }) => (
                  // <dl> may only contain <div> wrappers of <dt>/<dd>, so the icon lives inside <dt>.
                  <div key={label}>
                    <dt className="text-olive-ink flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <Icon className="text-olive size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className="mt-1 pl-6">{value}</dd>
                  </div>
                ))}
              </dl>

              {p.directionsUrl ? (
                <a
                  href={p.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-forest ring-forest/30 hover:bg-beige mt-7 inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold ring-1 transition-colors"
                >
                  <Navigation className="size-4" aria-hidden="true" /> Get directions
                  <span className="sr-only">to {p.name} (opens Google Maps)</span>
                </a>
              ) : (
                <p className="text-ink-muted mt-7 inline-flex items-center gap-2 text-sm">
                  <Navigation className="size-4" aria-hidden="true" /> Directions link will be added once the
                  location is confirmed.
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
