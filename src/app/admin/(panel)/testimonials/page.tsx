import type { Metadata } from "next";
import { ContentList } from "@/components/admin/ContentList";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { testimonials } from "@/services/admin/content";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsAdminPage({ searchParams }: PageProps<"/admin/testimonials">) {
  await requireAdmin();
  const rows = await testimonials.list(await getDb());
  return (
    <ContentList
      title="Testimonials"
      description="Genuine guest feedback only. Items marked as sample are never shown on the live site."
      basePath="/admin/testimonials"
      addLabel="Add testimonial"
      deleted={Boolean((await searchParams).deleted)}
      items={rows.map((t) => ({
        id: t.id,
        title: t.author + (t.context ? ` · ${t.context}` : ""),
        subtitle: t.quote,
        isActive: t.isActive,
        isPlaceholder: t.isPlaceholder,
      }))}
    />
  );
}
