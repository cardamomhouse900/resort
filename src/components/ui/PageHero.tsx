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

/** Image banner used at the top of every inner page (the page's LCP element). */
export function PageHero({ title, eyebrow, intro, image, breadcrumbs }: Props) {
  return (
    <section className="bg-forest relative isolate flex min-h-[62svh] items-end overflow-hidden md:min-h-[70svh]">
      <Photo
        image={image}
        sizes="100vw"
        lcp
        className="absolute! inset-0 -z-10"
        imgClassName="animate-hero-zoom"
        badgePosition="bottom-right"
        overlay="bg-linear-to-t from-forest/90 via-forest/35 to-forest/30"
      />
      <div className="container-page pt-32 pb-12 md:pb-16">
        <Breadcrumbs items={breadcrumbs} />
        {eyebrow && <p className="eyebrow text-beige! mt-8">{eyebrow}</p>}
        <h1 className="text-h1 text-cream! mt-3 max-w-4xl">{title}</h1>
        {intro && <p className="text-cream/85 mt-5 max-w-2xl text-lg">{intro}</p>}
      </div>
    </section>
  );
}
