"use client";

import { AdminForm, Checkbox, FormError, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { ImageListField, type EditableImage } from "@/components/admin/ImageListField";
import { signImageUpload } from "../upload-actions";
import { saveRoomTypeAction } from "./actions";

export type RoomTypeFormValues = {
  id?: string;
  slug: string;
  name: string;
  summary: string;
  description: string[];
  basePrice: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  bedConfiguration: string;
  sizeSqFt: number | null;
  sortOrder: number;
  isActive: boolean;
  isPlaceholder: boolean;
  images: EditableImage[];
  amenityIds: string[];
};

export function RoomTypeForm({
  values,
  amenities,
  canUpload,
}: {
  values: RoomTypeFormValues;
  amenities: { id: string; name: string }[];
  canUpload: boolean;
}) {
  return (
    <AdminForm action={saveRoomTypeAction} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={values.name} required />
        <TextField
          name="slug"
          label="URL slug"
          defaultValue={values.slug}
          hint="Used in the page address: /rooms/your-slug. Changing it breaks old links."
          required
        />
        <TextArea
          name="summary"
          label="Short summary"
          defaultValue={values.summary}
          rows={2}
          className="sm:col-span-2"
        />
        <TextArea
          name="description"
          label="Description"
          defaultValue={values.description.join("\n\n")}
          rows={6}
          hint="Separate paragraphs with a blank line."
          className="sm:col-span-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="basePrice"
          label="Price per night (₹)"
          type="number"
          min="1"
          step="0.01"
          defaultValue={values.basePrice}
          required
        />
        <TextField
          name="bedConfiguration"
          label="Beds"
          defaultValue={values.bedConfiguration}
          className="sm:col-span-2"
        />
        <TextField
          name="maxAdults"
          label="Max adults"
          type="number"
          min="1"
          defaultValue={values.maxAdults}
        />
        <TextField
          name="maxChildren"
          label="Max children"
          type="number"
          min="0"
          defaultValue={values.maxChildren}
        />
        <TextField
          name="maxOccupancy"
          label="Max guests in total"
          type="number"
          min="1"
          defaultValue={values.maxOccupancy}
        />
        <TextField
          name="sizeSqFt"
          label="Size (sq ft, optional)"
          type="number"
          defaultValue={values.sizeSqFt ?? ""}
        />
        <TextField
          name="sortOrder"
          label="Display order"
          type="number"
          min="0"
          defaultValue={values.sortOrder}
          hint="Lower numbers appear first."
        />
      </div>

      <fieldset>
        <legend className="text-forest text-sm font-semibold">Amenities</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="amenityIds[]"
                value={a.id}
                defaultChecked={values.amenityIds.includes(a.id)}
                className="accent-forest size-4"
              />
              {a.name}
            </label>
          ))}
        </div>
        <FormError name="amenityIds" />
      </fieldset>

      <ImageListField
        name="images"
        label="Photos (first one is the main photo)"
        initial={values.images}
        getUploadSignature={canUpload ? signImageUpload : undefined}
      />

      <div className="space-y-3">
        <Checkbox
          name="isActive"
          label="Show on the website and accept bookings"
          defaultChecked={values.isActive}
        />
        <Checkbox
          name="isPlaceholder"
          label="Sample content"
          hint="Marks this room as placeholder content (shows a SAMPLE tag in development)."
          defaultChecked={values.isPlaceholder}
        />
      </div>

      <SubmitButton>{values.id ? "Save changes" : "Create room type"}</SubmitButton>
    </AdminForm>
  );
}
