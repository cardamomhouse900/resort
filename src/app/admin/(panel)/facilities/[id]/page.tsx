import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPageHeader } from "@/components/admin/ContentList";
import type { EditableImage } from "@/components/admin/ImageListField";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { facilities } from "@/services/admin/content";
import { FacilityForm } from "../../content-forms";

export const metadata: Metadata = { title: "Facility" };

export default async function FacilityEditPage({
  params,
  searchParams,
}: PageProps<"/admin/facilities/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await facilities.get(await getDb(), id) : null;
  if (!isNew && !row) notFound();
  return (
    <>
      <EditPageHeader
        backHref="/admin/facilities"
        backLabel="Facilities"
        title={row?.name ?? "New facility"}
        created={Boolean((await searchParams).created)}
      />
      <Card>
        <FacilityForm
          canUpload={isCloudinaryConfigured()}
          values={{
            id: row?.id,
            slug: row?.slug ?? "",
            name: row?.name ?? "",
            description: row?.description ?? "",
            icon: row?.icon ?? "leaf",
            image: (row?.image as EditableImage | null) ?? null,
            sortOrder: row?.sortOrder ?? 10,
            isActive: row?.isActive ?? true,
            isPlaceholder: row?.isPlaceholder ?? false,
          }}
        />
      </Card>
    </>
  );
}
