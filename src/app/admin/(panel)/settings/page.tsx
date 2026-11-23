import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSettingsForEdit } from "@/services/admin/content";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin({ role: "OWNER" });
  const s = await getSettingsForEdit(await getDb());
  return (
    <>
      <PageHeader
        title="Settings"
        description="Business details shown on the website, and the rules the booking system follows."
      />
      <Card>
        <SettingsForm
          values={{
            ...s,
            mapsUrl: s.mapsUrl ?? "",
            latitude: s.latitude?.toString() ?? "",
            longitude: s.longitude?.toString() ?? "",
            taxPercent: s.taxPercent.toFixed(2),
          }}
        />
      </Card>
    </>
  );
}
