import Image from "next/image";
import type { CSSProperties } from "react";
import { showSampleBadges } from "@/config/site";
import type { ImageAsset } from "@/types/content";

type PhotoProps = {
  image: ImageAsset;
  /** Responsive sizes hint — always set this accurately for performance. */
  sizes: string;
  className?: string;
  imgClassName?: string;
  /**
   * Only for the single LCP image of a page: loads eagerly with
   * fetchpriority="high" and slightly lower quality (it sits under a gradient).
   */
  lcp?: boolean;
  /** Show just "SAMPLE" (no credit) on small images. */
  compactBadge?: boolean;
  badgePosition?: keyof typeof badgeClasses;
  /** Clip-path wipe when scrolled into view. */
  reveal?: boolean;
  style?: CSSProperties;
  /** Tailwind classes for a tint/gradient drawn over the image but under the Sample tag. */
  overlay?: string;
};

const badgeClasses = {
  "top-left": "top-3 left-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "right-3 bottom-3",
  /** Inside <Parallax>: its box overhangs the section by 8% and moves up to ~6% more. */
  "parallax-bottom-right": "right-3 bottom-[calc(13%+0.75rem)]",
} as const;

/**
 * Responsive image that fills its (relatively positioned) container.
 * In development, placeholder images carry a "Sample" tag with the
 * photographer credit so they are never mistaken for resort photographs.
 */
export function Photo({
  image,
  sizes,
  className = "",
  imgClassName = "",
  lcp = false,
  compactBadge = false,
  badgePosition = "top-left",
  reveal = false,
  style,
  overlay,
}: PhotoProps) {
  const showBadge = showSampleBadges && image.isPlaceholder;
  const credit = !compactBadge && image.credit ? ` · ${image.credit.name} / ${image.credit.source}` : "";
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-reveal={reveal ? "image" : undefined}
      style={style}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={lcp ? "eager" : "lazy"}
        fetchPriority={lcp ? "high" : undefined}
        quality={lcp ? 60 : 75}
        className={`object-cover ${imgClassName}`}
      />
      {overlay && <div className={`absolute inset-0 ${overlay}`} aria-hidden="true" />}
      {showBadge && (
        <span
          className={`pointer-events-none absolute z-10 rounded-full bg-black/60 px-2.5 py-1 text-[0.6875rem] leading-none font-semibold tracking-wide text-white ${badgeClasses[badgePosition]}`}
        >
          SAMPLE{credit}
        </span>
      )}
    </div>
  );
}
