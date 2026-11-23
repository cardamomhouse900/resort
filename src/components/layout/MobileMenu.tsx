"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { X } from "lucide-react";
import { bookingHref, mainNav } from "@/config/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  siteName: string;
  isActive: (href: string) => boolean;
};

/** Full-screen cream menu for phones and tablets. */
export function MobileMenu({ open, onClose, siteName, isActive }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Keep keyboard focus inside the dialog.
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>("a, button");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence>
        {open && (
          <m.div
            ref={panelRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="bg-cream text-forest fixed inset-0 z-[70] flex flex-col lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container-page flex h-16 items-center justify-between">
              <Link href="/" onClick={onClose} className="font-serif text-2xl font-semibold">
                {siteName}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-full"
                aria-label="Close menu"
              >
                <X className="size-6" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile" className="container-page flex-1 overflow-y-auto pt-6">
              <ul className="space-y-1">
                {mainNav.map((item, i) => (
                  <m.li
                    key={item.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="border-line aria-[current=page]:text-olive-ink block border-b py-3 font-serif text-[2rem] leading-tight"
                    >
                      {item.label}
                    </Link>
                  </m.li>
                ))}
              </ul>
            </nav>

            <div className="container-page pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Link
                href={bookingHref}
                onClick={onClose}
                className="bg-forest text-cream flex min-h-14 w-full items-center justify-center rounded-full text-base font-semibold"
              >
                Book Your Stay
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
