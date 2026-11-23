import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EditableImage } from "@/components/admin/ImageListField";
import { Card, PageHeader, Pill, formatDate } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { getRoomTypeForEdit, listAmenities } from "@/services/admin/rooms";
import { formatPaise, toPaise } from "@/utils/money";
import { RoomTypeForm } from "../RoomTypeForm";
import { AddAmenityForm, AddPricingRuleForm, AddUnitForm, DeleteRuleButton, UnitRow } from "./forms";

export const metadata: Metadata = { title: "Edit room type" };

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function EditRoomTypePage({ params, searchParams }: PageProps<"/admin/rooms/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [rt, amenities] = await Promise.all([getRoomTypeForEdit(db, id), listAmenities(db)]);
  if (!rt) notFound();
  const created = (await searchParams).created;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/rooms" className="text-forest hover:underline">
          ← Rooms
        </Link>
      </p>
      <PageHeader
        title={rt.name}
        description={`/rooms/${rt.slug}`}
        actions={
          rt.isActive ? (
            <a
              href={`/rooms/${rt.slug}`}
              target="_blank"
              rel="noopener"
              className="text-forest text-sm underline"
            >
              View on website
            </a>
          ) : (
            <Pill tone="brown">Hidden from website</Pill>
          )
        }
      />
      {created && (
        <p role="status" className="bg-forest/10 text-forest mb-6 rounded-lg px-4 py-3 text-sm">
          Room type created. Add at least one physical room below so guests can book it.
        </p>
      )}

      <div className="grid gap-6 2xl:grid-cols-3">
        <Card title="Details" className="2xl:col-span-2">
          <RoomTypeForm
            canUpload={isCloudinaryConfigured()}
            amenities={amenities}
            values={{
              id: rt.id,
              slug: rt.slug,
              name: rt.name,
              summary: rt.summary,
              description: rt.description,
              basePrice: rt.basePrice.toFixed(2),
              maxAdults: rt.maxAdults,
              maxChildren: rt.maxChildren,
              maxOccupancy: rt.maxOccupancy,
              bedConfiguration: rt.bedConfiguration,
              sizeSqFt: rt.sizeSqFt,
              sortOrder: rt.sortOrder,
              isActive: rt.isActive,
              isPlaceholder: rt.isPlaceholder,
              images: rt.images as EditableImage[],
              amenityIds: rt.amenities.map((a) => a.amenityId),
            }}
          />
          <div className="border-line mt-8 border-t pt-6">
            <h3 className="text-forest text-sm font-semibold">Missing an amenity?</h3>
            <AddAmenityForm />
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={`Physical rooms (${rt.rooms.filter((r) => r.isActive).length} active)`}>
            <p className="text-ink-muted mb-4 text-sm">
              Each physical room can host one booking per night. Guests are assigned a free room
              automatically.
            </p>
            <ul className="divide-line mb-4 divide-y">
              {rt.rooms.map((r) => (
                <UnitRow
                  key={r.id}
                  roomTypeId={rt.id}
                  room={{ id: r.id, name: r.name, notes: r.notes, isActive: r.isActive }}
                />
              ))}
            </ul>
            <AddUnitForm roomTypeId={rt.id} />
          </Card>

          <Card title="Seasonal & weekend prices">
            <p className="text-ink-muted mb-4 text-sm">
              Base price: {formatPaise(toPaise(rt.basePrice))}/night. A rule overrides it on matching nights;
              the highest priority wins.
            </p>
            {rt.pricingRules.length > 0 && (
              <ul className="divide-line mb-4 divide-y text-sm">
                {rt.pricingRules.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium">{p.name}</span> · {formatPaise(toPaise(p.pricePerNight))}
                      <span className="text-ink-muted block text-xs">
                        {formatDate(p.startDate)} – {formatDate(p.endDate)}
                        {p.daysOfWeek.length > 0 && ` · ${p.daysOfWeek.map((d) => DAY[d]).join(", ")}`} ·
                        priority {p.priority}
                      </span>
                    </span>
                    <DeleteRuleButton roomTypeId={rt.id} ruleId={p.id} />
                  </li>
                ))}
              </ul>
            )}
            <AddPricingRuleForm roomTypeId={rt.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
