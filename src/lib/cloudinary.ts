import "server-only";

/**
 * Signed, direct-from-browser uploads to Cloudinary.
 *
 * The server signs a short-lived set of upload parameters (folder, allowed
 * formats, timestamp) with the API secret; the browser then uploads the file
 * straight to Cloudinary. The secret never leaves the server, files never pass
 * through our Worker, and Cloudinary rejects any upload whose parameters were
 * changed after signing.
 */

export const UPLOAD_FOLDER = "resort";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cloudinary signature: SHA-1 of the alphabetically sorted params + API secret. */
export async function signParams(
  params: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sha1Hex(toSign + apiSecret);
}

export async function createUploadSignature() {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: UPLOAD_FOLDER,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    ...params,
    signature: await signParams(params, process.env.CLOUDINARY_API_SECRET!),
  };
}
