import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageHero } from "@/components/ui/PageHero";
import { SampleBadge } from "@/components/ui/SampleBadge";
import { img } from "@/content/placeholder-images";
import { getSiteSettings } from "@/services/content";
import { phoneDigits } from "@/utils/format";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Contact Us",
    description:
      "Get in touch for bookings, group stays and questions. Call, WhatsApp or email us, find us on Google Maps, or send a message.",
    path: "/contact",
    image: img.picnicMisty,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const { contact } = settings;
  const whatsapp = `https://wa.me/${phoneDigits(contact.whatsapp).replace("+", "")}`;

  const items = [
    { icon: MapPin, label: "Address", value: contact.address, href: undefined },
    { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${phoneDigits(contact.phone)}` },
    { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp, href: whatsapp },
    { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
  ];

  return (
    <>
      <PageHero
        title="Contact us"
        eyebrow="Plan your visit"
        intro="Questions about rooms, group stays, activities or directions? We're happy to help."
        image={img.picnicMisty}
        breadcrumbs={[{ name: "Contact", href: "/contact" }]}
      />

      <section className="container-page grid gap-16 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h2">Reach us</h2>
            {settings.isPlaceholder && <SampleBadge label="Placeholder details" />}
          </div>
          <ul className="mt-8 space-y-6">
            {items.map(({ icon: IconC, label, value, href }) => (
              <li key={label} className="flex gap-4">
                <span className="bg-beige text-forest inline-flex size-11 shrink-0 items-center justify-center rounded-full">
                  <IconC className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-olive-ink text-xs font-semibold tracking-[0.16em] uppercase">{label}</p>
                  {href ? (
                    <a
                      href={href}
                      className="text-forest mt-1 block text-lg hover:underline"
                      {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-forest mt-1 text-lg">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Map: replaced with a Google Maps embed once the real location is confirmed. */}
          <div className="bg-beige relative mt-10 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl text-center">
            <div className="px-6">
              <MapPin className="text-olive mx-auto size-8" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-h3 text-forest mt-3 font-serif">Map coming soon</p>
              <p className="text-ink-muted mt-1 text-sm">
                The Google Maps location will appear here once the resort address is confirmed.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <h2 className="text-h2">Send a message</h2>
          <p className="text-ink-muted mt-3 mb-8">
            Tell us your dates and group size, or ask anything about your stay.
          </p>
          <ContactForm fallbackPhone={contact.phone} />
        </div>
      </section>
    </>
  );
}
