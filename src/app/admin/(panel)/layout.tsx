import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { signOut } from "../auth-actions";

/** Every page below this layout requires a signed-in, active admin. */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const db = await getDb();
  const [settings, newInquiries] = await Promise.all([
    db.siteSetting.findUnique({ where: { id: 1 }, select: { shortName: true } }),
    db.contactInquiry.count({ where: { status: "NEW" } }),
  ]);

  return (
    <AdminShell
      admin={admin}
      resortName={settings?.shortName ?? "Resort"}
      newInquiries={newInquiries}
      signOut={signOut}
    >
      {children}
    </AdminShell>
  );
}
