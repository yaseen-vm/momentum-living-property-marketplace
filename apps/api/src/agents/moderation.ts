import { sendEmail } from "./notification";
import type { Bindings } from "../types";

export async function notifyVendorApproved(
  vendorEmail: string,
  vendorName: string,
  env: Bindings
): Promise<void> {
  const html = `
<h2>Your vendor account has been approved!</h2>
<p>Hi ${vendorName},</p>
<p>Great news — your vendor profile on Momentum Living has been verified and approved.</p>
<p>You can now log in and start submitting property listings.</p>
`;
  await sendEmail(vendorEmail, "Account Approved — Momentum Living", html, env);
}

export async function notifyVendorRejected(
  vendorEmail: string,
  vendorName: string,
  reason: string,
  env: Bindings
): Promise<void> {
  const html = `
<h2>Vendor account review outcome</h2>
<p>Hi ${vendorName},</p>
<p>Unfortunately, your vendor profile could not be approved at this time.</p>
<p><strong>Reason:</strong> ${reason}</p>
<p>Please log in to update your profile and re-submit your documents.</p>
`;
  await sendEmail(vendorEmail, "Account Review — Momentum Living", html, env);
}

export async function notifyVendorListingApproved(
  vendorEmail: string,
  listingTitle: string,
  env: Bindings
): Promise<void> {
  const html = `
<h2>Your listing is now live!</h2>
<p>Your listing "<strong>${listingTitle}</strong>" has been approved and is now publicly visible on Momentum Living.</p>
`;
  await sendEmail(vendorEmail, "Listing Approved — Momentum Living", html, env);
}

export async function notifyVendorListingChangesRequested(
  vendorEmail: string,
  listingTitle: string,
  note: string,
  env: Bindings
): Promise<void> {
  const html = `
<h2>Changes requested for your listing</h2>
<p>Our team has reviewed your listing "<strong>${listingTitle}</strong>" and requires some changes before it can be approved.</p>
<p><strong>Admin notes:</strong> ${note}</p>
<p>Please log in to edit and re-submit your listing.</p>
`;
  await sendEmail(vendorEmail, "Listing Changes Requested — Momentum Living", html, env);
}

export async function notifyVendorListingRejected(
  vendorEmail: string,
  listingTitle: string,
  reason: string,
  env: Bindings
): Promise<void> {
  const html = `
<h2>Listing rejected</h2>
<p>Your listing "<strong>${listingTitle}</strong>" has been rejected.</p>
<p><strong>Reason:</strong> ${reason}</p>
`;
  await sendEmail(vendorEmail, "Listing Rejected — Momentum Living", html, env);
}
