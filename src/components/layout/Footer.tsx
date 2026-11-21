import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { mainNav, bookingHref } from "@/config/navigation";
import type { siteConfig } from "@/config/site";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { phoneDigits } from "@/utils/format";

type Settings = typeof siteConfig;

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const { contact } = settings;

  return (
    <footer className="bg-forest text-cream/85 pb-24 md:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <p className="text-cream font-serif text-3xl">{settings.name}</p>
          <p className="mt-4 max-w-sm">{settings.description}</p>
          <Link
            href={bookingHref}
            className="bg-cream text-forest mt-8 inline-flex min-h-12 items-center rounded-full px-7 font-semibold transition-colors hover:bg-white"
          >
            Book Your Stay
          </Link>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <p className="eyebrow text-beige!">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-cream transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <div className="flex items-center gap-3">
            <p className="eyebrow text-beige!">Contact</p>
            {settings.isPlaceholder && <SampleBadge label="Placeholder details" />}
          </div>
          <address className="mt-4 space-y-3 not-italic">
            <p className="flex gap-3">
              <MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />
              {contact.address}
            </p>
            <p>
              <a href={`tel:${phoneDigits(contact.phone)}`} className="hover:text-cream flex gap-3">
                <Phone className="mt-1 size-4 shrink-0" aria-hidden="true" />
                {contact.phone}
              </a>
            </p>
            <p>
              <a
                href={`https://wa.me/${phoneDigits(contact.whatsapp).replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cream flex gap-3"
              >
                <MessageCircle className="mt-1 size-4 shrink-0" aria-hidden="true" />
                WhatsApp
              </a>
            </p>
            <p>
              <a href={`mailto:${contact.email}`} className="hover:text-cream flex gap-3">
                <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
                {contact.email}
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-cream/15 border-t">
        <div className="container-page text-cream/75 flex flex-col gap-2 py-6 text-sm sm:flex-row sm:justify-between">
          <p>
            © {year} {settings.name}
          </p>
          {settings.isPlaceholder && (
            <p>Development preview — sample photographs courtesy of Unsplash photographers.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
