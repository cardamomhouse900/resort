import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ActivitiesOverview } from "@/components/homepage/ActivitiesOverview";
import { BookingCta } from "@/components/homepage/BookingCta";
import { FacilitiesOverview } from "@/components/homepage/FacilitiesOverview";
import { GallerySection } from "@/components/homepage/GallerySection";
import { Hero } from "@/components/homepage/Hero";
import { Intro } from "@/components/homepage/Intro";
import { NearbyOverview } from "@/components/homepage/NearbyOverview";
import { OffRoad } from "@/components/homepage/OffRoad";
import { RoomsRail } from "@/components/homepage/RoomsRail";
import { Surroundings } from "@/components/homepage/Surroundings";
import { Testimonials } from "@/components/homepage/Testimonials";
import {
  getActivities,
  getAttractions,
  getFacilities,
  getGallery,
  getNearbyPlaces,
  getRoomTypes,
  getSiteSettings,
  getTestimonials,
} from "@/services/content";

export const metadata: Metadata = {
  // Final keyword targeting ("… resort in [Location]") is set in Phase 7 once the location is confirmed.
  title: { absolute: `${siteConfig.name} | Nature Stay with Cottages & Off-Road Trails` },
  description:
    "Escape to a peaceful mountain resort surrounded by lush greenery. Comfortable cottages, campfire evenings, off-road trails and family-friendly experiences.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [settings, rooms, facilities, activities, nearby, attractions, testimonials, gallery] =
    await Promise.all([
      getSiteSettings(),
      getRoomTypes(),
      getFacilities(),
      getActivities(),
      getNearbyPlaces(),
      getAttractions(),
      getTestimonials(),
      getGallery(),
    ]);

  const offRoad = activities.find((a) => a.category === "adventure") ?? activities[0];
  const featured = activities.filter((a) => a.slug !== offRoad?.slug).slice(0, 3);

  return (
    <>
      <Hero siteName={settings.name} />
      <Intro />
      <Surroundings />
      <RoomsRail rooms={rooms} />
      <FacilitiesOverview facilities={facilities} />
      {offRoad && <OffRoad activity={offRoad} />}
      <ActivitiesOverview activities={featured} />
      <GallerySection items={gallery} />
      <NearbyOverview nearby={nearby} attractions={attractions} />
      <Testimonials items={testimonials} />
      <BookingCta />
    </>
  );
}
