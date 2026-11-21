import { Photo } from "@/components/ui/Photo";
import { img } from "@/content/placeholder-images";
import { BookingQuickSearch } from "@/components/booking/BookingQuickSearch";

/**
 * Full-screen hero. Pure server-rendered HTML + CSS animation (no JavaScript),
 * so the LCP image and heading paint as early as possible.
 */
export function Hero({ siteName }: { siteName: string }) {
  return (
    <section className="bg-forest relative isolate flex min-h-svh flex-col justify-end overflow-hidden">
      <Photo
        image={img.heroRoadValley}
        sizes="100vw"
        lcp
        className="absolute! inset-0 -z-10"
        imgClassName="animate-hero-zoom object-[50%_60%]"
        badgePosition="bottom-right"
        overlay="bg-linear-to-t from-forest/85 via-forest/25 to-forest/40"
      />

      <div className="container-page pt-32 pb-28 md:pb-36 lg:pb-40">
        <p className="eyebrow animate-rise text-beige!">{siteName}</p>
        <h1 className="text-display text-cream! mt-4 max-w-5xl">
          <span className="animate-rise block [animation-delay:120ms]">Find Your Escape</span>
          <span className="animate-rise font-serif-italic block italic [animation-delay:240ms]">
            in the Mountains.
          </span>
        </h1>
        <p className="animate-rise text-cream/90 mt-6 max-w-xl text-lg [animation-delay:380ms] md:text-xl">
          Discover a beautiful mountain getaway surrounded by lush greenery, scenic landscapes and
          unforgettable experiences.
        </p>
      </div>

      <div className="animate-rise absolute inset-x-0 bottom-0 hidden [animation-delay:520ms] lg:block">
        <div className="container-page pb-8">
          <BookingQuickSearch />
        </div>
      </div>

      <a
        href="#welcome"
        className="text-cream/85 absolute right-8 bottom-10 hidden flex-col items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase md:flex lg:hidden"
        aria-label="Scroll to content"
      >
        <span className="[writing-mode:vertical-rl]">Scroll</span>
        <span className="animate-scroll-cue bg-cream/80 h-12 w-px" aria-hidden="true" />
      </a>
    </section>
  );
}
