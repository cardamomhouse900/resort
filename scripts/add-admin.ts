/**
 * Grants admin-dashboard access to a Supabase Auth user.
 *
 *   npm run admin:add -- --email owner@example.com --name "Owner Name" --role OWNER --uid <user-uuid>
 *
 * 1. Create the user in Supabase → Authentication → Users → "Add user" (email + password).
 * 2. Copy the user's UID and pass it with --uid. (Alternatively set SUPABASE_SERVICE_ROLE_KEY
 *    locally and omit --uid; the script then looks the user up by email.)
 *
 * Re-running for the same user updates the name/role and re-activates the account.
 * Use --deactivate to revoke access.
 */
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "STAFF" },
    uid: { type: "string" },
    deactivate: { type: "boolean", default: false },
  },
});

async function findUserId(email: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Pass --uid <user id> (or set SUPABASE_SERVICE_ROLE_KEY to look the user up by email).");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 200) break;
  }
  throw new Error(
    `No Supabase Auth user with email ${email}. Create it in Supabase → Authentication → Users first.`,
  );
}

async function main() {
  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error("--email is required");
  const role = values.role?.toUpperCase();
  if (role !== "OWNER" && role !== "STAFF") throw new Error("--role must be OWNER or STAFF");
  if (values.uid && !/^[0-9a-f-]{36}$/i.test(values.uid))
    throw new Error("--uid must be the user's UUID from Supabase");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    if (values.deactivate) {
      const r = await db.admin.updateMany({ where: { email }, data: { isActive: false } });
      console.log(r.count ? `Access revoked for ${email}.` : `No admin with email ${email}.`);
      return;
    }
    const authUserId = values.uid ?? (await findUserId(email));
    const name = values.name?.trim() || email.split("@")[0];
    const admin = await db.admin.upsert({
      where: { authUserId },
      create: { authUserId, email, name, role, isActive: true },
      update: { email, name, role, isActive: true },
    });
    console.log(`${admin.name} <${admin.email}> can now sign in as ${admin.role}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
