"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Gentle vertical parallax for full-bleed images.
 * GSAP + ScrollTrigger are loaded lazily, only on screens ≥ 768px and only when
 * the visitor has not asked for reduced motion — phones never download them.
 */
export function Parallax({ children, amount = 12 }: { children: ReactNode; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const tween = gsap.fromTo(
        el,
        { yPercent: -amount / 2 },
        {
          yPercent: amount / 2,
          ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [amount]);

  // Oversized so the moving image never reveals an edge.
  return (
    <div ref={ref} className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform">
      {children}
    </div>
  );
}
