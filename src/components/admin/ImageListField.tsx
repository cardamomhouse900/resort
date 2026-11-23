"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Link2, Trash2, Upload } from "lucide-react";
import { useFieldError } from "./form";

export type EditableImage = {
  src: string;
  alt: string;
  isPlaceholder: boolean;
  credit?: { name: string; url: string; source: "Unsplash" | "Resort" };
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
  signature: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Edits an ordered list of images (or a single image with `single`).
 * Serialises to a hidden input as JSON; the server validates every entry
 * (allowed hosts, alt text) before saving.
 */
export function ImageListField({
  name,
  label,
  initial,
  single = false,
  getUploadSignature,
}: {
  name: string;
  label: string;
  initial: EditableImage[];
  single?: boolean;
  /** Server Action returning a signed upload request; undefined when Cloudinary is not configured. */
  getUploadSignature?: () => Promise<UploadSignature>;
}) {
  const [images, setImages] = useState<EditableImage[]>(initial);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const error = useFieldError(name);

  const value = single ? (images[0] ? JSON.stringify(images[0]) : "") : JSON.stringify(images);
  const canAdd = !single || images.length === 0;

  const add = (src: string) =>
    setImages((list) => [...(single ? [] : list), { src, alt: "", isPlaceholder: false }]);
  const update = (i: number, patch: Partial<EditableImage>) =>
    setImages((list) => list.map((img, j) => (j === i ? { ...img, ...patch } : img)));
  const move = (i: number, dir: -1 | 1) =>
    setImages((list) => {
      const next = [...list];
      const j = i + dir;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function upload(file: File) {
    setProblem(null);
    if (!TYPES.includes(file.type)) return setProblem("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return setProblem("Images must be 10 MB or smaller.");
    if (!getUploadSignature) return;
    setBusy(true);
    try {
      const sig = await getUploadSignature();
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sig.apiKey);
      body.append("timestamp", String(sig.timestamp));
      body.append("folder", sig.folder);
      body.append("allowed_formats", sig.allowed_formats);
      body.append("signature", sig.signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { secure_url?: string; error?: { message: string } };
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "Upload failed.");
      add(data.secure_url);
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <fieldset>
      <legend className="text-forest text-sm font-semibold">{label}</legend>
      <input type="hidden" name={name} value={value} />

      {images.length > 0 && (
        <ul className="mt-2 space-y-3">
          {images.map((img, i) => (
            <li key={`${img.src}-${i}`} className="border-line flex gap-3 rounded-lg border bg-white p-3">
              <div className="bg-beige relative size-20 shrink-0 overflow-hidden rounded-md">
                <Image src={img.src} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={img.alt}
                  onChange={(e) => update(i, { alt: e.target.value })}
                  placeholder="Describe the photo (alt text), e.g. Valley View Cottage at sunrise"
                  aria-label={`Alt text for image ${i + 1}`}
                  className="border-line focus:border-forest block w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none"
                />
                <div className="text-ink-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={img.isPlaceholder}
                      onChange={(e) => update(i, { isPlaceholder: e.target.checked })}
                      className="accent-forest"
                    />
                    Placeholder (not a real photo of the resort)
                  </label>
                  {i === 0 && !single && <span className="text-forest font-semibold">Main photo</span>}
                  <span className="truncate">{hostOf(img.src)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {!single && (
                  <>
                    <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => move(i, 1)}
                      disabled={i === images.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </IconButton>
                  </>
                )}
                <IconButton
                  label="Remove image"
                  onClick={() => setImages((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {getUploadSignature ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={TYPES.join(",")}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="text-forest ring-forest/30 hover:bg-beige inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 disabled:opacity-60"
              >
                <Upload className="size-4" aria-hidden="true" /> {busy ? "Uploading…" : "Upload photo"}
              </button>
            </>
          ) : (
            <p className="text-ink-muted inline-flex items-center gap-2 text-xs">
              <ImagePlus className="size-4" aria-hidden="true" /> Uploads are enabled once Cloudinary keys are
              configured.
            </p>
          )}
          <div className="flex flex-1 gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or paste an image URL (Cloudinary)"
              aria-label="Image URL"
              className="border-line focus:border-forest min-h-10 min-w-0 flex-1 rounded-full border bg-white px-4 text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!hostOf(url)) return setProblem("That is not a valid URL.");
                setProblem(null);
                add(url.trim());
                setUrl("");
              }}
              className="text-forest ring-forest/30 hover:bg-beige inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1"
            >
              <Link2 className="size-4" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      )}
      {(problem || error) && <p className="text-earth mt-2 text-sm">{problem ?? error}</p>}
    </fieldset>
  );
}

function hostOf(src: string): string {
  try {
    return new URL(src).hostname;
  } catch {
    return "";
  }
}

function IconButton({
  label,
  children,
  ...rest
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="text-ink-muted hover:bg-beige hover:text-forest inline-flex size-8 items-center justify-center rounded-md disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}
