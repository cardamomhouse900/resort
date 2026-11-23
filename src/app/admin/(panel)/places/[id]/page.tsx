import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPageHeader } from "@/components/admin/ContentList";
import type { EditableImage } from "@/components/admin/ImageListField";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { places } from "@/services/admin/content";
import { PlaceForm } from "../../content-forms";

export const metadata: Metadata = { title: "Place" };

export default async function PlaceEditPage({ params, searchParams }: PageProps<"/admin/places/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await places.get(await getDb(), id) : null;
  if (!isNew && !row) notFound();
  return (
    <>
      <EditPageHeader
        backHref="/admin/places"
        backLabel="Places & attractions"
        title={row?.name ?? "New place"}
        created={Boolean((await searchParams).created)}
      />
      <Card>
        <PlaceForm
          canUpload={isCloudinaryConfigured()}
          values={{
            id: row?.id,
            slug: row?.slug ?? "",
            kind: row?.kind ?? "NEARBY",
            name: row?.name ?? "",
            description: row?.description ?? "",
            distance: row?.distance ?? "",
            travelTime: row?.travelTime ?? "",
            location: row?.location ?? "",
            image: (row?.image as EditableImage | undefined) ?? null,
            directionsUrl: row?.directionsUrl ?? "",
            sortOrder: row?.sortOrder ?? 10,
            isActive: row?.isActive ?? true,
            isPlaceholder: row?.isPlaceholder ?? false,
          }}
        />
      </Card>
    </>
  );
}
