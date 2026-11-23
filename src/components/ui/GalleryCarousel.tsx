"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/types/content";

/**
 * Swipeable gallery with a native <dialog> lightbox.
 *
 * The carousel is plain CSS scroll-snap: swiping, momentum and trackpad scrolling are
 * handled by the browser itself, so no slider library is downloaded (Swiper used to
 * add ~30 KB of JavaScript to every page with a gallery). The buttons only scroll the
 * track; arrow keys work when the track has focus.
 */
export function GalleryCarousel({ items, showBadges }: { items: GalleryItem[]; showBadges: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active !== null && !dialog.open) dialog.showModal();
    if (active === null && dialog.open) dialog.close();
  }, [active]);

  const updateEnds = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    setAtStart(t.scrollLeft <= 4);
    setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    updateEnds();
    t.addEventListener("scroll", updateEnds, { passive: true });
    window.addEventListener("resize", updateEnds);
    return () => {
      t.removeEventListener("scroll", updateEnds);
      window.removeEventListener("resize", updateEnds);
    };
  }, [updateEnds]);

  const scrollByPage = (dir: 1 | -1) => {
    const t = trackRef.current;
    const slide = t?.querySelector("li");
    if (!t || !slide) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollBy({ left: dir * slide.getBoundingClientRect().width, behavior: reduce ? "auto" : "smooth" });
  };

  const step = (dir: 1 | -1) => setActive((i) => (i === null ? i : (i + dir + items.length) % items.length));

  const current = active !== null ? items[active] : null;
  const navButton =
    "text-forest ring-forest/30 hover:bg-beige inline-flex size-12 items-center justify-center rounded-full ring-1 transition-colors disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <>
      <div className="relative">
        {/* Bleeds to the right edge of the viewport, like a strip of photos running off the page.
            `relative` keeps absolutely positioned descendants (sr-only labels) clipped inside the
            scroller — otherwise they widen the section, which focus can then scroll sideways. */}
        <ul
          ref={trackRef}
          tabIndex={0}
          aria-label="Photo gallery"
          className="relative mr-[calc(50%-50vw)] flex snap-x snap-mandatory [scrollbar-width:none] items-start gap-3 overflow-x-auto overscroll-x-contain pr-4 min-[1440px]:gap-6 sm:gap-4 lg:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <li
              key={item.src}
              className={`w-[85%] shrink-0 snap-start min-[1440px]:w-[31%] sm:w-[60%] lg:w-[40%] ${i % 2 === 1 ? "md:pt-14" : ""}`}
            >
              <button type="button" onClick={() => setActive(i)} className="group block w-full text-left">
                {/* Named by its content (photo alt + visible caption), so the accessible name
                    always contains the visible text (WCAG 2.5.3 "label in name"). */}
                <span className="sr-only">Open photo: </span>
                <span className="bg-beige relative block aspect-[4/5] overflow-hidden rounded-sm">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1440px) 30vw, (min-width: 1024px) 40vw, (min-width: 640px) 60vw, 85vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  {showBadges && item.isPlaceholder && (
                    <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] leading-none font-semibold text-white">
                      SAMPLE
                    </span>
                  )}
                </span>
                {item.caption && <span className="text-ink-muted mt-3 block text-sm">{item.caption}</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={atStart}
            className={navButton}
            aria-label="Previous photos"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={atEnd}
            className={navButton}
            aria-label="Next photos"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/95"
        aria-label="Photo viewer"
      >
        {current && (
          <div className="flex h-full flex-col items-center justify-center p-4 sm:p-10">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 inline-flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close photo viewer"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
            <div className="relative h-[75dvh] w-full max-w-6xl">
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="(min-width: 1152px) 1152px, 100vw"
                loading="eager"
                className="object-contain"
              />
            </div>
            <div className="mt-4 flex w-full max-w-6xl items-center justify-between gap-4 text-white">
              <button
                type="button"
                onClick={() => step(-1)}
                className="inline-flex size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <p className="text-center text-sm text-white/85">
                {current.caption}
                {current.credit && (
                  <span className="block text-xs text-white/60">
                    Sample photo by{" "}
                    <a
                      href={current.credit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {current.credit.name}
                    </a>{" "}
                    on {current.credit.source}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => step(1)}
                className="inline-flex size-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
