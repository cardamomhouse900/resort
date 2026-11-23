import type { Metadata } from "next";
import { ContentList } from "@/components/admin/ContentList";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities } from "@/services/admin/content";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesAdminPage({ searchParams }: PageProps<"/admin/activities">) {
  await requireAdmin();
  const rows = await activities.list(await getDb());
  return (
    <ContentList
      title="Activities"
      description="Shown on the Activities page; the first adventure activity is featured on the homepage."
      basePath="/admin/activities"
      addLabel="Add activity"
      deleted={Boolean((await searchParams).deleted)}
      items={rows.map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: a.summary,
        image: (a.images as { src: string }[])[0]?.src,
        isActive: a.isActive,
        isPlaceholder: a.isPlaceholder,
        badge: a.category.toLowerCase(),
      }))}
    />
  );
}
