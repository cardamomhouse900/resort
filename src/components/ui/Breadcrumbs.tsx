import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { JsonLd } from "./JsonLd";

export type Crumb = { name: string; href: string };

/** Visible breadcrumb trail + BreadcrumbList structured data. Home is added automatically. */
export function Breadcrumbs({ items, tone = "light" }: { items: Crumb[]; tone?: "light" | "dark" }) {
  const trail: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  const color = tone === "light" ? "text-cream/80 hover:text-cream" : "text-ink-muted hover:text-forest";

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm">
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-1.5">
                {last ? (
                  <span aria-current="page" className={tone === "light" ? "text-cream" : "text-forest"}>
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className={`transition-colors ${color}`}>
                      {c.name}
                    </Link>
                    <ChevronRight className={`size-3.5 ${color}`} aria-hidden="true" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: new URL(c.href, siteConfig.url).toString(),
          })),
        }}
      />
    </>
  );
}
