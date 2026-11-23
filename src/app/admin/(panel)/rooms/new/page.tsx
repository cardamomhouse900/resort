import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { listAmenities } from "@/services/admin/rooms";
import { RoomTypeForm } from "../RoomTypeForm";

export const metadata: Metadata = { title: "New room type" };

export default async function NewRoomTypePage() {
  await requireAdmin();
  const amenities = await listAmenities(await getDb());
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/rooms" className="text-forest hover:underline">
          ← Rooms
        </Link>
      </p>
      <PageHeader
        title="New room type"
        description="After saving, add the physical rooms of this type so guests can book them."
      />
      <Card>
        <RoomTypeForm
          canUpload={isCloudinaryConfigured()}
          amenities={amenities}
          values={{
            slug: "",
            name: "",
            summary: "",
            description: [],
            basePrice: "",
            maxAdults: 2,
            maxChildren: 0,
            maxOccupancy: 2,
            bedConfiguration: "",
            sizeSqFt: null,
            sortOrder: 10,
            isActive: true,
            isPlaceholder: false,
            images: [],
            amenityIds: [],
          }}
        />
      </Card>
    </>
  );
}
