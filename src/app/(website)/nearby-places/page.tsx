import type { Metadata } from "next";
import { BookingCta } from "@/components/homepage/BookingCta";
import { PlaceList } from "@/components/places/PlaceList";
import { PageHero } from "@/components/ui/PageHero";
import { img } from "@/content/placeholder-images";
import { getNearbyPlaces } from "@/services/content";

export const metadata: Metadata = {
  title: "Nearby Places to Visit",
  description:
    "Tea gardens, viewpoints, village markets and scenic spots to explore around the resort, with distances and directions.",
  alternates: { canonical: "/nearby-places" },
};

export default async function NearbyPlacesPage() {
  const places = await getNearbyPlaces();
  return (
    <>
      <PageHero
        title="Nearby places to explore"
        eyebrow="Around the resort"
        intro="Easy outings for a morning or an afternoon — tea gardens, viewpoints and local markets close to the hills."
        image={img.teaHills}
        breadcrumbs={[{ name: "Nearby Places", href: "/nearby-places" }]}
      />
      <section className="container-page py-20 md:py-28">
        <PlaceList places={places} />
      </section>
      <BookingCta title="Make the hills your base." />
    </>
  );
}
