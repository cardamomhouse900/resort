"use client";

import { useState } from "react";
import { AdminForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/admin/form";
import { formatPaise } from "@/utils/money";
import { cancelBookingAction, refundBookingAction } from "../actions";

function RefundChoice({
  refundablePaise,
  defaultMode,
}: {
  refundablePaise: number;
  defaultMode: "none" | "full";
}) {
  const [mode, setMode] = useState<"none" | "full" | "custom">(defaultMode);
  return (
    <fieldset className="space-y-2">
      <legend className="text-forest text-sm font-semibold">Refund of the online advance</legend>
      {(
        [
          ["none", "No refund"],
          ["full", `Full refund (${formatPaise(refundablePaise)})`],
          ["custom", "Partial refund"],
        ] as const
      ).map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="refund"
            value={value}
            checked={mode === value}
            onChange={() => setMode(value)}
            className="accent-forest"
          />
          {label}
        </label>
      ))}
      {mode === "custom" && (
        <TextField
          name="refundAmount"
          label="Amount to refund (₹)"
          type="number"
          min="1"
          step="0.01"
          max={refundablePaise / 100}
        />
      )}
    </fieldset>
  );
}

export function CancelBookingForm({
  bookingId,
  refundablePaise,
}: {
  bookingId: string;
  refundablePaise: number;
}) {
  return (
    <AdminForm action={cancelBookingAction} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <TextArea
        name="reason"
        label="Reason"
        rows={3}
        required
        placeholder="e.g. Guest requested cancellation by phone"
      />
      {refundablePaise > 0 ? (
        <RefundChoice refundablePaise={refundablePaise} defaultMode="none" />
      ) : (
        <input type="hidden" name="refund" value="none" />
      )}
      <Checkbox name="notifyGuest" label="Email the guest" defaultChecked />
      <p className="text-ink-muted text-xs">
        The room is released immediately. Refunds go back to the guest&apos;s original payment method.
      </p>
      <SubmitButton variant="danger" confirm="Cancel this booking and release the room?">
        Cancel booking
      </SubmitButton>
    </AdminForm>
  );
}

export function RefundForm({ bookingId, refundablePaise }: { bookingId: string; refundablePaise: number }) {
  return (
    <AdminForm action={refundBookingAction} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <RefundChoice refundablePaise={refundablePaise} defaultMode="full" />
      <TextField
        name="reason"
        label="Reason"
        placeholder="e.g. Cancelled 10 days before check-in — full refund per policy"
      />
      <Checkbox name="notifyGuest" label="Email the guest" defaultChecked />
      <SubmitButton variant="secondary" confirm="Issue this refund through Razorpay? This cannot be undone.">
        Issue refund
      </SubmitButton>
    </AdminForm>
  );
}
