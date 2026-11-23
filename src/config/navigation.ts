export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Rooms", href: "/rooms" },
  { label: "Facilities", href: "/facilities" },
  { label: "Activities", href: "/activities" },
  { label: "Nearby Places", href: "/nearby-places" },
  { label: "Attractions", href: "/attractions" },
  { label: "Contact", href: "/contact" },
];

export const bookingHref = "/booking";
