"use client";

import { AdminForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { saveSettingsAction } from "./actions";

type Values = {
  resortName: string;
  shortName: string;
  tagline: string;
  description: string;
  locationName: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  mapsUrl: string;
  latitude: string;
  longitude: string;
  advancePercent: number;
  holdMinutes: number;
  taxPercent: string;
  pricesIncludeTax: boolean;
  minNights: number;
  maxNights: number;
  bookingWindowDays: number;
  checkInTime: string;
  checkOutTime: string;
  bookingPolicy: string;
  cancellationPolicy: string;
  isPlaceholder: boolean;
};

export function SettingsForm({ values: v }: { values: Values }) {
  return (
    <AdminForm action={saveSettingsAction} className="space-y-10">
      <section>
        <h2 className="text-h3">Business details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField name="resortName" label="Resort name" defaultValue={v.resortName} />
          <TextField name="shortName" label="Short name (header logo)" defaultValue={v.shortName} />
          <TextField name="tagline" label="Tagline" defaultValue={v.tagline} className="sm:col-span-2" />
          <TextArea
            name="description"
            label="Short description (footer, search results)"
            defaultValue={v.description}
            rows={3}
            className="sm:col-span-2"
          />
          <TextField
            name="locationName"
            label="Location (town, district, state)"
            defaultValue={v.locationName}
          />
          <TextField name="address" label="Full address" defaultValue={v.address} />
          <TextField name="phone" label="Phone" defaultValue={v.phone} />
          <TextField name="whatsapp" label="WhatsApp number" defaultValue={v.whatsapp} />
          <TextField name="email" label="Email" type="email" defaultValue={v.email} />
          <TextField
            name="mapsUrl"
            label="Google Maps link"
            defaultValue={v.mapsUrl}
            placeholder="https://maps.app.goo.gl/…"
          />
          <TextField
            name="latitude"
            label="Latitude (optional)"
            inputMode="decimal"
            defaultValue={v.latitude}
            placeholder="e.g. 10.0889"
            hint="Helps Google show the resort on maps. In Google Maps, right-click the resort and click the coordinates to copy them."
          />
          <TextField
            name="longitude"
            label="Longitude (optional)"
            inputMode="decimal"
            defaultValue={v.longitude}
            placeholder="e.g. 77.0595"
          />
        </div>
      </section>

      <section>
        <h2 className="text-h3">Booking rules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <TextField
            name="advancePercent"
            label="Advance payment (%)"
            type="number"
            min="1"
            max="100"
            defaultValue={v.advancePercent}
            hint="Collected online when booking."
          />
          <TextField
            name="holdMinutes"
            label="Payment hold (minutes)"
            type="number"
            min="5"
            max="60"
            defaultValue={v.holdMinutes}
            hint="How long a room is held while the guest pays."
          />
          <TextField
            name="bookingWindowDays"
            label="Bookable up to (days ahead)"
            type="number"
            min="1"
            max="730"
            defaultValue={v.bookingWindowDays}
          />
          <TextField
            name="minNights"
            label="Minimum nights"
            type="number"
            min="1"
            defaultValue={v.minNights}
          />
          <TextField
            name="maxNights"
            label="Maximum nights online"
            type="number"
            min="1"
            defaultValue={v.maxNights}
          />
          <div />
          <TextField name="checkInTime" label="Check-in time" type="time" defaultValue={v.checkInTime} />
          <TextField name="checkOutTime" label="Check-out time" type="time" defaultValue={v.checkOutTime} />
          <div />
          <TextField
            name="taxPercent"
            label="Tax on room tariff (%)"
            type="number"
            min="0"
            max="99.99"
            step="0.01"
            defaultValue={v.taxPercent}
            hint="e.g. GST. 0 hides the tax line."
          />
          <div className="sm:col-span-2 sm:self-end">
            <Checkbox
              name="pricesIncludeTax"
              label="Room prices already include tax"
              defaultChecked={v.pricesIncludeTax}
              hint="Untick to add tax on top of the listed prices."
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-h3">Policies</h2>
        <div className="mt-4 grid gap-4">
          <TextArea name="bookingPolicy" label="Booking policy" defaultValue={v.bookingPolicy} rows={4} />
          <TextArea
            name="cancellationPolicy"
            label="Cancellation policy"
            defaultValue={v.cancellationPolicy}
            rows={4}
          />
        </div>
      </section>

      <Checkbox
        name="isPlaceholder"
        label="Details above are still placeholders"
        hint="While ticked, search engines are asked not to index the site. Untick once the real details are entered."
        defaultChecked={v.isPlaceholder}
      />

      <SubmitButton>Save settings</SubmitButton>
    </AdminForm>
  );
}
