import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/**
 * Baseline security headers for every response.
 * A Content-Security-Policy is added in Phase 7, once the exact set of
 * third-party origins (Razorpay Checkout, Cloudinary, Sentry) is final.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")',
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Cache Components (`use cache`) is deliberately OFF: @opennextjs/cloudflare
  // does not fully support it yet (build warns). We use the stable model instead:
  // static pages + `unstable_cache` tags + `revalidateTag()` after admin edits.
  // Re-evaluate once OpenNext support lands.
  cacheComponents: false,
  poweredByHeader: false,

  images: {
    // All images are served by external CDNs (Cloudinary for real photos,
    // Unsplash for development placeholders). The custom loader asks those
    // CDNs for correctly sized AVIF/WebP, so no image work runs on Workers.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // 60 = hero images under a gradient; 75 = everything else.
    qualities: [60, 75],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Exposes Cloudflare bindings (R2, D1, env) to `next dev` via getCloudflareContext().
// Only during `next dev`: starting the Wrangler platform proxy inside `next build`
// breaks prerendering of the built-in error pages.
if (process.argv.includes("dev")) {
  void initOpenNextCloudflareForDev();
}
