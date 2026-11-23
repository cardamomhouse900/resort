import { siteConfig } from "@/config/site";
import type { Facility, GalleryItem, ImageAsset, Place, RoomType, SiteSettings } from "@/types/content";
import { formatINR } from "@/utils/format";

/**
 * Schema.org structured data (JSON-LD) builders.
 *
 * Rule: nothing marked as a placeholder is ever published as a fact. While the
 * site itself is in placeholder mode no business data is emitted at all, and
 * afterwards each room, facility, place and photograph is only included once
 * an admin has replaced it with real content (its `isPlaceholder` flag is off).
 */

type Json = Record<string, unknown>;

const CONTEXT = "https://schema.org";
const abs = (path: string) => new URL(path, siteConfig.url).toString();
export const resortId = () => abs("/#resort");

const realImages = (images: ImageAsset[]) => images.filter((i) => !i.isPlaceholder).map((i) => i.src);

/** Drops undefined values, nulls and empty arrays so the output stays clean. */
function compact<T extends Json>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
    ),
  ) as T;
}

const amenity = (name: string) => ({ "@type": "LocationFeatureSpecification", name, value: true });

export function resortSchema(
  s: SiteSettings,
  rooms: RoomType[],
  facilities: Facility[],
  gallery: GalleryItem[],
): Json | null {
  if (s.isPlaceholder) return null;
  const realRooms = rooms.filter((r) => !r.isPlaceholder);
  const prices = realRooms.map((r) => r.pricePerNight);
  return compact({
    "@context": CONTEXT,
    "@type": "Resort",
    "@id": resortId(),
    name: s.name,
    description: s.description,
    url: abs("/"),
    image: realImages(gallery),
    telephone: s.contact.phone,
    email: s.contact.email,
    address: { "@type": "PostalAddress", streetAddress: s.contact.address, addressCountry: "IN" },
    hasMap: s.contact.mapsUrl,
    geo: s.geo ? { "@type": "GeoCoordinates", ...s.geo } : undefined,
    checkinTime: s.checkInTime,
    checkoutTime: s.checkOutTime,
    currenciesAccepted: "INR",
    priceRange: prices.length
      ? `${formatINR(Math.min(...prices))}–${formatINR(Math.max(...prices))} per night`
      : undefined,
    amenityFeature: facilities.filter((f) => !f.isPlaceholder).map((f) => amenity(f.name)),
    containsPlace: realRooms.map((r) => ({
      "@type": "HotelRoom",
      "@id": abs(`/rooms/${r.slug}#room`),
      name: r.name,
      url: abs(`/rooms/${r.slug}`),
    })),
  });
}

export function websiteSchema(s: SiteSettings): Json | null {
  if (s.isPlaceholder) return null;
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": abs("/#website"),
    name: s.name,
    url: abs("/"),
    inLanguage: "en-IN",
    publisher: { "@id": resortId() },
  };
}

export function roomSchema(s: SiteSettings, room: RoomType): Json | null {
  if (s.isPlaceholder || room.isPlaceholder) return null;
  const url = abs(`/rooms/${room.slug}`);
  return compact({
    "@context": CONTEXT,
    "@type": "HotelRoom",
    "@id": `${url}#room`,
    name: room.name,
    description: room.summary,
    url,
    image: realImages(room.images),
    bed: room.bedConfiguration,
    occupancy: { "@type": "QuantitativeValue", minValue: 1, maxValue: room.maxOccupancy, unitText: "guests" },
    floorSize: room.sizeSqFt
      ? { "@type": "QuantitativeValue", value: room.sizeSqFt, unitCode: "FTK", unitText: "sq ft" }
      : undefined,
    amenityFeature: room.amenities.map((a) => amenity(a.name)),
    containedInPlace: { "@id": resortId() },
    offers: {
      "@type": "Offer",
      url: abs(`/booking?room=${room.slug}`),
      price: room.pricePerNight,
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: room.pricePerNight,
        priceCurrency: "INR",
        unitCode: "DAY",
        unitText: "per night",
      },
    },
  });
}

/** ItemList of TouristAttraction for the Nearby Places and Attractions pages (verified places only). */
export function placesSchema(s: SiteSettings, places: Place[], pagePath: string): Json | null {
  if (s.isPlaceholder) return null;
  const real = places.filter((p) => !p.isPlaceholder);
  if (real.length === 0) return null;
  return {
    "@context": CONTEXT,
    "@type": "ItemList",
    itemListElement: real.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: compact({
        "@type": "TouristAttraction",
        name: p.name,
        description: p.description,
        url: abs(`${pagePath}#${p.slug}`),
        image: p.image.isPlaceholder ? undefined : p.image.src,
        address: p.location,
        hasMap: p.directionsUrl,
      }),
    })),
  };
}
