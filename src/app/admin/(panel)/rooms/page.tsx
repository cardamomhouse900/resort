import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LinkButton, PageHeader, Pill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listRoomTypesForAdmin } from "@/services/admin/rooms";
import { formatPaise, toPaise } from "@/utils/money";

export const metadata: Metadata = { title: "Rooms" };

export default async function RoomsAdminPage() {
  await requireAdmin();
  const types = await listRoomTypesForAdmin(await getDb());

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Room types are what guests book; each has one or more physical rooms that the system assigns automatically."
        actions={<LinkButton href="/admin/rooms/new">Add room type</LinkButton>}
      />
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {types.map((t) => {
          const image = (t.images as { src: string }[])[0];
          return (
            <li key={t.id}>
              <Link
                href={`/admin/rooms/${t.id}`}
                className="border-line hover:border-forest flex gap-4 rounded-2xl border bg-white p-4"
              >
                <div className="bg-beige relative size-24 shrink-0 overflow-hidden rounded-lg">
                  {image && <Image src={image.src} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-forest font-serif text-xl">{t.name}</p>
                  <p className="text-ink-muted text-sm">
                    {formatPaise(toPaise(t.basePrice))} / night · up to {t.maxOccupancy} guests
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    <Pill tone={t._count.rooms > 0 ? "green" : "brown"}>
                      {t._count.rooms} active room{t._count.rooms === 1 ? "" : "s"}
                    </Pill>
                    {!t.isActive && <Pill tone="brown">Hidden</Pill>}
                    {t.isPlaceholder && <Pill>Sample content</Pill>}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
