import "server-only";
import type { Db } from "@/lib/db";
import type { ContactRequest } from "@/lib/validation";

/** Stores a contact enquiry. The admin notification email is added in Phase 6. */
export async function createInquiry(db: Db, input: ContactRequest) {
  return db.contactInquiry.create({
    data: { name: input.name, email: input.email, phone: input.phone || null, message: input.message },
    select: { id: true },
  });
}
