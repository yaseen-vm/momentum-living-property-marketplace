import type { CompanyContent } from "@momentum/shared";

export const BRAND = {
  name: "Momentum Living",
  domain: "LabourCamps.com",
  tagline: "Labour accommodation and real-estate solutions.",
} as const;

/** Global navigation (spec §3). AVAILABILITY is rendered separately as the prominent CTA. */
export const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/managing-director", label: "Managing Director" },
  { to: "/agents", label: "Our Agents" },
  { to: "/why-choose-us", label: "Why Choose Us" },
  { to: "/contact", label: "Contact" },
] as const;

export const LEGAL_ITEMS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
] as const;

export const AVAILABILITY_PATH = "/availability";

/**
 * Placeholder company details (spec §30: never invent contact data).
 * Replaced by `GET /content/company` once the `site_content` CMS lands (Stage 2).
 */
export const COMPANY_PLACEHOLDER: CompanyContent = {
  phone: "[COMPANY PHONE]",
  whatsapp: "[WHATSAPP NUMBER]",
  email: "[COMPANY EMAIL]",
  general_email: "[EMAIL]",
  sales_email: "[SALES EMAIL]",
  management_email: "[MANAGEMENT EMAIL]",
  address: "[OFFICE ADDRESS]",
  working_hours: "[WORKING HOURS]",
  socials: { linkedin: "", instagram: "", other: [] },
};

/** True for unfilled CMS values such as `[COMPANY PHONE]`: render as text, never as a link. */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /^\[.*\]$/.test(value.trim());
}
