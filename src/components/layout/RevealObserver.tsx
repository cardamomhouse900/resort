"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * One tiny observer for the whole site instead of a client component per
 * animated element. Server-rendered elements opt in with `data-reveal`
 * (or `data-reveal="image"` for a clip-path wipe).
 *
 * Elements already on screen are marked revealed *before* motion is switched
 * on, so above-the-fold content never flickers.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"));

    for (const el of elements) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-revealed");
    }
    root.dataset.motion = "on";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    elements.forEach((el) => {
      if (!el.classList.contains("is-revealed")) io.observe(el);
    });

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
