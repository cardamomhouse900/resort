import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * robots.txt. Crawling is allowed; while the site still shows placeholder content
 * every page carries a `noindex` robots meta tag instead (see app/layout.tsx), which
 * search engines can only see if they are allowed to crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/booking/confirmation"] }],
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
