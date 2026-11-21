"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { bookingHref } from "@/config/navigation";

/** Sticky bottom bar on phones: booking CTA + WhatsApp. Hidden on the booking page. */
export function MobileBookBar({ whatsappUrl }: { whatsappUrl: string }) {
  const pathname = usePathname();
  if (pathname.startsWith(bookingHref)) return null;

  return (
    <div className="border-line bg-cream/95 fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
      <div className="flex gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-forest ring-forest/30 inline-flex size-12 shrink-0 items-center justify-center rounded-full ring-1"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </a>
        <Link
          href={bookingHref}
          className="bg-forest text-cream flex min-h-12 flex-1 items-center justify-center rounded-full text-[0.9375rem] font-semibold"
        >
          Book Your Stay
        </Link>
      </div>
    </div>
  );
}
