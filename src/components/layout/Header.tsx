"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { bookingHref, mainNav } from "@/config/navigation";

// The menu (and the Motion animation library it uses) is only downloaded when
// a visitor first reaches for it — most page views never need it.
const loadMenu = () => import("./MobileMenu");
const MobileMenu = dynamic(() => loadMenu().then((m) => m.MobileMenu), { ssr: false });

/**
 * Transparent over the dark hero at the top of every page; becomes a solid
 * cream bar once the visitor scrolls.
 */
export function Header({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = () => {
    setMenuMounted(true);
    setMenuOpen(true);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled;
  // "/" must match exactly, otherwise Home would be highlighted on every page.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main"
        className="bg-forest text-cream sr-only z-[60] rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300 ${
          solid ? "bg-cream/95 text-forest shadow-[0_1px_0_var(--color-line)] backdrop-blur-md" : "text-cream"
        }`}
      >
        <div className="container-page flex h-16 items-center justify-between gap-6 md:h-20">
          <Link
            href="/"
            className="font-serif text-2xl leading-none font-semibold tracking-tight md:text-[1.75rem]"
          >
            {siteName}
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-7 text-[0.9375rem] font-medium">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="relative py-2 opacity-90 transition-opacity after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform hover:opacity-100 hover:after:scale-x-100 aria-[current=page]:opacity-100 aria-[current=page]:after:scale-x-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={bookingHref}
              className={`hidden min-h-11 items-center rounded-full px-6 text-sm font-semibold transition-colors sm:inline-flex ${
                solid ? "bg-forest text-cream hover:bg-mountain" : "bg-cream text-forest hover:bg-white"
              }`}
            >
              Book Your Stay
            </Link>
            <button
              type="button"
              onClick={openMenu}
              onPointerEnter={loadMenu}
              onTouchStart={loadMenu}
              onFocus={loadMenu}
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-full lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Menu className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {menuMounted && (
        <MobileMenu open={menuOpen} onClose={closeMenu} siteName={siteName} isActive={isActive} />
      )}
    </>
  );
}
