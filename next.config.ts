import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV === "development";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * Content-Security-Policy.
 *
 * Every third-party origin the browser may contact is listed explicitly:
 *  - Razorpay Checkout: its script, the payment iframe/popups and its API calls
 *  - Cloudinary: resort photos, and direct uploads from the admin dashboard
 *  - Unsplash: development placeholder photos (remove once all are replaced)
 *
 * `script-src` allows 'unsafe-inline' because Next.js streams page data in small
 * inline scripts. The strict alternative (a per-request nonce) would force every
 * page to be rendered on each request instead of served from cache, which this
 * site deliberately avoids. All other directives are locked down: no plugins, no
 * <base> hijacking, no framing of this site, forms post only to this site, and
 * scripts/connections/frames only to the origins below.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.razorpay.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.cloudinary.com https://*.razorpay.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only on the real HTTPS site: on http://localhost it would break every asset request.
  ...(!isDev && siteUrl.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** Security headers for every response. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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

  // experimental.inlineCss was measured in Phase 7 and left OFF: Next.js embeds the
  // inlined stylesheet twice (in <style> and in the page data), adding ~26 KB gzipped
  // to every HTML response, which made mobile LCP worse than one cached CSS request.

  // The Prisma CLI, its local dev database (PGlite) and engines for other databases are
  // development tools. Excluding them keeps the Cloudflare Worker far below the 10 MB limit;
  // the app only needs the generated client in src/generated/.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/prisma/**",
      "node_modules/@prisma/dev/**",
      "node_modules/@prisma/studio-core/**",
      "node_modules/@prisma/engines/**",
      "node_modules/@prisma/fetch-engine/**",
      "node_modules/@electric-sql/**",
      "node_modules/typescript/**",
    ],
  },

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
    // The Cloudflare build (npm run cf:build sets PRISMA_RUNTIME=workerd) swaps in the
    // Workers-compatible Prisma client. Everywhere else "#prisma" is the Node.js client.
    ...(process.env.PRISMA_RUNTIME === "workerd"
      ? { resolveAlias: { "#prisma": "./src/generated/prisma-workerd/client.ts" } }
      : {}),
  },
};

export default nextConfig;

// Exposes Cloudflare bindings (R2, D1, env) to `next dev` via getCloudflareContext().
// Only during `next dev`: starting the Wrangler platform proxy inside `next build`
// breaks prerendering of the built-in error pages.
if (process.argv.includes("dev")) {
  void initOpenNextCloudflareForDev();
}
