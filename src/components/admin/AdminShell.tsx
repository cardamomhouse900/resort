"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BedDouble,
  CalendarRange,
  ClipboardList,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Mountain,
  Quote,
  Settings,
  Sparkles,
  Tent,
  X,
} from "lucide-react";

type NavLink = { href: string; label: string; icon: typeof Menu; exact?: boolean; ownerOnly?: boolean };
type NavItem = NavLink | { section: string };

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/availability", label: "Availability", icon: CalendarRange },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { section: "Website content" },
  { href: "/admin/facilities", label: "Facilities", icon: Sparkles },
  { href: "/admin/activities", label: "Activities", icon: Tent },
  { href: "/admin/places", label: "Places & attractions", icon: MapPin },
  { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { section: "Resort" },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function AdminShell({
  admin,
  resortName,
  newInquiries,
  signOut,
  children,
}: {
  admin: { name: string; email: string; role: "OWNER" | "STAFF" };
  resortName: string;
  newInquiries: number;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (l: NavLink) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <Mountain className="text-olive size-6" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-cream truncate font-serif text-lg leading-tight">{resortName}</p>
          <p className="text-cream/70 text-xs">Admin</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          if ("section" in item) {
            return (
              <li
                key={item.section}
                className="text-cream/60 px-3 pt-5 pb-1 text-[0.6875rem] font-semibold tracking-widest uppercase"
              >
                {item.section}
              </li>
            );
          }
          if (item.ownerOnly && admin.role !== "OWNER") return null;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item) ? "page" : undefined}
                className="text-cream/85 hover:bg-cream/10 hover:text-cream aria-[current=page]:bg-cream/15 aria-[current=page]:text-cream flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/admin/inquiries" && newInquiries > 0 && (
                  <span className="bg-earth rounded-full px-2 text-xs font-semibold text-white">
                    {newInquiries}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-cream/15 space-y-2 border-t px-5 py-4 text-sm">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="text-cream/85 hover:text-cream flex items-center gap-2"
        >
          <ExternalLink className="size-4" aria-hidden="true" /> View website
        </a>
        <p className="text-cream truncate" title={admin.email}>
          {admin.name} <span className="text-cream/70">· {admin.role === "OWNER" ? "Owner" : "Staff"}</span>
        </p>
        <form action={signOut}>
          <button type="submit" className="text-cream/85 hover:text-cream flex items-center gap-2">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="bg-cream min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="bg-forest sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>

      <header className="bg-forest text-cream sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden">
        <span className="truncate font-serif text-lg">{resortName} · Admin</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          className="inline-flex size-11 items-center justify-center"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="bg-forest absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close admin menu"
              className="text-cream absolute top-3 right-3 inline-flex size-10 items-center justify-center"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}
