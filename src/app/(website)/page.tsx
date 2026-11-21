import Image from "next/image";
import { siteConfig } from "@/config/site";
import { SampleBadge } from "@/components/ui/SampleBadge";

/**
 * TEMPORARY Phase 1 page: verifies fonts, design tokens and the image loader.
 * Replaced by the real homepage in Phase 2.
 */
const swatches = [
  { name: "Deep Green", token: "bg-forest", hex: "#244A35", dark: true },
  { name: "Mountain Green", token: "bg-mountain", hex: "#315B40", dark: true },
  { name: "Olive Green", token: "bg-olive", hex: "#78875A", dark: true },
  { name: "Warm Beige", token: "bg-beige", hex: "#E9E2D2" },
  { name: "Cream", token: "bg-cream", hex: "#F7F5ED" },
  { name: "Earth Brown", token: "bg-earth", hex: "#80674E", dark: true },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative isolate flex min-h-[70svh] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
          alt="Sample image: mountain ridges above a sea of clouds (placeholder, not the resort)"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="from-forest/80 via-forest/20 absolute inset-0 -z-10 bg-linear-to-t to-transparent" />
        <div className="container-page pb-12">
          <SampleBadge label="Sample image" />
          <h1 className="text-display text-cream mt-4 max-w-4xl">{siteConfig.tagline}</h1>
        </div>
      </section>

      <section className="container-page py-16 sm:py-24">
        <p className="eyebrow">Phase 1 — Design tokens</p>
        <h2 className="text-h2 mt-3">Mountain Nature Retreat</h2>
        <p className="text-ink-muted mt-4 max-w-2xl">
          Headings use Cormorant Garamond; body text uses Manrope. This page only exists to verify the setup
          and will be replaced by the homepage in Phase 2.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {swatches.map((s) => (
            <li key={s.hex}>
              <div className={`${s.token} ring-line aspect-square rounded-md ring-1`} />
              <p className="mt-2 text-sm font-semibold">{s.name}</p>
              <p className="text-ink-muted text-sm">{s.hex}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href="#"
            className="bg-forest text-cream hover:bg-mountain rounded-full px-7 py-3.5 font-semibold transition-colors"
          >
            Book Your Stay
          </a>
          <a
            href="#"
            className="text-forest ring-forest/30 hover:bg-beige rounded-full px-7 py-3.5 font-semibold ring-1 transition-colors"
          >
            Explore Rooms
          </a>
        </div>
      </section>
    </main>
  );
}
