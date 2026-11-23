import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Pill, formatDateTime } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listInquiries } from "@/services/admin/content";
import { InquiryStatusButtons } from "./InquiryStatusButtons";

export const metadata: Metadata = { title: "Inquiries" };

export default async function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  await requireAdmin();
  const archived = (await searchParams).show === "archived";
  const rows = await listInquiries(await getDb(), archived ? "ARCHIVED" : undefined);

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Messages from the website contact form."
        actions={
          <Link
            href={archived ? "/admin/inquiries" : "/admin/inquiries?show=archived"}
            className="text-forest text-sm underline"
          >
            {archived ? "Show open messages" : "Show archived"}
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState>{archived ? "No archived messages." : "No open messages."}</EmptyState>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.id} className="border-line rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-forest font-semibold">
                    {m.name} {m.status === "NEW" && <Pill tone="brown">New</Pill>}{" "}
                    {m.status === "REPLIED" && <Pill tone="green">Replied</Pill>}
                  </p>
                  <p className="text-sm">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent("Your enquiry")}`}
                      className="text-forest underline"
                    >
                      {m.email}
                    </a>
                    {m.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="text-forest underline">
                          {m.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <p className="text-ink-muted text-xs">{formatDateTime(m.createdAt)}</p>
              </div>
              <p className="mt-3 text-[0.9375rem] whitespace-pre-line">{m.message}</p>
              <InquiryStatusButtons id={m.id} status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
