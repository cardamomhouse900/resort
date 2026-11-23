import type { Metadata } from "next";
import { ContentList } from "@/components/admin/ContentList";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { facilities } from "@/services/admin/content";

export const metadata: Metadata = { title: "Facilities" };

export default async function FacilitiesAdminPage({ searchParams }: PageProps<"/admin/facilities">) {
  await requireAdmin();
  const rows = await facilities.list(await getDb());
  return (
    <ContentList
      title="Facilities"
      description="Shown on the Facilities page and the homepage. Items with a photo appear as large features."
      basePath="/admin/facilities"
      addLabel="Add facility"
      deleted={Boolean((await searchParams).deleted)}
      items={rows.map((f) => ({
        id: f.id,
        title: f.name,
        subtitle: f.description,
        image: (f.image as { src?: string } | null)?.src,
        isActive: f.isActive,
        isPlaceholder: f.isPlaceholder,
      }))}
    />
  );
}
