/**
 * Custom next/image loader.
 *
 * Two delivery modes, chosen at build time with NEXT_PUBLIC_IMAGE_DELIVERY:
 *
 * - "direct" (default; local development): the browser fetches resized images
 *   straight from the image CDNs — Cloudinary (`f_auto,q_auto,w_…`) for resort
 *   photos and Unsplash (imgix parameters) for development placeholders.
 *
 * - "cloudflare" (recommended in production on the resort's own domain): images are
 *   requested from the site's own origin through Cloudflare Image Transformations
 *   (`/cdn-cgi/image/<options>/<source>`). Cloudflare fetches the original once,
 *   resizes it, serves AVIF/WebP and caches it at the edge. Because the image comes
 *   from the same domain as the page, the browser needs no extra DNS/TLS connection
 *   before the hero image can start downloading — the main mobile LCP cost.
 *   Requires Image Transformations to be enabled on the Cloudflare zone (see README).
 *
 * Anything else (e.g. local /public files) is returned unchanged.
 */
type LoaderArgs = { src: string; width: number; quality?: number };

const CLOUDINARY = "res.cloudinary.com";
const UNSPLASH = "https://images.unsplash.com/";
const delivery = process.env.NEXT_PUBLIC_IMAGE_DELIVERY === "cloudflare" ? "cloudflare" : "direct";

/** The original to hand to Cloudflare: pre-capped at 2560 px so it never fetches a huge master file. */
function cloudflareSource(src: string): string {
  if (src.includes(CLOUDINARY) && src.includes("/upload/")) {
    return src.replace("/upload/", "/upload/c_limit,w_2560,q_90/");
  }
  if (src.startsWith(UNSPLASH)) {
    const url = new URL(src);
    url.searchParams.set("w", "2560");
    url.searchParams.set("q", "90");
    url.searchParams.set("fm", "jpg");
    return url.toString();
  }
  return src;
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const q = quality ?? 75;

  if (delivery === "cloudflare" && src.startsWith("https://")) {
    return `/cdn-cgi/image/width=${width},quality=${q},format=auto,fit=scale-down/${cloudflareSource(src)}`;
  }

  if (src.includes(CLOUDINARY) && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_${q === 75 ? "auto" : q},c_limit,w_${width}/`);
  }

  if (src.startsWith(UNSPLASH)) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(q));
    return url.toString();
  }

  return src;
}
