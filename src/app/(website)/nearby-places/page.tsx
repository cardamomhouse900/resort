import type { Metadata } from "next";
import { BookingCta } from "@/components/homepage/BookingCta";
import { PlaceList } from "@/components/places/PlaceList";
import { PageHero } from "@/components/ui/PageHero";
import { img } from "@/content/placeholder-images";
import { getNearbyPlaces, getSiteSettings } from "@/services/content";
import { JsonLd } from "@/components/ui/JsonLd";
import { placesSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Nearby Places to Visit",
    description:
      "Tea gardens, viewpoints, village markets and scenic spots to explore around the resort, with distances and directions.",
    path: "/nearby-places",
    image: img.lushValley,
  });
}

export default async function NearbyPlacesPage() {
  const [places, settings] = await Promise.all([getNearbyPlaces(), getSiteSettings()]);
  return (
    <>
      <PageHero
        title="Nearby places to explore"
        eyebrow="Around the resort"
        intro="Easy outings for a morning or an afternoon — tea gardens, viewpoints and local markets close to the hills."
        image={img.lushValley}
        breadcrumbs={[{ name: "Nearby Places", href: "/nearby-places" }]}
      />
      <section className="container-page py-20 md:py-28">
        <PlaceList places={places} />
      </section>
      <JsonLd data={placesSchema(settings, places, "/nearby-places")} />
      <BookingCta title="Make the hills your base." />
    </>
  );
}
