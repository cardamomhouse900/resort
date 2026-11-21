import type { ImageAsset } from "@/types/content";

/**
 * TEMPORARY placeholder photographs from Unsplash (free Unsplash License).
 * None of these show the actual resort. Each alt text says so, every image is
 * flagged `isPlaceholder`, and the photographer is credited.
 *
 * Replace them in the admin dashboard (Phase 4) with real resort photographs
 * uploaded to Cloudinary.
 */

const unsplash = (id: string, alt: string, name: string, username: string): ImageAsset => ({
  src: `https://images.unsplash.com/${id}`,
  alt: `Sample image: ${alt}`,
  isPlaceholder: true,
  credit: {
    name,
    url: `https://unsplash.com/@${username}?utm_source=resort_website&utm_medium=referral`,
    source: "Unsplash",
  },
});

export const img = {
  heroRoadValley: unsplash(
    "photo-1757866709303-577841f100e0",
    "misty green mountains with a winding road through the valley",
    "Le Mucky",
    "mucky",
  ),
  lushValley: unsplash(
    "photo-1754637024977-368665e88caf",
    "lush green valley with wildflowers and misty peaks",
    "Paolo Boaretto",
    "paolo1971",
  ),
  mistySlopes: unsplash(
    "photo-1764495961472-bef1d35e88b0",
    "green mountain slopes under low clouds",
    "Mohammad Bahadori",
    "lensofmo",
  ),
  mistyTrees: unsplash(
    "photo-1756136720412-b03a99998672",
    "misty hillside with green trees and grass",
    "Sergey Tretyakov",
    "stretiakov",
  ),
  greenCloudy: unsplash(
    "photo-1499680421725-887d06c21ffd",
    "green mountains and a valley trail under a bright cloudy sky",
    "Anton Darius",
    "thesollers",
  ),
  hutOnHill: unsplash(
    "photo-1737112227544-0b5b3ef51719",
    "small wooden hut on a grassy hill with mountains behind",
    "Pix Tresa",
    "pixtresa",
  ),
  cabinHillside: unsplash(
    "photo-1633867110782-32faed87823d",
    "small cabin on a lush green hillside",
    "Nick Night",
    "nicknight",
  ),
  cabinsPath: unsplash(
    "photo-1756156263665-8e4aa121b642",
    "wooden cottages beside a gravel path in green mountain meadows",
    "Luca Bravo",
    "lucabravo",
  ),
  foggyHillside: unsplash(
    "photo-1749063238837-cd933421c0c2",
    "old wooden building on a foggy hillside",
    "Barnabas Davoti",
    "davotibarna",
  ),
  jeepMud: unsplash(
    "photo-1780257899696-d8a4b2fbf8d7",
    "mud-splattered off-road vehicle on a dirt trail",
    "Alexander Bendus",
    "alexandr_bendus",
  ),
  jeepRoad: unsplash(
    "photo-1636138103626-8057cad9c335",
    "four-wheel-drive vehicle on a dirt road with mountains at dusk",
    "Thomas Tucker",
    "tents_and_tread",
  ),
  campfire: unsplash(
    "photo-1746941747862-7df9d9b16078",
    "friends gathered around a campfire at night",
    "James Sestric",
    "jamessestric",
  ),
  campfireGuitar: unsplash(
    "photo-1758272960205-96258d60ac1f",
    "friends around a campfire with a guitar near a lake",
    "Vitaly Gariev",
    "silverkblack",
  ),
  roomWood: unsplash(
    "photo-1788217023349-ad7763845844",
    "bright bedroom with a wooden bed and an attached bathroom",
    "Clay Banks",
    "claybanks",
  ),
  cabinInterior: unsplash(
    "photo-1761897190222-d222d88851c9",
    "cabin interior with chairs on a deck overlooking trees and a lake",
    "Benjamin Chambon",
    "benjamin_chambon",
  ),
  cabinWindow: unsplash(
    "photo-1674732042252-6e4affe55bad",
    "wood-panelled room with a window looking onto a green field",
    "Nataliia Vilinska",
    "kartatapotata",
  ),
  waterfallForest: unsplash(
    "photo-1652501836325-5610537fbb96",
    "waterfall flowing through a pine forest",
    "Sajal Das",
    "neeloriginals",
  ),
  waterfallTrees: unsplash(
    "photo-1625826415766-001bd75aaf52",
    "waterfalls surrounded by green trees",
    "Iftekhar Nibir",
    "nibroo",
  ),
  patio: unsplash(
    "photo-1783937283466-198d65ba2867",
    "outdoor patio with tables and chairs facing a mountain view",
    "Pavel Gromov",
    "lastmanpaul",
  ),
  picnicRidge: unsplash(
    "photo-1786260507796-bd6cc9b60641",
    "wooden picnic table on a grassy ridge above a green valley",
    "GWANGJIN GO",
    "chocolate_milk_denmark",
  ),
  picnicMisty: unsplash(
    "photo-1777603362998-5147b5eb85bc",
    "picnic table overlooking misty forested hills",
    "Dmytro Koplyk",
    "dkoplyk",
  ),
  sunriseHills: unsplash(
    "photo-1486787284432-3749cdce2660",
    "sunrise over rolling green hills",
    "Dan Gold",
    "danielcgold",
  ),
  sunriseFog: unsplash(
    "photo-1784657851006-d7658da58cb5",
    "golden sunrise over foggy forested hills",
    "Zetong Li",
    "zetong",
  ),
  teaHills: unsplash(
    "photo-1455157823797-3019317cbcf0",
    "tea plantations on misty hillsides",
    "Ravi Pinisetti",
    "ravipinisetti",
  ),
  stars: unsplash(
    "photo-1760340642052-ec0fe0225608",
    "starry night sky above dark mountains",
    "Ryan Klaus",
    "ryankphoto",
  ),
} satisfies Record<string, ImageAsset>;
