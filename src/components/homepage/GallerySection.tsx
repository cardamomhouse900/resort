import { GalleryCarousel } from "@/components/ui/GalleryCarousel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { showSampleBadges } from "@/config/site";
import type { GalleryItem } from "@/types/content";

export function GallerySection({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="gallery-title" className="bg-beige overflow-hidden py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="gallery-title"
          eyebrow="07 — Gallery"
          title="A glimpse of life in the hills"
          className="mb-12"
        />
        <GalleryCarousel items={items} showBadges={showSampleBadges} />
      </div>
    </section>
  );
}
