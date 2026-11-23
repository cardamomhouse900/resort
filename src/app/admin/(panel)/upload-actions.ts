"use server";

import { requireAdmin } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";

/** Signs a direct-to-Cloudinary upload. Admins only; the API secret never leaves the server. */
export async function signImageUpload() {
  await requireAdmin();
  return createUploadSignature();
}
