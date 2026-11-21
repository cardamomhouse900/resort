/**
 * Custom next/image loader.
 *
 * - Cloudinary (final resort photos): injects `f_auto,q_auto,w_<width>` so the
 *   CDN serves AVIF/WebP at the requested width.
 * - Unsplash (development placeholders): uses its imgix parameters.
 * - Anything else (e.g. local /public files) is returned unchanged.
 */
type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  const q = quality ?? 75;

  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_${q === 75 ? "auto" : q},c_limit,w_${width}/`);
  }

  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(q));
    return url.toString();
  }

  return src;
}
