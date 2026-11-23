import {
  Armchair,
  Baby,
  BedDouble,
  BriefcaseMedical,
  Car,
  Clock,
  CookingPot,
  Fence,
  Flame,
  Footprints,
  Gamepad2,
  Leaf,
  MapPin,
  Mountain,
  Shirt,
  ShowerHead,
  Star,
  Thermometer,
  Tv,
  Users,
  UtensilsCrossed,
  Volleyball,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/types/content";

/**
 * Curated icon registry. The database stores only the icon *name*, so admins
 * pick from this list and no arbitrary SVG/markup is ever stored.
 */
const registry: Record<IconName, LucideIcon> = {
  parking: Car,
  wifi: Wifi,
  restaurant: UtensilsCrossed,
  campfire: Flame,
  "outdoor-seating": Armchair,
  "indoor-games": Gamepad2,
  "outdoor-games": Volleyball,
  "power-backup": Zap,
  "hot-water": Thermometer,
  "first-aid": BriefcaseMedical,
  trekking: Footprints,
  kids: Baby,
  tv: Tv,
  balcony: Fence,
  kettle: CookingPot,
  wardrobe: Shirt,
  shower: ShowerHead,
  "mountain-view": Mountain,
  bed: BedDouble,
  users: Users,
  clock: Clock,
  "map-pin": MapPin,
  car: Car,
  star: Star,
  leaf: Leaf,
};

export { iconNames } from "./iconNames";

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const Component = registry[name] ?? Leaf;
  return <Component className={className} strokeWidth={1.5} aria-hidden="true" />;
}
