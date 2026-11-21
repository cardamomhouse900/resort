import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileBookBar } from "@/components/layout/MobileBookBar";
import { RevealObserver } from "@/components/layout/RevealObserver";
import { getSiteSettings } from "@/services/content";
import { phoneDigits } from "@/utils/format";

export default async function WebsiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  const whatsappUrl = `https://wa.me/${phoneDigits(settings.contact.whatsapp).replace("+", "")}`;

  return (
    <>
      <Header siteName={settings.shortName} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} />
      <MobileBookBar whatsappUrl={whatsappUrl} />
      <RevealObserver />
    </>
  );
}
