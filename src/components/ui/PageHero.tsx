import type { ImageAsset } from "@/types/content";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Photo } from "./Photo";

type Props = {
  title: string;
  eyebrow?: string;
  intro?: string;
  image: ImageAsset;
  breadcrumbs: Crumb[];
};

/**
 * Full-screen image banner at the top of every inner page (the page's LCP element),
 * matching the homepage hero.
 */
export function PageHero({ title, eyebrow, intro, image, breadcrumbs }: Props) {
  return (
    <section className="bg-forest relative isolate flex min-h-svh items-end overflow-hidden">
      <Photo
        image={image}
        sizes="100vw"
        lcp
        className="absolute! inset-0 -z-10"
        imgClassName="animate-hero-zoom"
        badgePosition="bottom-right"
        overlay="bg-linear-to-t from-forest/90 via-forest/35 to-forest/30"
      />
      {/* Extra bottom space on phones keeps the text clear of the fixed "Book Your Stay" bar. */}
      <div className="container-page pt-32 pb-28 md:pb-20">
        <Breadcrumbs items={breadcrumbs} />
        {eyebrow && <p className="eyebrow text-beige! mt-8">{eyebrow}</p>}
        <h1 className="text-h1 text-cream! mt-3 max-w-4xl">{title}</h1>
        {intro && <p className="text-cream/85 mt-5 max-w-2xl text-lg">{intro}</p>}
      </div>
    </section>
  );
}
