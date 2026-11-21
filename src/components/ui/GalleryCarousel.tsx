"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/types/content";
import "swiper/css";

/**
 * Swipeable gallery with a native <dialog> lightbox.
 * Only loaded on pages that show a gallery.
 */
export function GalleryCarousel({ items, showBadges }: { items: GalleryItem[]; showBadges: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Callback refs held in state so Swiper re-initialises navigation once the buttons mount.
  const [prevEl, setPrevEl] = useState<HTMLButtonElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (active !== null && !dialog.open) dialog.showModal();
    if (active === null && dialog.open) dialog.close();
  }, [active]);

  const step = (dir: 1 | -1) => setActive((i) => (i === null ? i : (i + dir + items.length) % items.length));

  const current = active !== null ? items[active] : null;

  return (
    <>
      <div className="relative">
        <Swiper
          modules={[Navigation, Keyboard, A11y]}
          slidesPerView={1.15}
          spaceBetween={12}
          keyboard={{ enabled: true }}
          navigation={{ prevEl, nextEl }}
          breakpoints={{
            640: { slidesPerView: 1.6, spaceBetween: 16 },
            1024: { slidesPerView: 2.4, spaceBetween: 20 },
            1440: { slidesPerView: 3.1, spaceBetween: 24 },
          }}
          a11y={{ prevSlideMessage: "Previous photo", nextSlideMessage: "Next photo" }}
          className="overflow-visible!"
        >
          {items.map((item, i) => (
            <SwiperSlide key={item.src} className={i % 2 === 1 ? "md:pt-14" : ""}>
              <button
                type="button"
                onClick={() => setActive(i)}
                className="group block w-full text-left"
                aria-label={`Open photo: ${item.caption ?? item.alt}`}
              >
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
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="mt-8 flex justify-end gap-3">
          <button
            ref={setPrevEl}
            type="button"
            className="text-forest ring-forest/30 hover:bg-beige inline-flex size-12 items-center justify-center rounded-full ring-1 transition-colors disabled:opacity-40"
            aria-label="Previous photos"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            ref={setNextEl}
            type="button"
            className="text-forest ring-forest/30 hover:bg-beige inline-flex size-12 items-center justify-center rounded-full ring-1 transition-colors disabled:opacity-40"
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
