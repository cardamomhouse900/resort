import { Photo } from "@/components/ui/Photo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { img } from "@/content/placeholder-images";
import { revealDelay } from "@/utils/style";

const facts = [
  { title: "Mountain views", text: "Green slopes and valley views from every corner of the property." },
  { title: "Family friendly", text: "Open lawns, campfire evenings and space for children to play." },
  { title: "Off-road trails", text: "Rough mountain tracks and viewpoints a short drive away." },
];

export function Intro() {
  return (
    <section id="welcome" className="scroll-mt-20 py-20 md:py-32">
      <div className="container-page grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6 xl:col-span-5">
          <p className="eyebrow" data-reveal>
            01 — Welcome
          </p>
          <h2 className="text-h1 mt-4" data-reveal>
            A quiet place in the hills, made for slowing down.
          </h2>
          <div className="text-ink-muted mt-6 space-y-4 text-lg" data-reveal>
            <p>
              Tucked into green mountain slopes, our resort is a place to breathe fresh air, listen to the
              birds and watch the mist roll through the valley. Days are for walks, off-road drives and long
              meals; evenings are for the campfire.
            </p>
            <p>
              Comfortable cottages, honest home-style food and friendly people — everything you need, and
              nothing that gets in the way of the view.
            </p>
          </div>
          <ButtonLink href="/rooms" variant="secondary" className="mt-8" data-reveal>
            Explore the rooms
          </ButtonLink>
        </div>

        <div className="relative lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7">
          <div className="grid grid-cols-12 gap-4">
            <Photo
              image={img.lushValley}
              sizes="(min-width: 1024px) 34vw, 66vw"
              className="col-span-8 aspect-[4/5] rounded-sm"
              reveal
            />
            <Photo
              image={img.cabinsPath}
              sizes="(min-width: 1024px) 17vw, 33vw"
              className="col-span-4 mb-[-3rem] aspect-[3/4] self-end rounded-sm md:mb-[-5rem]"
              compactBadge
              reveal
              style={revealDelay(150)}
            />
          </div>
        </div>
      </div>

      <div className="container-page mt-24 md:mt-32">
        <ul className="border-line grid gap-10 border-t pt-10 sm:grid-cols-3">
          {facts.map((f, i) => (
            <li key={f.title} data-reveal style={revealDelay(i * 100)}>
              <p className="text-h3 text-forest font-serif">{f.title}</p>
              <p className="text-ink-muted mt-2">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
