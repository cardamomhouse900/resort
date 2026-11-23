/**
 * Minimal, dependency-free email building blocks. Email clients ignore most
 * CSS, so everything is inline styles and tables. Every dynamic value MUST go
 * through `esc()` — guest names, requests and messages are untrusted input.
 */

export type ResortInfo = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  url: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
};

const GREEN = "#244A35";
const CREAM = "#F7F5ED";
const BEIGE = "#E9E2D2";
const INK = "#1D2A22";
const MUTED = "#4F5B52";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes and keeps line breaks (for messages and special requests). */
export function escMultiline(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

export function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;line-height:1.25;color:${GREEN}">${esc(text)}</h1>`;
}

export function paragraph(html: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${INK}">${html}</p>`;
}

export function note(html: string) {
  return `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">${html}</p>`;
}

/** Two-column key/value table. Values are escaped here; pass plain strings. */
export function details(rows: [label: string, value: string, strong?: boolean][]) {
  const tr = rows
    .map(
      ([label, value, strong]) =>
        `<tr><td style="padding:8px 0;font-size:14px;color:${MUTED};vertical-align:top">${esc(label)}</td>` +
        `<td style="padding:8px 0;font-size:14px;color:${strong ? GREEN : INK};text-align:right;vertical-align:top;${strong ? "font-weight:bold" : ""}">${esc(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:${BEIGE};border-radius:12px;padding:12px 20px">${tr}</table>`;
}

export function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:${GREEN};color:${CREAM};text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;font-size:15px">${esc(label)}</a></p>`;
}

/** Wraps content in the branded shell: header with the resort name, footer with contact details. */
export function layout(resort: ResortInfo, preheader: string, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(resort.name)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${GREEN};padding:24px 32px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${CREAM}">${esc(resort.name)}</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="padding:20px 32px;background:${BEIGE};font-size:13px;line-height:1.6;color:${MUTED}">
${esc(resort.name)}<br>${esc(resort.address)}<br>
Phone ${esc(resort.phone)} · WhatsApp ${esc(resort.whatsapp)} · <a href="mailto:${esc(resort.email)}" style="color:${GREEN}">${esc(resort.email)}</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Plain-text alternative: label/value lines. */
export function textDetails(rows: [string, string, boolean?][]) {
  return rows.map(([l, v]) => `${l}: ${v}`).join("\n");
}

export function textFooter(resort: ResortInfo) {
  return `\n--\n${resort.name}\n${resort.address}\nPhone ${resort.phone} · WhatsApp ${resort.whatsapp} · ${resort.email}`;
}
