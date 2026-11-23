import { enforceRateLimit, handle, json, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getMailer } from "@/lib/email";
import { contactSchema } from "@/lib/validation";
import { createInquiry } from "@/services/contact";
import { sendInquiryNotice } from "@/services/notifications";

/** POST /api/contact — stores an enquiry and notifies the resort by email (reply goes to the guest). */
export const POST = handle(async (req) => {
  await enforceRateLimit(req, "RL_CONTACT");
  const body = await readJson(req, contactSchema);

  // Honeypot filled in: almost certainly a bot. Pretend success, store nothing.
  if (body.company) return json({ ok: true }, 201);

  const db = await getDb();
  const { id } = await createInquiry(db, body);
  // Stored first, so a failed email never loses the message; it's also visible in the admin.
  await sendInquiryNotice(db, getMailer(), {
    id,
    name: body.name,
    email: body.email,
    phone: body.phone || null,
    message: body.message,
  });
  return json({ ok: true }, 201);
});
