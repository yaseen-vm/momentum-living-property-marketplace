import type { Bindings } from "../types";

interface BookingNotifyPayload {
  bookingId: string;
  customerName: string;
  customerMobile: string;
  listingTitle: string;
  listingType: string;
  locationText: string;
  vendorName: string;
  vendorMobile: string;
}

export async function notifyAdminNewBooking(
  payload: BookingNotifyPayload,
  env: Bindings
): Promise<void> {
  const html = `
<h2>New Booking Request</h2>
<p><strong>Booking ID:</strong> ${payload.bookingId}</p>
<h3>Customer</h3>
<p>Name: ${payload.customerName}<br>Mobile: ${payload.customerMobile}</p>
<h3>Listing</h3>
<p>${payload.listingTitle} (${payload.listingType})<br>${payload.locationText}</p>
<h3>Owner / Vendor</h3>
<p>Name: ${payload.vendorName}<br>Mobile: ${payload.vendorMobile}</p>
`;
  await sendEmail(env.ADMIN_EMAIL, "New Booking Request — Momentum Living", html, env);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  env: Bindings
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "noreply@momentum-living.com",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  }
}
