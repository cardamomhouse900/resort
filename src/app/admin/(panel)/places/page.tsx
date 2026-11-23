import type { Metadata } from "next";
import { ContentList } from "@/components/admin/ContentList";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { places } from "@/services/admin/content";

export const metadata: Metadata = { title: "Places & attractions" };

export default async function PlacesAdminPage({ searchParams }: PageProps<"/admin/places">) {
  await requireAdmin();
  const rows = await places.list(await getDb());
  return (
    <ContentList
      title="Places & attractions"
      description="Nearby places and tourist attractions. Publish distances and travel times only once verified."
      basePath="/admin/places"
      addLabel="Add place"
      deleted={Boolean((await searchParams).deleted)}
      items={rows.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.location} · ${p.distance}`,
        image: (p.image as { src?: string }).src,
        isActive: p.isActive,
        isPlaceholder: p.isPlaceholder,
        badge: p.kind === "NEARBY" ? "Nearby" : "Attraction",
      }))}
    />
  );
}
