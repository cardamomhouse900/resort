import { formatStayDate, type ISODate } from "@/utils/dates";
import { formatPaise } from "@/utils/money";
import {
  button,
  details,
  esc,
  escMultiline,
  heading,
  layout,
  note,
  paragraph,
  textDetails,
  textFooter,
  type ResortInfo,
} from "./layout";

export type BookingEmailData = {
  id: string;
  code: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomType: string;
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  adults: number;
  children: number;
  specialRequests: string | null;
  totalPaise: number;
  advancePercent: number;
  advancePaise: number;
  balancePaise: number;
  paidPaise: number;
  paymentMethod: string | null;
  paymentId: string | null;
};

export type RenderedEmail = { subject: string; html: string; text: string; preheader: string };

const guests = (b: BookingEmailData) =>
  `${b.adults} adult${b.adults === 1 ? "" : "s"}${b.children ? `, ${b.children} child${b.children === 1 ? "" : "ren"}` : ""}`;
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

function stayRows(b: BookingEmailData, r: ResortInfo): [string, string, boolean?][] {
  return [
    ["Booking reference", b.code, true],
    ["Room", b.roomType],
    ["Check-in", `${formatStayDate(b.checkIn)}, from ${r.checkInTime}`],
    ["Check-out", `${formatStayDate(b.checkOut)}, by ${r.checkOutTime}`],
    ["Nights", String(b.nights)],
    ["Guests", guests(b)],
  ];
}

function finish(
  resort: ResortInfo,
  subject: string,
  preheader: string,
  body: string,
  text: string,
): RenderedEmail {
  // Subjects contain guest-supplied names: no line breaks, bounded length.
  const safeSubject = subject.replace(/[\r\n\t]+/g, " ").slice(0, 200);
  return {
    subject: safeSubject,
    preheader,
    html: layout(resort, preheader, body),
    text: `${text}${textFooter(resort)}`,
  };
}

/* ------------------------------------------------- Guest: booking confirmed */
export function bookingConfirmedGuest(b: BookingEmailData, resort: ResortInfo): RenderedEmail {
  const money: [string, string, boolean?][] = [
    ["Total for the stay", formatPaise(b.totalPaise)],
    [`Advance paid online (${b.advancePercent}%)`, formatPaise(b.paidPaise)],
    ["Balance payable at the resort", formatPaise(b.balancePaise), true],
  ];
  const rows = [...stayRows(b, resort), ...money];
  const subject = `Booking confirmed — ${b.code} · ${resort.name}`;
  const body =
    heading(`Your stay is confirmed, ${first(b.guestName)}`) +
    paragraph(
      `Thank you for booking with ${esc(resort.name)}. We have received your advance payment and your room is reserved. We look forward to welcoming you to the hills.`,
    ) +
    details(rows) +
    (b.specialRequests
      ? paragraph(`<strong>Your requests:</strong><br>${escMultiline(b.specialRequests)}`)
      : "") +
    paragraph(
      `Please bring a valid photo ID for every adult guest. To change your plans, reply to this email or call us on ${esc(resort.phone)}.`,
    ) +
    button(resort.url, "Visit our website") +
    note(`<strong>Cancellation policy:</strong> ${esc(resort.cancellationPolicy)}`) +
    note(
      `Payment receipt: ${formatPaise(b.paidPaise)}${b.paymentMethod ? ` via ${esc(b.paymentMethod)}` : ""}${b.paymentId ? ` · Razorpay ID ${esc(b.paymentId)}` : ""}.`,
    );
  const text =
    `Your stay is confirmed, ${first(b.guestName)}.\n\nThank you for booking with ${resort.name}. We have received your advance payment and your room is reserved.\n\n` +
    textDetails(rows) +
    (b.specialRequests ? `\n\nYour requests: ${b.specialRequests}` : "") +
    `\n\nPlease bring a valid photo ID for every adult guest. To change your plans, reply to this email or call ${resort.phone}.\n\nCancellation policy: ${resort.cancellationPolicy}`;
  return finish(
    resort,
    subject,
    `${formatStayDate(b.checkIn)} – ${formatStayDate(b.checkOut)} · ${b.roomType}`,
    body,
    text,
  );
}

/* ---------------------------------------- Admin: new booking + payment received */
export function bookingConfirmedAdmin(
  b: BookingEmailData,
  resort: ResortInfo,
  adminUrl: string,
): RenderedEmail {
  const rows: [string, string, boolean?][] = [
    ...stayRows(b, resort),
    ["Guest", b.guestName],
    ["Phone", b.guestPhone],
    ["Email", b.guestEmail],
    ["Total", formatPaise(b.totalPaise)],
    [
      "Advance received",
      `${formatPaise(b.paidPaise)}${b.paymentMethod ? ` (${b.paymentMethod})` : ""}`,
      true,
    ],
    ["Balance due on arrival", formatPaise(b.balancePaise)],
  ];
  const subject = `New booking ${b.code}: ${b.guestName}, ${formatStayDate(b.checkIn)} · ${formatPaise(b.paidPaise)} received`;
  const body =
    heading("New confirmed booking") +
    paragraph("An advance payment has been received and verified. The room is confirmed.") +
    details(rows) +
    (b.specialRequests
      ? paragraph(`<strong>Special requests:</strong><br>${escMultiline(b.specialRequests)}`)
      : "") +
    button(adminUrl, "Open in admin");
  const text =
    `New confirmed booking.\n\n${textDetails(rows)}` +
    (b.specialRequests ? `\n\nSpecial requests: ${b.specialRequests}` : "") +
    `\n\nOpen in admin: ${adminUrl}`;
  return finish(resort, subject, `${b.roomType} · ${guests(b)}`, body, text);
}

/* -------------------------------- Guest: paid too late, refunded automatically */
export function lateRefundGuest(b: BookingEmailData, resort: ResortInfo, refundPaise: number): RenderedEmail {
  const subject = `Refund issued for ${b.code} · ${resort.name}`;
  const body =
    heading(`We're sorry, ${first(b.guestName)}`) +
    paragraph(
      `Your payment for booking ${esc(b.code)} reached us after the reservation hold had expired, and the room had meanwhile been booked by another guest. We have refunded the full amount of <strong>${formatPaise(refundPaise)}</strong> to your original payment method. Banks usually take 5–7 working days to show it.`,
    ) +
    paragraph(
      `We would still love to host you — please search other dates or rooms, or call us on ${esc(resort.phone)} and we'll help you find a stay.`,
    ) +
    button(`${resort.url}/booking`, "Search availability");
  const text = `We're sorry, ${first(b.guestName)}.\n\nYour payment for booking ${b.code} arrived after the reservation hold expired and the room had been booked. We have refunded ${formatPaise(refundPaise)} to your original payment method (5–7 working days).\n\nSearch again: ${resort.url}/booking or call ${resort.phone}.`;
  return finish(resort, subject, "Your payment has been refunded in full.", body, text);
}

/* ---------------------------------------------- Guest: booking cancelled */
export function bookingCancelledGuest(
  b: BookingEmailData,
  resort: ResortInfo,
  refundPaise: number,
): RenderedEmail {
  const subject = `Booking cancelled — ${b.code} · ${resort.name}`;
  const refundLine =
    refundPaise > 0
      ? `A refund of <strong>${formatPaise(refundPaise)}</strong> has been issued to your original payment method; banks usually take 5–7 working days.`
      : b.paidPaise > 0
        ? "As per our cancellation policy, the advance is not refundable for this cancellation."
        : "No payment was taken for this booking.";
  const body =
    heading("Your booking has been cancelled") +
    paragraph(`Hello ${esc(first(b.guestName))}, your booking ${esc(b.code)} has been cancelled.`) +
    details(stayRows(b, resort)) +
    paragraph(refundLine) +
    paragraph(`If you didn't expect this, please reply to this email or call ${esc(resort.phone)}.`);
  const text =
    `Your booking ${b.code} has been cancelled.\n\n${textDetails(stayRows(b, resort))}\n\n` +
    refundLine.replace(/<[^>]+>/g, "") +
    `\n\nQuestions? Reply to this email or call ${resort.phone}.`;
  return finish(resort, subject, `Booking ${b.code} cancelled`, body, text);
}

/* ---------------------------------------------- Guest: refund issued */
export function refundIssuedGuest(
  b: BookingEmailData,
  resort: ResortInfo,
  refundPaise: number,
): RenderedEmail {
  const subject = `Refund of ${formatPaise(refundPaise)} for ${b.code} · ${resort.name}`;
  const body =
    heading("Your refund is on its way") +
    paragraph(
      `Hello ${esc(first(b.guestName))}, we have issued a refund of <strong>${formatPaise(refundPaise)}</strong> for booking ${esc(b.code)} to your original payment method. Banks usually take 5–7 working days to show it.`,
    ) +
    paragraph(`Questions? Reply to this email or call ${esc(resort.phone)}.`);
  const text = `We have issued a refund of ${formatPaise(refundPaise)} for booking ${b.code} to your original payment method (5–7 working days).\n\nQuestions? Reply to this email or call ${resort.phone}.`;
  return finish(resort, subject, `Refund of ${formatPaise(refundPaise)} issued`, body, text);
}

/* ---------------------------------------------- Admin: new enquiry */
export function inquiryAdmin(
  m: { name: string; email: string; phone: string | null; message: string },
  resort: ResortInfo,
  adminUrl: string,
): RenderedEmail {
  const rows: [string, string, boolean?][] = [
    ["Name", m.name],
    ["Email", m.email],
    ["Phone", m.phone ?? "—"],
  ];
  const subject = `New enquiry from ${m.name}`;
  const body =
    heading("New website enquiry") +
    details(rows) +
    paragraph(escMultiline(m.message)) +
    note("Reply to this email to answer the guest directly.") +
    button(adminUrl, "Open enquiries");
  const text = `New website enquiry\n\n${textDetails(rows)}\n\n${m.message}\n\nReply to this email to answer the guest directly.`;
  return finish(resort, subject, m.message.slice(0, 90), body, text);
}
