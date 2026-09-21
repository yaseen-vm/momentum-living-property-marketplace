import { EMIRATES, PROPERTY_TYPE_LABELS, USER_TYPE_LABELS, locationLabel } from "@momentum/shared";
import type { PropertyType, UserType } from "@momentum/shared";
import type { Bindings } from "../types";
import { sendEmail } from "./notification";

interface LeadRow {
  id: string;
  reference_no: string;
  user_type: UserType;
  full_name: string;
  company_name: string | null;
  position: string | null;
  email: string;
  mobile: string;
  requirements: string | null;
  match_count: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function formatDate(ms: unknown): string | null {
  return typeof ms === "number" ? new Date(ms).toISOString().slice(0, 10) : null;
}

function formatAed(value: unknown): string | null {
  return typeof value === "number" ? `AED ${value.toLocaleString("en-US")}` : null;
}

/** One-line requirements digest for the admin email: location, capacity, budget, dates. */
export function summariseRequirements(raw: string | null): string {
  if (!raw) return "—";
  const r = JSON.parse(raw) as Record<string, unknown>;
  const parts: string[] = [];

  const areas = Array.isArray(r["location_slugs"]) ? (r["location_slugs"] as string[]) : [];
  const emirates = Array.isArray(r["emirates"]) ? (r["emirates"] as string[]) : [];
  const places = [
    ...areas.map(locationLabel),
    ...emirates
      .filter((e) => !areas.some((a) => a.startsWith(`${e}-`)))
      .map((e) => EMIRATES.find((x) => x.slug === e)?.label ?? e),
  ];
  parts.push(places.length ? places.join(", ") : "Any location");

  const type = r["property_type"] as PropertyType | undefined;
  if (type && PROPERTY_TYPE_LABELS[type]) parts.push(PROPERTY_TYPE_LABELS[type]);

  const capacity = r["occupants"] ?? r["capacity"] ?? r["capacity_min"];
  if (typeof capacity === "number") parts.push(`${capacity} persons`);

  const budget = formatAed(r["budget_max"]);
  if (budget) parts.push(`budget up to ${budget}${r["budget_period"] === "month" ? "/month" : ""}`);
  const asking = formatAed(r["asking_price"]);
  if (asking) parts.push(`asking ${asking}`);

  const moveIn = formatDate(r["move_in_date"]);
  if (moveIn) parts.push(`move-in ${moveIn}`);
  const available = formatDate(r["availability_date"]);
  if (available) parts.push(`available ${available}`);

  return parts.join(" · ");
}

/**
 * Lead Notification Agent, `new_lead` event (agent-spec.md §2): writes the admin
 * dashboard notification and emails ADMIN_EMAIL. Runs inside `runAgent` via waitUntil.
 */
export async function notifyNewLead(enquiryId: string, env: Bindings): Promise<Record<string, unknown>> {
  const lead = await env.DB.prepare(
    `SELECT id, reference_no, user_type, full_name, company_name, position, email, mobile, requirements, match_count
     FROM enquiries WHERE id = ?`
  )
    .bind(enquiryId)
    .first<LeadRow>();
  if (!lead) throw new Error(`Enquiry ${enquiryId} not found`);

  const matchRefs = await env.DB.prepare(
    `SELECT l.reference_no FROM lead_matches lm JOIN listings l ON l.id = lm.listing_id
     WHERE lm.enquiry_id = ? ORDER BY lm.score DESC`
  )
    .bind(enquiryId)
    .all<{ reference_no: string | null }>();
  const refs = matchRefs.results.map((m) => m.reference_no).filter((r): r is string => !!r);

  await env.DB.prepare("INSERT INTO admin_notifications (id, type, payload, created_at) VALUES (?, 'new_lead', ?, ?)")
    .bind(
      crypto.randomUUID(),
      JSON.stringify({ enquiry_id: lead.id, reference_no: lead.reference_no, user_type: lead.user_type }),
      Date.now()
    )
    .run();

  const typeLabel = USER_TYPE_LABELS[lead.user_type];
  const who = (lead.company_name ?? lead.full_name).replace(/\s+/g, " ");
  const contact = [lead.full_name, lead.position].filter(Boolean).join(", ");
  const rows: Array<[string, string]> = [
    ["Reference", lead.reference_no],
    ["Type", typeLabel],
    ["Contact", lead.company_name ? `${contact} — ${lead.company_name}` : contact],
    ["Mobile", `${lead.mobile} (verified)`],
    ["Email", lead.email],
    ["Summary", summariseRequirements(lead.requirements)],
    ["Matches", `${lead.match_count}${refs.length ? ` — ${refs.join(", ")}` : ""}`],
  ];

  const html = `<h2>New ${escapeHtml(typeLabel)} enquiry</h2>
<table cellpadding="4">${rows
    .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;

  await sendEmail(env.ADMIN_EMAIL, `New ${typeLabel} enquiry — ${lead.reference_no} — ${who}`, html, env);

  return { reference_no: lead.reference_no, match_count: lead.match_count };
}
