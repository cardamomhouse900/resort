/**
 * Content types shared by the public site, the admin dashboard and the
 * database layer. In Phase 3 these map 1:1 onto Prisma models.
 */

export type ImageCredit = {
  /** Photographer display name */
  name: string;
  /** Link to the photographer / source page */
  url: string;
  source: "Unsplash" | "Resort";
};

export type ImageAsset = {
  src: string;
  alt: string;
  /** True for temporary stock/placeholder images that do NOT show the resort. */
  isPlaceholder: boolean;
  credit?: ImageCredit;
};

/** Name of an icon in the curated icon registry (src/components/ui/Icon.tsx). */
export type IconName =
  | "parking"
  | "wifi"
  | "restaurant"
  | "campfire"
  | "outdoor-seating"
  | "indoor-games"
  | "outdoor-games"
  | "power-backup"
  | "hot-water"
  | "first-aid"
  | "trekking"
  | "kids"
  | "tv"
  | "balcony"
  | "kettle"
  | "wardrobe"
  | "shower"
  | "mountain-view"
  | "bed"
  | "users"
  | "clock"
  | "map-pin"
  | "car"
  | "star"
  | "leaf";

export type Amenity = { name: string; icon: IconName };

export type RoomType = {
  slug: string;
  name: string;
  summary: string;
  description: string[];
  pricePerNight: number; // INR
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedConfiguration: string;
  sizeSqFt?: number;
  amenities: Amenity[];
  images: ImageAsset[]; // first image = main photograph
  isPlaceholder: boolean;
};

export type Facility = {
  slug: string;
  name: string;
  description: string;
  icon: IconName;
  image?: ImageAsset;
  isPlaceholder: boolean;
};

export type Activity = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  duration: string;
  /** null = included / no extra charge; undefined = price on request */
  priceFrom?: number | null;
  priceNote?: string;
  images: ImageAsset[];
  category: "adventure" | "relaxation" | "family" | "nature";
  isPlaceholder: boolean;
};

export type Place = {
  slug: string;
  name: string;
  description: string;
  /** Free text such as "12 km". "To be verified" until confirmed. */
  distance: string;
  travelTime: string;
  location: string;
  image: ImageAsset;
  /** Google Maps directions URL; null until the real location is known. */
  directionsUrl: string | null;
  isPlaceholder: boolean;
};

export type Testimonial = {
  quote: string;
  author: string;
  context?: string; // e.g. "Family stay, May 2026"
  isPlaceholder: boolean;
};

export type GalleryItem = ImageAsset & { caption?: string };
