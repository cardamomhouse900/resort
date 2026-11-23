"use client";

import { AdminForm, SubmitButton } from "@/components/admin/form";
import { setInquiryStatusAction } from "./actions";

const LABELS = { NEW: "Mark as new", REPLIED: "Mark as replied", ARCHIVED: "Archive" } as const;

export function InquiryStatusButtons({ id, status }: { id: string; status: "NEW" | "REPLIED" | "ARCHIVED" }) {
  const next = (Object.keys(LABELS) as (keyof typeof LABELS)[]).filter((s) => s !== status);
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {next.map((s) => (
        <AdminForm key={s} action={setInquiryStatusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={s} />
          <SubmitButton variant="secondary" pendingText="…">
            {LABELS[s]}
          </SubmitButton>
        </AdminForm>
      ))}
    </div>
  );
}
