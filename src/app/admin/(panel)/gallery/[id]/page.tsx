import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPageHeader } from "@/components/admin/ContentList";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { gallery } from "@/services/admin/content";
import { GalleryForm } from "../../content-forms";

export const metadata: Metadata = { title: "Gallery photo" };

type Credit = { name: string; url: string; source: "Unsplash" | "Resort" };

export default async function GalleryEditPage({ params, searchParams }: PageProps<"/admin/gallery/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await gallery.get(await getDb(), id) : null;
  if (!isNew && !row) notFound();
  return (
    <>
      <EditPageHeader
        backHref="/admin/gallery"
        backLabel="Gallery"
        title={row?.caption || (row ? "Gallery photo" : "New photo")}
        created={Boolean((await searchParams).created)}
      />
      <Card>
        <GalleryForm
          canUpload={isCloudinaryConfigured()}
          values={{
            id: row?.id,
            image: row
              ? {
                  src: row.src,
                  alt: row.alt,
                  isPlaceholder: row.isPlaceholder,
                  credit: (row.credit as Credit | null) ?? undefined,
                }
              : null,
            caption: row?.caption ?? "",
            sortOrder: row?.sortOrder ?? 10,
            isActive: row?.isActive ?? true,
          }}
        />
      </Card>
    </>
  );
}
