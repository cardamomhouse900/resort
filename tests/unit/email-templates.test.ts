import { describe, expect, it } from "vitest";
import type { ResortInfo } from "@/emails/layout";
import {
  bookingCancelledGuest,
  bookingConfirmedAdmin,
  bookingConfirmedGuest,
  inquiryAdmin,
  lateRefundGuest,
  type BookingEmailData,
} from "@/emails/templates";

const resort: ResortInfo = {
  name: "Greenridge Mountain Resort",
  phone: "+91 00000 00000",
  whatsapp: "+91 00000 00000",
  email: "hello@example.com",
  address: "Sample address",
  url: "https://example.com",
  checkInTime: "13:00",
  checkOutTime: "11:00",
  cancellationPolicy: "Full refund 7 days before check-in.",
};

const booking: BookingEmailData = {
  id: "b1",
  code: "BK-ABC123",
  guestName: 'Asha <script>alert("x")</script> Rao',
  guestEmail: "asha@example.com",
  guestPhone: "+91 90000 90000",
  roomType: "Valley View Cottage",
  checkIn: "2027-01-10",
  checkOut: "2027-01-12",
  nights: 2,
  adults: 2,
  children: 1,
  specialRequests: "Ground floor please\n<img src=x onerror=alert(1)>",
  totalPaise: 1_000_000,
  advancePercent: 30,
  advancePaise: 300_000,
  balancePaise: 700_000,
  paidPaise: 300_000,
  paymentMethod: "upi",
  paymentId: "pay_123",
};

describe("email templates", () => {
  it("guest confirmation shows the stay, amounts and policy", () => {
    const e = bookingConfirmedGuest(booking, resort);
    expect(e.subject).toBe("Booking confirmed — BK-ABC123 · Greenridge Mountain Resort");
    for (const s of [
      "BK-ABC123",
      "Valley View Cottage",
      "₹10,000",
      "₹3,000",
      "₹7,000",
      "from 13:00",
      "by 11:00",
      "2 adults, 1 child",
      "Full refund 7 days",
    ]) {
      expect(e.html).toContain(s);
      expect(e.text).toContain(s);
    }
  });

  it("escapes everything the guest typed", () => {
    const guest = bookingConfirmedGuest(booking, resort);
    const admin = bookingConfirmedAdmin(booking, resort, "https://example.com/admin/bookings/b1");
    for (const e of [guest, admin]) {
      expect(e.html).not.toContain("<script>");
      expect(e.html).not.toContain("<img src=x");
      expect(e.html).toContain("&lt;img src=x onerror=alert(1)&gt;"); // special requests
    }
    expect(admin.html).toContain("Asha &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; Rao"); // full name
    expect(bookingConfirmedGuest({ ...booking, guestName: "<b>Bold</b>" }, resort).html).toContain(
      "&lt;b&gt;Bold&lt;/b&gt;",
    );
  });

  it("keeps subjects on one line", () => {
    const e = bookingConfirmedAdmin(
      { ...booking, guestName: "Evil\r\nBcc: victim@example.com" },
      resort,
      "https://x",
    );
    expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it("admin email includes contact details and an admin link", () => {
    const e = bookingConfirmedAdmin(booking, resort, "https://example.com/admin/bookings/b1");
    expect(e.subject).toContain("₹3,000 received");
    expect(e.html).toContain("+91 90000 90000");
    expect(e.html).toContain("https://example.com/admin/bookings/b1");
  });

  it("cancellation wording depends on the refund", () => {
    expect(bookingCancelledGuest(booking, resort, 300_000).text).toContain(
      "A refund of ₹3,000 has been issued",
    );
    expect(bookingCancelledGuest(booking, resort, 0).text).toContain("not refundable");
    expect(bookingCancelledGuest({ ...booking, paidPaise: 0 }, resort, 0).text).toContain(
      "No payment was taken",
    );
  });

  it("late-payment refund and enquiry emails", () => {
    expect(lateRefundGuest(booking, resort, 300_000).html).toContain("₹3,000");
    const q = inquiryAdmin(
      { name: "Ravi", email: "ravi@example.com", phone: null, message: "Is there parking?\n<b>hi</b>" },
      resort,
      "https://x/admin/inquiries",
    );
    expect(q.html).toContain("Is there parking?<br>&lt;b&gt;hi&lt;/b&gt;");
    expect(q.text).toContain("Phone: —");
  });
});
