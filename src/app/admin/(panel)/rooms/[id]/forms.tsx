"use client";

import { useState } from "react";
import { AdminForm, FormError, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { iconNames } from "@/components/ui/iconNames";
import {
  addPricingRuleAction,
  addUnitAction,
  createAmenityAction,
  deletePricingRuleAction,
  updateUnitAction,
} from "../actions";

export function UnitRow({
  roomTypeId,
  room,
}: {
  roomTypeId: string;
  room: { id: string; name: string; notes: string | null; isActive: boolean };
}) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="py-3">
      {editing ? (
        <AdminForm action={updateUnitAction} className="space-y-2">
          <input type="hidden" name="roomId" value={room.id} />
          <input type="hidden" name="roomTypeId" value={roomTypeId} />
          <TextField name="name" label="Room name / number" defaultValue={room.name} />
          <TextField name="notes" label="Internal notes" defaultValue={room.notes ?? ""} />
          <div className="flex gap-2">
            <SubmitButton>Save</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink-muted px-3 text-sm underline"
            >
              Close
            </button>
          </div>
        </AdminForm>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={room.isActive ? "" : "text-ink-muted line-through"}>
            <span className="font-medium">{room.name}</span>
            {room.notes && <span className="text-ink-muted block text-xs">{room.notes}</span>}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-forest px-2 text-sm underline"
            >
              Edit
            </button>
            <AdminForm action={updateUnitAction}>
              <input type="hidden" name="roomId" value={room.id} />
              <input type="hidden" name="roomTypeId" value={roomTypeId} />
              <input type="hidden" name="intent" value={room.isActive ? "deactivate" : "activate"} />
              <SubmitButton variant="secondary" pendingText="…">
                {room.isActive ? "Take out of service" : "Return to service"}
              </SubmitButton>
            </AdminForm>
          </span>
        </div>
      )}
    </li>
  );
}

export function AddUnitForm({ roomTypeId }: { roomTypeId: string }) {
  return (
    <AdminForm action={addUnitAction} resetOnSuccess className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="roomTypeId" value={roomTypeId} />
      <TextField name="name" label="Add a room" placeholder="e.g. Cottage 4" className="flex-1" />
      <SubmitButton>Add</SubmitButton>
    </AdminForm>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AddPricingRuleForm({ roomTypeId }: { roomTypeId: string }) {
  return (
    <AdminForm action={addPricingRuleAction} resetOnSuccess className="space-y-3">
      <input type="hidden" name="roomTypeId" value={roomTypeId} />
      <TextField name="name" label="Rule name" placeholder="e.g. Peak season, Weekends" />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="startDate" label="From" type="date" />
        <TextField name="endDate" label="To (inclusive)" type="date" />
        <TextField name="pricePerNight" label="Price per night (₹)" type="number" min="1" step="0.01" />
        <TextField name="priority" label="Priority" type="number" min="0" defaultValue={1} />
      </div>
      <fieldset>
        <legend className="text-forest text-sm font-semibold">Only on (leave empty for every day)</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="daysOfWeek[]" value={i} className="accent-forest" /> {d}
            </label>
          ))}
        </div>
        <FormError name="daysOfWeek" />
      </fieldset>
      <SubmitButton>Add rule</SubmitButton>
    </AdminForm>
  );
}

export function DeleteRuleButton({ roomTypeId, ruleId }: { roomTypeId: string; ruleId: string }) {
  return (
    <AdminForm action={deletePricingRuleAction}>
      <input type="hidden" name="roomTypeId" value={roomTypeId} />
      <input type="hidden" name="ruleId" value={ruleId} />
      <SubmitButton variant="secondary" confirm="Delete this pricing rule?" pendingText="…">
        Delete
      </SubmitButton>
    </AdminForm>
  );
}

export function AddAmenityForm() {
  return (
    <AdminForm
      action={createAmenityAction}
      resetOnSuccess
      className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
    >
      <TextField name="name" label="Amenity name" placeholder="e.g. Heater" />
      <SelectField name="icon" label="Icon" options={iconNames.map((n) => ({ value: n, label: n }))} />
      <SubmitButton>Add amenity</SubmitButton>
    </AdminForm>
  );
}
