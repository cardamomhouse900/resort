import type { Activity, Facility, GalleryItem, Place, RoomType, Testimonial } from "@/types/content";
import { img } from "./placeholder-images";

/**
 * TEMPORARY placeholder content for development.
 *
 * Everything here is sample text written to show the layout. It is not verified
 * information about the resort. In Phase 3 this file becomes the database seed,
 * after which all content is edited from the admin dashboard.
 *
 * Wording rule: describe natural beauty, comfort, adventure and family time.
 * Never describe the resort as "luxury", a protected forest or a wildlife reserve.
 */

/* ------------------------------------------------------------------ Rooms */

export const roomTypes: RoomType[] = [
  {
    slug: "valley-view-cottage",
    name: "Valley View Cottage",
    summary: "A bright cottage with a private sit-out facing the green valley and the hills beyond.",
    description: [
      "Wake up to mist drifting across the valley and the first light catching the hilltops. The Valley View Cottage has large windows on the valley side, a comfortable double bed and a small sit-out where morning tea tastes better than anywhere else.",
      "It suits couples and small families who want a quiet base for walks, off-road trips and slow evenings outdoors.",
    ],
    pricePerNight: 5000,
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    bedConfiguration: "1 queen bed (extra mattress on request)",
    sizeSqFt: 320,
    amenities: [
      { name: "Valley-facing sit-out", icon: "balcony" },
      { name: "Hot water", icon: "hot-water" },
      { name: "Wi-Fi in common areas", icon: "wifi" },
      { name: "Electric kettle", icon: "kettle" },
      { name: "Attached bathroom", icon: "shower" },
      { name: "Wardrobe", icon: "wardrobe" },
    ],
    images: [img.cabinsPath, img.roomWood, img.cabinWindow, img.lushValley],
    isPlaceholder: true,
  },
  {
    slug: "forest-family-cottage",
    name: "Forest Family Cottage",
    summary: "Two connected rooms among the trees, with space for the whole family to spread out.",
    description: [
      "Set a little further along the path and surrounded by trees, the Forest Family Cottage has two connected rooms, a shared sit-out and enough space for children to play while the adults relax.",
      "Families like it for longer stays: it is close to the campfire area and the outdoor play lawn, yet quiet once the day winds down.",
    ],
    pricePerNight: 7500,
    maxAdults: 4,
    maxChildren: 2,
    maxOccupancy: 6,
    bedConfiguration: "1 queen bed + 2 single beds",
    sizeSqFt: 520,
    amenities: [
      { name: "Two connected rooms", icon: "bed" },
      { name: "Shared sit-out", icon: "balcony" },
      { name: "Hot water", icon: "hot-water" },
      { name: "Television", icon: "tv" },
      { name: "Electric kettle", icon: "kettle" },
      { name: "Kid-friendly", icon: "kids" },
    ],
    images: [img.cabinHillside, img.cabinInterior, img.roomWood, img.mistyTrees],
    isPlaceholder: true,
  },
  {
    slug: "hillside-room",
    name: "Hillside Room",
    summary: "A simple, comfortable room with hill views — ideal for travellers and weekend trips.",
    description: [
      "The Hillside Room keeps things simple: a comfortable bed, a clean attached bathroom and a window looking out over the slopes. It is a good choice for friends on a road trip or anyone planning to spend most of the day outdoors.",
      "Guests in the Hillside Room have full access to the restaurant, campfire evenings and all common areas.",
    ],
    pricePerNight: 3500,
    maxAdults: 2,
    maxChildren: 1,
    maxOccupancy: 3,
    bedConfiguration: "1 double bed or 2 single beds",
    sizeSqFt: 240,
    amenities: [
      { name: "Hill-view window", icon: "mountain-view" },
      { name: "Hot water", icon: "hot-water" },
      { name: "Wi-Fi in common areas", icon: "wifi" },
      { name: "Attached bathroom", icon: "shower" },
    ],
    images: [img.cabinWindow, img.roomWood, img.hutOnHill],
    isPlaceholder: true,
  },
];

/* ------------------------------------------------------------- Facilities */

export const facilities: Facility[] = [
  {
    slug: "restaurant",
    name: "Restaurant",
    description:
      "Home-style meals cooked with local produce, served indoors or on the open deck with a view of the hills.",
    icon: "restaurant",
    image: img.patio,
    isPlaceholder: true,
  },
  {
    slug: "campfire",
    name: "Campfire evenings",
    description: "Gather around the fire after sunset with music, stories and a sky full of stars.",
    icon: "campfire",
    image: img.campfire,
    isPlaceholder: true,
  },
  {
    slug: "outdoor-seating",
    name: "Outdoor seating",
    description: "Benches and picnic tables placed along the slopes for reading, tea and quiet views.",
    icon: "outdoor-seating",
    image: img.picnicRidge,
    isPlaceholder: true,
  },
  {
    slug: "parking",
    name: "Free parking",
    description: "Secure on-site parking for cars and SUVs, a short walk from the cottages.",
    icon: "parking",
    isPlaceholder: true,
  },
  {
    slug: "wifi",
    name: "Wi-Fi",
    description:
      "Wi-Fi in the reception and restaurant. Signal in the mountains can vary — a good excuse to unplug.",
    icon: "wifi",
    isPlaceholder: true,
  },
  {
    slug: "indoor-games",
    name: "Indoor games",
    description: "Carrom, chess and board games in the common room for rainy afternoons.",
    icon: "indoor-games",
    isPlaceholder: true,
  },
  {
    slug: "outdoor-games",
    name: "Outdoor games",
    description: "An open lawn for badminton, cricket and children's play.",
    icon: "outdoor-games",
    image: img.lushValley,
    isPlaceholder: true,
  },
  {
    slug: "power-backup",
    name: "Power backup",
    description: "Backup power for lighting and essentials during outages.",
    icon: "power-backup",
    isPlaceholder: true,
  },
  {
    slug: "first-aid",
    name: "First aid",
    description: "A first-aid kit on site and staff who know the way to the nearest medical centre.",
    icon: "first-aid",
    isPlaceholder: true,
  },
];

/* ------------------------------------------------------------- Activities */

export const activities: Activity[] = [
  {
    slug: "off-road-trail-drive",
    title: "Off-road trail drive",
    summary: "A guided four-wheel-drive ride along rough mountain tracks to open viewpoints.",
    description:
      "Climb into a 4x4 with an experienced local driver and head up rough mountain tracks that ordinary cars can't reach. Expect mud, rocks, steep turns and wide-open views at the top. Suitable for ages 8 and above; the route depends on weather and track conditions.",
    duration: "2–3 hours",
    priceFrom: 2500,
    priceNote: "per vehicle (up to 5 guests)",
    images: [img.jeepMud, img.jeepRoad],
    category: "adventure",
    isPlaceholder: true,
  },
  {
    slug: "guided-nature-walk",
    title: "Guided nature walk",
    summary: "An easy morning walk through the greenery with a local guide.",
    description:
      "Start early while the mist is still in the valley. A local guide leads a gentle walk along forest paths and open slopes, pointing out plants, birds and the best spots for photographs.",
    duration: "1.5 hours",
    priceFrom: null,
    priceNote: "included with your stay",
    images: [img.mistyTrees, img.lushValley],
    category: "nature",
    isPlaceholder: true,
  },
  {
    slug: "sunrise-viewpoint-trek",
    title: "Sunrise viewpoint trek",
    summary: "A short uphill trek to watch the sun rise over layers of hills.",
    description:
      "Leave before dawn with torches and a flask of tea, and reach the viewpoint as the first light spreads across the hills. Moderate fitness required.",
    duration: "3 hours",
    priceFrom: 500,
    priceNote: "per person",
    images: [img.sunriseFog, img.sunriseHills],
    category: "adventure",
    isPlaceholder: true,
  },
  {
    slug: "campfire-and-stargazing",
    title: "Campfire and stargazing",
    summary: "Evenings by the fire, followed by clear mountain skies.",
    description:
      "On clear nights, the campfire area turns into the best seat for stargazing. Bring a jacket, settle in and enjoy music, conversation and a sky far brighter than in the city.",
    duration: "Evenings",
    priceFrom: null,
    priceNote: "included with your stay",
    images: [img.campfireGuitar, img.stars],
    category: "relaxation",
    isPlaceholder: true,
  },
  {
    slug: "picnic-on-the-ridge",
    title: "Picnic on the ridge",
    summary: "A packed lunch at a quiet spot with a wide view over the valley.",
    description:
      "We pack a simple lunch and point you to a quiet ridge with a picnic table and long views. A relaxed half day for families and couples.",
    duration: "Half day",
    priceFrom: 600,
    priceNote: "per person, includes packed lunch",
    images: [img.picnicMisty, img.picnicRidge],
    category: "family",
    isPlaceholder: true,
  },
];

/* --------------------------------------------------- Nearby places & sights */

const TBV = "To be verified";

export const nearbyPlaces: Place[] = [
  {
    slug: "sample-tea-estate",
    name: "Sample Tea Estate",
    description:
      "Rolling rows of tea bushes on misty slopes, with short walking paths and a small shop for fresh leaf tea.",
    distance: TBV,
    travelTime: TBV,
    location: "[Nearby village]",
    image: img.teaHills,
    directionsUrl: null,
    isPlaceholder: true,
  },
  {
    slug: "sample-valley-viewpoint",
    name: "Sample Valley Viewpoint",
    description: "A roadside viewpoint looking down the length of the valley — best in the early morning.",
    distance: TBV,
    travelTime: TBV,
    location: "[Nearby hill road]",
    image: img.greenCloudy,
    directionsUrl: null,
    isPlaceholder: true,
  },
  {
    slug: "sample-village-market",
    name: "Sample Village Market",
    description: "A small weekly market for local fruit, spices and handmade goods.",
    distance: TBV,
    travelTime: TBV,
    location: "[Nearby town]",
    image: img.foggyHillside,
    directionsUrl: null,
    isPlaceholder: true,
  },
];

export const attractions: Place[] = [
  {
    slug: "sample-waterfall",
    name: "Sample Waterfall",
    description:
      "A tall waterfall reached by a short forest trail. It is at its fullest after the monsoon; the rocks can be slippery.",
    distance: TBV,
    travelTime: TBV,
    location: "[District]",
    image: img.waterfallForest,
    directionsUrl: null,
    isPlaceholder: true,
  },
  {
    slug: "sample-cascades",
    name: "Sample Cascades",
    description: "A series of smaller falls surrounded by thick greenery, popular for photographs.",
    distance: TBV,
    travelTime: TBV,
    location: "[District]",
    image: img.waterfallTrees,
    directionsUrl: null,
    isPlaceholder: true,
  },
  {
    slug: "sample-peak",
    name: "Sample Peak",
    description:
      "The highest point in the area, with a marked trail and views across several ranges on clear days.",
    distance: TBV,
    travelTime: TBV,
    location: "[District]",
    image: img.mistySlopes,
    directionsUrl: null,
    isPlaceholder: true,
  },
];

/* ----------------------------------------------------------- Testimonials */

export const testimonials: Testimonial[] = [
  {
    quote:
      "We came for two nights and wished we had booked four. The mornings were magical and the children didn't miss their screens once.",
    author: "Sample guest",
    context: "Family stay",
    isPlaceholder: true,
  },
  {
    quote: "The off-road drive was the highlight of our trip — muddy, bumpy and absolutely worth it.",
    author: "Sample guest",
    context: "Friends' weekend",
    isPlaceholder: true,
  },
  {
    quote: "Simple, clean and peaceful. Tea on the sit-out with the valley below is what we'll remember.",
    author: "Sample guest",
    context: "Couple's getaway",
    isPlaceholder: true,
  },
];

/* ---------------------------------------------------------------- Gallery */

export const gallery: GalleryItem[] = [
  { ...img.lushValley, caption: "The valley in early summer" },
  { ...img.cabinsPath, caption: "Paths between the cottages" },
  { ...img.campfire, caption: "Campfire evenings" },
  { ...img.sunriseFog, caption: "Sunrise from the ridge" },
  { ...img.jeepMud, caption: "Off-road trails" },
  { ...img.patio, caption: "Meals with a view" },
  { ...img.teaHills, caption: "Tea gardens nearby" },
  { ...img.stars, caption: "Clear night skies" },
];
