"use client";

import { AdminForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { ImageListField, type EditableImage } from "@/components/admin/ImageListField";
import { iconNames } from "@/components/ui/iconNames";
import type { FormState } from "@/lib/form";
import {
  deleteActivity,
  deleteFacility,
  deleteGalleryImage,
  deletePlace,
  deleteTestimonial,
  saveActivity,
  saveFacility,
  saveGalleryImage,
  savePlace,
  saveTestimonial,
} from "./content-actions";
import { signImageUpload } from "./upload-actions";

type Action = (s: FormState, f: FormData) => Promise<FormState>;

function Shell({
  id,
  save,
  remove,
  label,
  children,
}: {
  id?: string;
  save: Action;
  remove: Action;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminForm action={save} className="space-y-5">
        {id && <input type="hidden" name="id" value={id} />}
        {children}
        <SubmitButton>{id ? "Save changes" : `Create ${label}`}</SubmitButton>
      </AdminForm>
      {id && (
        <AdminForm action={remove} className="border-line mt-8 border-t pt-6">
          <input type="hidden" name="id" value={id} />
          <p className="text-ink-muted mb-3 text-sm">
            Deleting removes this {label} from the website permanently. To hide it temporarily, untick “Show
            on website” instead.
          </p>
          <SubmitButton variant="danger" confirm={`Delete this ${label} permanently?`}>
            Delete {label}
          </SubmitButton>
        </AdminForm>
      )}
    </>
  );
}

const common = (v: { sortOrder: number; isActive: boolean }) => (
  <div className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-end">
    <TextField name="sortOrder" label="Display order" type="number" min="0" defaultValue={v.sortOrder} />
    <Checkbox name="isActive" label="Show on website" defaultChecked={v.isActive} />
  </div>
);

const sample = (v: { isPlaceholder: boolean }) => (
  <Checkbox
    name="isPlaceholder"
    label="Sample content"
    hint="Placeholder text — shows a SAMPLE tag in development."
    defaultChecked={v.isPlaceholder}
  />
);

/* ------------------------------------------------------------ Facility */
export type FacilityValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  image: EditableImage | null;
  sortOrder: number;
  isActive: boolean;
  isPlaceholder: boolean;
};

export function FacilityForm({ values, canUpload }: { values: FacilityValues; canUpload: boolean }) {
  return (
    <Shell id={values.id} save={saveFacility} remove={deleteFacility} label="facility">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={values.name} />
        <TextField
          name="slug"
          label="Slug"
          defaultValue={values.slug}
          hint="Used as an anchor: /facilities#slug"
        />
        <TextArea
          name="description"
          label="Description"
          defaultValue={values.description}
          rows={3}
          className="sm:col-span-2"
        />
        <SelectField
          name="icon"
          label="Icon"
          defaultValue={values.icon}
          options={iconNames.map((n) => ({ value: n, label: n }))}
        />
      </div>
      <ImageListField
        name="image"
        label="Photo (optional)"
        single
        initial={values.image ? [values.image] : []}
        getUploadSignature={canUpload ? signImageUpload : undefined}
      />
      {common(values)}
      {sample(values)}
    </Shell>
  );
}

/* ------------------------------------------------------------ Activity */
export type ActivityValues = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  duration: string;
  pricing: "included" | "from" | "on-request";
  priceFrom: string;
  priceNote: string;
  category: string;
  images: EditableImage[];
  sortOrder: number;
  isActive: boolean;
  isPlaceholder: boolean;
};

export function ActivityForm({ values, canUpload }: { values: ActivityValues; canUpload: boolean }) {
  return (
    <Shell id={values.id} save={saveActivity} remove={deleteActivity} label="activity">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" label="Title" defaultValue={values.title} />
        <TextField name="slug" label="Slug" defaultValue={values.slug} />
        <TextArea
          name="summary"
          label="Short summary"
          defaultValue={values.summary}
          rows={2}
          className="sm:col-span-2"
        />
        <TextArea
          name="description"
          label="Full description"
          defaultValue={values.description}
          rows={5}
          className="sm:col-span-2"
        />
        <TextField
          name="duration"
          label="Duration"
          defaultValue={values.duration}
          placeholder="e.g. 2–3 hours"
        />
        <SelectField
          name="category"
          label="Category"
          defaultValue={values.category}
          options={[
            { value: "ADVENTURE", label: "Adventure" },
            { value: "NATURE", label: "Nature" },
            { value: "FAMILY", label: "Family" },
            { value: "RELAXATION", label: "Relaxation" },
          ]}
        />
        <SelectField
          name="pricing"
          label="Pricing"
          defaultValue={values.pricing}
          options={[
            { value: "included", label: "Included with the stay" },
            { value: "from", label: "Priced (from ₹…)" },
            { value: "on-request", label: "Price on request" },
          ]}
        />
        <TextField
          name="priceFrom"
          label="Price from (₹) — if priced"
          type="number"
          min="0"
          step="0.01"
          defaultValue={values.priceFrom}
        />
        <TextField
          name="priceNote"
          label="Price note (optional)"
          defaultValue={values.priceNote}
          placeholder="e.g. per vehicle (up to 5 guests)"
          className="sm:col-span-2"
        />
      </div>
      <ImageListField
        name="images"
        label="Photos"
        initial={values.images}
        getUploadSignature={canUpload ? signImageUpload : undefined}
      />
      {common(values)}
      {sample(values)}
    </Shell>
  );
}

/* --------------------------------------------------------------- Place */
export type PlaceValues = {
  id?: string;
  slug: string;
  kind: "NEARBY" | "ATTRACTION";
  name: string;
  description: string;
  distance: string;
  travelTime: string;
  location: string;
  image: EditableImage | null;
  directionsUrl: string;
  sortOrder: number;
  isActive: boolean;
  isPlaceholder: boolean;
};

export function PlaceForm({ values, canUpload }: { values: PlaceValues; canUpload: boolean }) {
  return (
    <Shell id={values.id} save={savePlace} remove={deletePlace} label="place">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={values.name} />
        <TextField name="slug" label="Slug" defaultValue={values.slug} />
        <SelectField
          name="kind"
          label="Show on"
          defaultValue={values.kind}
          options={[
            { value: "NEARBY", label: "Nearby Places page" },
            { value: "ATTRACTION", label: "Attractions page" },
          ]}
        />
        <TextField
          name="location"
          label="Location"
          defaultValue={values.location}
          placeholder="e.g. Village, district"
        />
        <TextArea
          name="description"
          label="Description"
          defaultValue={values.description}
          rows={4}
          className="sm:col-span-2"
        />
        <TextField
          name="distance"
          label="Distance"
          defaultValue={values.distance}
          placeholder="e.g. 12 km"
          hint="Only publish verified distances."
        />
        <TextField
          name="travelTime"
          label="Travel time"
          defaultValue={values.travelTime}
          placeholder="e.g. 25 min by car"
        />
        <TextField
          name="directionsUrl"
          label="Google Maps link (optional)"
          defaultValue={values.directionsUrl}
          placeholder="https://maps.app.goo.gl/…"
          className="sm:col-span-2"
        />
      </div>
      <ImageListField
        name="image"
        label="Photo"
        single
        initial={values.image ? [values.image] : []}
        getUploadSignature={canUpload ? signImageUpload : undefined}
      />
      {common(values)}
      {sample(values)}
    </Shell>
  );
}

/* ------------------------------------------------------------- Gallery */
export type GalleryValues = {
  id?: string;
  image: EditableImage | null;
  caption: string;
  sortOrder: number;
  isActive: boolean;
};

export function GalleryForm({ values, canUpload }: { values: GalleryValues; canUpload: boolean }) {
  return (
    <Shell id={values.id} save={saveGalleryImage} remove={deleteGalleryImage} label="photo">
      <ImageListField
        name="image"
        label="Photo"
        single
        initial={values.image ? [values.image] : []}
        getUploadSignature={canUpload ? signImageUpload : undefined}
      />
      <TextField name="caption" label="Caption (optional)" defaultValue={values.caption} />
      {common(values)}
    </Shell>
  );
}

/* --------------------------------------------------------- Testimonial */
export type TestimonialValues = {
  id?: string;
  quote: string;
  author: string;
  context: string;
  sortOrder: number;
  isActive: boolean;
  isPlaceholder: boolean;
};

export function TestimonialForm({ values }: { values: TestimonialValues }) {
  return (
    <Shell id={values.id} save={saveTestimonial} remove={deleteTestimonial} label="testimonial">
      <TextArea
        name="quote"
        label="Quote"
        defaultValue={values.quote}
        rows={4}
        hint="Publish only genuine guest feedback, with permission."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="author"
          label="Guest name"
          defaultValue={values.author}
          placeholder="e.g. Anita R."
        />
        <TextField
          name="context"
          label="Context (optional)"
          defaultValue={values.context}
          placeholder="e.g. Family stay, May 2026"
        />
      </div>
      {common(values)}
      {sample(values)}
    </Shell>
  );
}
