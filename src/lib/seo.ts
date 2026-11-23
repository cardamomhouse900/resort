import "server-only";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { img } from "@/content/placeholder-images";
import { getGallery, getSiteSettings } from "@/services/content";
import type { ImageAsset } from "@/types/content";

/** Absolute URL on the public site (for canonical links, sitemaps and structured data). */
export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

/**
 * 1200×630 JPEG for link previews (WhatsApp, Facebook, X, Google).
 * Always requested straight from the image CDN — preview crawlers do not
 * support AVIF/WebP, so the format is fixed to JPEG.
 */
export function socialImageUrl(src: string): string {
  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", "/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/");
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    for (const [k, v] of Object.entries({ w: "1200", h: "630", fit: "crop", fm: "jpg", q: "75" })) {
      url.searchParams.set(k, v);
    }
    url.searchParams.delete("auto");
    return url.toString();
  }
  return absoluteUrl(src);
}

export function socialImage(image: ImageAsset) {
  return { url: socialImageUrl(image.src), width: 1200, height: 630, alt: image.alt };
}

/** Default link-preview image: the first real resort photo; the placeholder hero only until one exists. */
export async function defaultSocialImage() {
  const gallery = await getGallery();
  return socialImage(gallery.find((g) => !g.isPlaceholder) ?? img.heroRoadValley);
}

type PageMeta = {
  /** Page title; the root layout appends " | <resort name>" unless `absoluteTitle` is set. */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  /** Path of the canonical URL, e.g. "/rooms". */
  path: string;
  /** Link-preview image; the site default when omitted. */
  image?: ImageAsset;
};

/**
 * Complete metadata for a public page.
 *
 * Next.js merges metadata shallowly: a page that sets `openGraph` replaces the
 * layout's whole `openGraph` object. This helper therefore always builds the
 * full Open Graph / Twitter set, so no page loses the site name or locale.
 */
export async function pageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  image,
}: PageMeta): Promise<Metadata> {
  const settings = await getSiteSettings();
  const fullTitle = absoluteTitle ? title : `${title} | ${settings.name}`;
  const images = [image ? socialImage(image) : await defaultSocialImage()];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: settings.name,
      url: path,
      title: fullTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: images.map((i) => i.url),
    },
  };
}
