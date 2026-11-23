"use client";

import { AdminForm, SelectField, SubmitButton, TextField } from "@/components/admin/form";
import { blockDatesAction, unblockDatesAction } from "./actions";

export function BlockForm({ rooms, today }: { rooms: { id: string; label: string }[]; today: string }) {
  return (
    <AdminForm action={blockDatesAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      <SelectField
        name="roomId"
        label="Room"
        options={rooms.map((r) => ({ value: r.id, label: r.label }))}
        className="sm:col-span-2"
      />
      <TextField name="checkIn" label="From (first blocked night)" type="date" min={today} required />
      <TextField name="checkOut" label="Until (room free again on)" type="date" min={today} required />
      <TextField
        name="note"
        label="Reason (optional)"
        placeholder="e.g. Painting, private family use"
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <SubmitButton>Block dates</SubmitButton>
      </div>
    </AdminForm>
  );
}

export function UnblockButton({ reservationId }: { reservationId: string }) {
  return (
    <AdminForm action={unblockDatesAction}>
      <input type="hidden" name="reservationId" value={reservationId} />
      <SubmitButton variant="secondary" confirm="Remove this block and make the dates bookable again?">
        Unblock
      </SubmitButton>
    </AdminForm>
  );
}
