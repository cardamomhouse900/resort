import { Parallax } from "@/components/ui/Parallax";
import { Photo } from "@/components/ui/Photo";
import { img } from "@/content/placeholder-images";
import { revealDelay } from "@/utils/style";

const moments = [
  {
    image: img.mistyTrees,
    title: "Morning mist",
    text: "Clouds settle in the valley and lift slowly as the sun climbs.",
  },
  {
    image: img.heroRoadValley,
    title: "Scenic roads",
    text: "Winding hill roads with a new view around every bend.",
  },
  {
    image: img.sunriseHills,
    title: "Golden evenings",
    text: "Soft light over the ridges before the stars come out.",
  },
];

export function Surroundings() {
  return (
    <section aria-labelledby="surroundings-title" className="pb-20 md:pb-32">
      {/* Full-bleed landscape */}
      <div className="bg-forest relative h-[70svh] min-h-[420px] overflow-hidden md:h-[90svh]">
        <Parallax>
          <Photo
            image={img.greenCloudy}
            sizes="100vw"
            className="h-full"
            badgePosition="parallax-bottom-right"
            overlay="bg-linear-to-r from-forest/80 via-forest/35 to-transparent"
          />
        </Parallax>
        <div className="container-page relative flex h-full items-start pt-16 md:pt-24">
          <div className="max-w-2xl" data-reveal>
            <p className="eyebrow text-beige!">02 — The Surroundings</p>
            <h2 id="surroundings-title" className="text-h1 text-cream! mt-4">
              Green slopes, open skies and air you can almost taste.
            </h2>
          </div>
        </div>
      </div>

      {/* Moments mosaic */}
      <div className="container-page mt-16 md:mt-24">
        <p className="text-ink-muted max-w-2xl text-lg" data-reveal>
          The property sits among trees and open meadows, surrounded by hills in every direction. Step outside
          your cottage and the walking paths, viewpoints and quiet corners are right there.
        </p>
        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-10">
          {moments.map((m, i) => (
            <li key={m.title} className={i === 1 ? "md:mt-20" : ""}>
              <Photo
                image={m.image}
                sizes="(min-width: 768px) 30vw, 100vw"
                className="aspect-[4/5] rounded-sm"
                reveal
                style={revealDelay(i * 120)}
              />
              <h3 className="text-h3 mt-5" data-reveal>
                {m.title}
              </h3>
              <p className="text-ink-muted mt-2" data-reveal>
                {m.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
