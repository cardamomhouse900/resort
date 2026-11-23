import type { Metadata } from "next";
import { BookingCta } from "@/components/homepage/BookingCta";
import { PlaceList } from "@/components/places/PlaceList";
import { PageHero } from "@/components/ui/PageHero";
import { img } from "@/content/placeholder-images";
import { getAttractions, getSiteSettings } from "@/services/content";
import { JsonLd } from "@/components/ui/JsonLd";
import { placesSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Tourist Attractions Around the Resort",
    description:
      "Waterfalls, peaks and popular sightseeing spots around the resort — with location, distance and directions for your day trips.",
    path: "/attractions",
    image: img.sunriseHills,
  });
}

export default async function AttractionsPage() {
  const [attractions, settings] = await Promise.all([getAttractions(), getSiteSettings()]);
  return (
    <>
      <PageHero
        title="Tourist attractions"
        eyebrow="Day trips"
        intro="Waterfalls, peaks and the region's best-known sights, all within reach for a day out."
        image={img.sunriseHills}
        breadcrumbs={[{ name: "Attractions", href: "/attractions" }]}
      />
      <section className="container-page py-20 md:py-28">
        <PlaceList places={attractions} />
      </section>
      {/* TouristAttraction data only for verified (non-placeholder) places. */}
      <JsonLd data={placesSchema(settings, attractions, "/attractions")} />
      <BookingCta title="Explore by day, unwind by the fire." image={img.stars} />
    </>
  );
}
