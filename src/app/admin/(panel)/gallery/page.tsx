import type { Metadata } from "next";
import { ContentList } from "@/components/admin/ContentList";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { gallery } from "@/services/admin/content";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryAdminPage({ searchParams }: PageProps<"/admin/gallery">) {
  await requireAdmin();
  const rows = await gallery.list(await getDb());
  return (
    <ContentList
      title="Gallery"
      description="Photos in the homepage gallery, in display order."
      basePath="/admin/gallery"
      addLabel="Add photo"
      deleted={Boolean((await searchParams).deleted)}
      items={rows.map((g) => ({
        id: g.id,
        title: g.caption || g.alt,
        subtitle: g.caption ? g.alt : undefined,
        image: g.src,
        isActive: g.isActive,
        isPlaceholder: g.isPlaceholder,
      }))}
    />
  );
}
