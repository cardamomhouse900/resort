import type { Metadata } from "next";
import { BookingCta } from "@/components/homepage/BookingCta";
import { PlaceList } from "@/components/places/PlaceList";
import { PageHero } from "@/components/ui/PageHero";
import { img } from "@/content/placeholder-images";
import { getAttractions } from "@/services/content";

export const metadata: Metadata = {
  title: "Tourist Attractions Around the Resort",
  description:
    "Waterfalls, peaks and popular sightseeing spots around the resort — with location, distance and directions for your day trips.",
  alternates: { canonical: "/attractions" },
};

export default async function AttractionsPage() {
  const attractions = await getAttractions();
  // TouristAttraction structured data is added in Phase 7, only for verified places
  // with real addresses — placeholder destinations must not be published as facts.
  return (
    <>
      <PageHero
        title="Tourist attractions"
        eyebrow="Day trips"
        intro="Waterfalls, peaks and the region's best-known sights, all within reach for a day out."
        image={img.waterfallForest}
        breadcrumbs={[{ name: "Attractions", href: "/attractions" }]}
      />
      <section className="container-page py-20 md:py-28">
        <PlaceList places={attractions} />
      </section>
      <BookingCta title="Explore by day, unwind by the fire." image={img.stars} />
    </>
  );
}
