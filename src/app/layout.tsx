import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { preconnect } from "react-dom";
import { siteConfig } from "@/config/site";
import { defaultSocialImage } from "@/lib/seo";
import { getSiteSettings } from "@/services/content";
import "./globals.css";

// Self-hosted at build time by next/font: no external font request, no layout shift.
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

// Italic is only used for one accent line, so it is not preloaded —
// it must not compete with the hero image for bandwidth on mobile.
const cormorantItalic = Cormorant_Garamond({
  variable: "--font-cormorant-italic",
  subsets: ["latin"],
  weight: ["500"],
  style: ["italic"],
  display: "swap",
  preload: false,
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [s, preview] = await Promise.all([getSiteSettings(), defaultSocialImage()]);
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${s.name} | Mountain Nature Stay`,
      template: `%s | ${s.name}`,
    },
    description: s.description,
    applicationName: s.name,
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: s.name,
      images: [preview],
    },
    twitter: { card: "summary_large_image", images: [preview.url] },
    // Search engines are kept out until an admin turns off "placeholder content" in
    // Settings — sample text and stock photos must never be indexed as the real resort.
    robots: s.isPlaceholder
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" },
  };
}

export const viewport: Viewport = {
  themeColor: "#244A35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // With direct delivery the hero (LCP) image comes from an image CDN: open that connection early.
  // With Cloudflare delivery images are same-origin, so no extra connection is needed.
  if (process.env.NEXT_PUBLIC_IMAGE_DELIVERY !== "cloudflare") {
    preconnect("https://res.cloudinary.com");
    preconnect("https://images.unsplash.com");
  }

  return (
    <html lang="en-IN" className={`${cormorant.variable} ${cormorantItalic.variable} ${manrope.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
