import { ButtonLink } from "@/components/ui/ButtonLink";
import { Parallax } from "@/components/ui/Parallax";
import { Photo } from "@/components/ui/Photo";
import { img } from "@/content/placeholder-images";
import type { ImageAsset } from "@/types/content";

type Props = {
  title?: string;
  text?: string;
  image?: ImageAsset;
};

/** Full-bleed closing call to action, reused at the bottom of inner pages. */
export function BookingCta({
  title = "Your mountain escape is waiting.",
  text = "Choose your dates, pick a cottage and reserve with a small advance payment. The rest is paid at the resort.",
  image = img.sunriseFog,
}: Props) {
  return (
    <section aria-labelledby="cta-title" className="bg-forest relative isolate overflow-hidden">
      <Parallax amount={10}>
        <Photo
          image={image}
          sizes="100vw"
          className="h-full"
          badgePosition="parallax-bottom-right"
          overlay="bg-forest/65"
        />
      </Parallax>
      <div className="container-page relative py-28 text-center md:py-40">
        <div className="mx-auto max-w-3xl" data-reveal>
          <h2 id="cta-title" className="text-h1 text-cream!">
            {title}
          </h2>
          <p className="text-cream/90 mx-auto mt-6 max-w-xl text-lg">{text}</p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/booking" variant="light">
              Book Your Stay
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost-light">
              Ask a question
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
