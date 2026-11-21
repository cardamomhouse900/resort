import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { preconnect } from "react-dom";
import { siteConfig } from "@/config/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Mountain Nature Stay`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
  },
  // Until real content replaces the placeholders, keep search engines out.
  // Phase 7 switches this on for production.
  robots: siteConfig.isPlaceholder ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#244A35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Open connections to the image CDNs early: the hero (LCP) image comes from one of them.
  preconnect("https://res.cloudinary.com");
  preconnect("https://images.unsplash.com");

  return (
    <html lang="en-IN" className={`${cormorant.variable} ${cormorantItalic.variable} ${manrope.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
