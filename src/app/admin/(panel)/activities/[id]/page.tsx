import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPageHeader } from "@/components/admin/ContentList";
import type { EditableImage } from "@/components/admin/ImageListField";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { activities } from "@/services/admin/content";
import { ActivityForm } from "../../content-forms";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityEditPage({
  params,
  searchParams,
}: PageProps<"/admin/activities/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await activities.get(await getDb(), id) : null;
  if (!isNew && !row) notFound();
  return (
    <>
      <EditPageHeader
        backHref="/admin/activities"
        backLabel="Activities"
        title={row?.title ?? "New activity"}
        created={Boolean((await searchParams).created)}
      />
      <Card>
        <ActivityForm
          canUpload={isCloudinaryConfigured()}
          values={{
            id: row?.id,
            slug: row?.slug ?? "",
            title: row?.title ?? "",
            summary: row?.summary ?? "",
            description: row?.description ?? "",
            duration: row?.duration ?? "",
            pricing: row?.priceIncluded ? "included" : row?.priceFrom ? "from" : row ? "on-request" : "from",
            priceFrom: row?.priceFrom?.toFixed(2) ?? "",
            priceNote: row?.priceNote ?? "",
            category: row?.category ?? "NATURE",
            images: (row?.images as EditableImage[] | undefined) ?? [],
            sortOrder: row?.sortOrder ?? 10,
            isActive: row?.isActive ?? true,
            isPlaceholder: row?.isPlaceholder ?? false,
          }}
        />
      </Card>
    </>
  );
}
