import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsSchema } from "@/lib/validation-admin";
import { placesSchema, resortSchema, roomSchema, websiteSchema } from "@/lib/structured-data";
import type { Facility, GalleryItem, Place, RoomType, SiteSettings } from "@/types/content";

const settings: SiteSettings = {
  name: "Real Resort",
  shortName: "Real",
  tagline: "t",
  description: "A mountain resort.",
  url: "http://localhost:3000",
  locale: "en_IN",
  location: "Somewhere Hills",
  isPlaceholder: false,
  contact: {
    phone: "+91 90000 90000",
    whatsapp: "+91 90000 90000",
    email: "stay@resort.test",
    address: "1 Hill Road",
    mapsUrl: null,
  },
  geo: { latitude: 10.0889, longitude: 77.0595 },
  checkInTime: "13:00",
  checkOutTime: "11:00",
  bookingPolicy: "b",
  cancellationPolicy: "c",
  advancePercent: 30,
};

const photo = (src: string, isPlaceholder: boolean) => ({ src, alt: "a", isPlaceholder });

const room = (o: Partial<RoomType> = {}): RoomType => ({
  slug: "valley",
  name: "Valley Cottage",
  summary: "Cottage with a view.",
  description: ["d"],
  pricePerNight: 4500,
  maxAdults: 2,
  maxChildren: 1,
  maxOccupancy: 3,
  bedConfiguration: "1 king bed",
  sizeSqFt: 320,
  amenities: [{ name: "Balcony", icon: "balcony" }],
  images: [
    photo("https://res.cloudinary.com/x/image/upload/real.jpg", false),
    photo("https://images.unsplash.com/p", true),
  ],
  isPlaceholder: false,
  ...o,
});

const place = (o: Partial<Place> = {}): Place => ({
  slug: "falls",
  name: "Falls",
  description: "A waterfall.",
  distance: "12 km",
  travelTime: "30 min",
  location: "Falls Road",
  image: photo("https://images.unsplash.com/w", true),
  directionsUrl: "https://maps.app.goo.gl/abc",
  isPlaceholder: false,
  ...o,
});

describe("structured data never publishes placeholders", () => {
  it("emits nothing while the site is in placeholder mode", () => {
    const s = { ...settings, isPlaceholder: true };
    expect(resortSchema(s, [room()], [], [])).toBeNull();
    expect(websiteSchema(s)).toBeNull();
    expect(roomSchema(s, room())).toBeNull();
    expect(placesSchema(s, [place()], "/attractions")).toBeNull();
  });

  it("skips placeholder rooms, places, facilities and stock photos", () => {
    expect(roomSchema(settings, room({ isPlaceholder: true }))).toBeNull();
    expect(placesSchema(settings, [place({ isPlaceholder: true })], "/attractions")).toBeNull();

    const facilities: Facility[] = [
      { slug: "a", name: "Restaurant", description: "", icon: "restaurant", isPlaceholder: false },
      { slug: "b", name: "Sample pool", description: "", icon: "leaf", isPlaceholder: true },
    ];
    const gallery: GalleryItem[] = [
      photo("https://res.cloudinary.com/r.jpg", false),
      photo("https://u/stock", true),
    ];
    const r = resortSchema(
      settings,
      [room(), room({ slug: "x", isPlaceholder: true, pricePerNight: 99 })],
      facilities,
      gallery,
    )!;
    expect(r.image).toEqual(["https://res.cloudinary.com/r.jpg"]);
    expect(r.amenityFeature).toEqual([
      { "@type": "LocationFeatureSpecification", name: "Restaurant", value: true },
    ]);
    expect(r.containsPlace).toHaveLength(1);
    expect(r.priceRange).toBe("₹4,500–₹4,500 per night");
    expect(r).not.toHaveProperty("hasMap"); // null values are dropped
    expect(r.geo).toEqual({ "@type": "GeoCoordinates", latitude: 10.0889, longitude: 77.0595 });
    expect(resortSchema({ ...settings, geo: null }, [], [], [])).not.toHaveProperty("geo");
  });
});

describe("structured data content", () => {
  it("describes a room with price, occupancy and its resort", () => {
    const r = roomSchema(settings, room())!;
    expect(r).toMatchObject({
      "@type": "HotelRoom",
      "@id": "http://localhost:3000/rooms/valley#room",
      url: "http://localhost:3000/rooms/valley",
      image: ["https://res.cloudinary.com/x/image/upload/real.jpg"],
      occupancy: { maxValue: 3 },
      floorSize: { value: 320, unitCode: "FTK" },
      containedInPlace: { "@id": "http://localhost:3000/#resort" },
      offers: { price: 4500, priceCurrency: "INR", priceSpecification: { unitCode: "DAY" } },
    });
  });

  it("lists verified places as tourist attractions with anchors", () => {
    const list = placesSchema(
      settings,
      [place(), place({ slug: "peak", isPlaceholder: true })],
      "/attractions",
    )!;
    const items = list.itemListElement as { item: Record<string, unknown> }[];
    expect(items).toHaveLength(1);
    expect(items[0].item).toMatchObject({
      "@type": "TouristAttraction",
      url: "http://localhost:3000/attractions#falls",
      address: "Falls Road",
      hasMap: "https://maps.app.goo.gl/abc",
    });
    expect(items[0].item).not.toHaveProperty("image"); // stock photo
  });
});

describe("image delivery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async (mode?: string) => {
    if (mode) vi.stubEnv("NEXT_PUBLIC_IMAGE_DELIVERY", mode);
    vi.resetModules();
    return (await import("@/lib/image-loader")).default;
  };

  it("direct mode asks the CDNs for sized, modern formats", async () => {
    const loader = await load();
    expect(loader({ src: "https://res.cloudinary.com/c/image/upload/v1/a.jpg", width: 640 })).toBe(
      "https://res.cloudinary.com/c/image/upload/f_auto,q_auto,c_limit,w_640/v1/a.jpg",
    );
    const u = new URL(loader({ src: "https://images.unsplash.com/photo-1?ixid=z", width: 750, quality: 60 }));
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      ixid: "z",
      auto: "format",
      w: "750",
      q: "60",
    });
    expect(loader({ src: "/local.png", width: 100 })).toBe("/local.png");
  });

  it("cloudflare mode serves images from the site's own origin", async () => {
    const loader = await load("cloudflare");
    expect(loader({ src: "https://res.cloudinary.com/c/image/upload/v1/a.jpg", width: 640 })).toBe(
      "/cdn-cgi/image/width=640,quality=75,format=auto,fit=scale-down/https://res.cloudinary.com/c/image/upload/c_limit,w_2560,q_90/v1/a.jpg",
    );
    expect(loader({ src: "https://images.unsplash.com/photo-1", width: 750, quality: 60 })).toBe(
      "/cdn-cgi/image/width=750,quality=60,format=auto,fit=scale-down/https://images.unsplash.com/photo-1?w=2560&q=90&fm=jpg",
    );
    expect(loader({ src: "/local.png", width: 100 })).toBe("/local.png");
  });
});

describe("settings coordinates", () => {
  const base = {
    resortName: "Real Resort",
    shortName: "Real",
    tagline: "Find your escape",
    description: "A peaceful mountain resort with cottages.",
    locationName: "Hills",
    address: "1 Hill Road",
    phone: "+91 90000 90000",
    whatsapp: "+91 90000 90000",
    email: "a@b.co",
    advancePercent: "30",
    holdMinutes: "15",
    taxPercent: "0",
    minNights: "1",
    maxNights: "14",
    bookingWindowDays: "365",
    checkInTime: "13:00",
    checkOutTime: "11:00",
    bookingPolicy: "Advance confirms the booking.",
    cancellationPolicy: "Full refund 7 days before.",
  };
  it("accepts both, or neither", () => {
    const both = settingsSchema.parse({ ...base, latitude: "10.0889", longitude: "77.0595" });
    expect([both.latitude, both.longitude]).toEqual([10.0889, 77.0595]);
    const none = settingsSchema.parse({ ...base, latitude: "", longitude: "" });
    expect([none.latitude, none.longitude]).toEqual([null, null]);
  });
  it("rejects one without the other, out-of-range or non-numeric values", () => {
    expect(settingsSchema.safeParse({ ...base, latitude: "10.1", longitude: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, latitude: "91", longitude: "77" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, latitude: "north", longitude: "77" }).success).toBe(false);
  });
});
