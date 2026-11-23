import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditPageHeader } from "@/components/admin/ContentList";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { testimonials } from "@/services/admin/content";
import { TestimonialForm } from "../../content-forms";

export const metadata: Metadata = { title: "Testimonial" };

export default async function TestimonialEditPage({
  params,
  searchParams,
}: PageProps<"/admin/testimonials/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await testimonials.get(await getDb(), id) : null;
  if (!isNew && !row) notFound();
  return (
    <>
      <EditPageHeader
        backHref="/admin/testimonials"
        backLabel="Testimonials"
        title={row?.author ?? "New testimonial"}
        created={Boolean((await searchParams).created)}
      />
      <Card>
        <TestimonialForm
          values={{
            id: row?.id,
            quote: row?.quote ?? "",
            author: row?.author ?? "",
            context: row?.context ?? "",
            sortOrder: row?.sortOrder ?? 10,
            isActive: row?.isActive ?? true,
            isPlaceholder: row?.isPlaceholder ?? false,
          }}
        />
      </Card>
    </>
  );
}
