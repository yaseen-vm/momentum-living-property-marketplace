import { EMIRATES, LEAD_REQUEST_KIND_LABELS, PROPERTY_TYPE_LABELS, USER_TYPE_LABELS, locationLabel } from "@momentum/shared";
import type { LeadRequestKind, PropertyType, UserType } from "@momentum/shared";
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

function detailsTable(rows: Array<[string, string]>): string {
  return `<table cellpadding="4">${rows
    .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
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
${detailsTable(rows)}`;
  await sendEmail(env.ADMIN_EMAIL, `New ${typeLabel} enquiry — ${lead.reference_no} — ${who}`, html, env);

  return { reference_no: lead.reference_no, match_count: lead.match_count };
}

interface RequestRow extends Omit<LeadRow, "requirements" | "match_count"> {
  request_id: string;
  kind: LeadRequestKind;
  message: string | null;
  preferred_date: number | null;
  listing_id: string;
  listing_reference_no: string | null;
  listing_title: string;
  listing_location: string;
}

/**
 * Lead Notification Agent, `lead_request` event (agent-spec.md §2): an enquirer asked for
 * information or a viewing. Writes the dashboard notification and emails ADMIN_EMAIL.
 */
export async function notifyLeadRequest(requestId: string, env: Bindings): Promise<Record<string, unknown>> {
  const req = await env.DB.prepare(
    `SELECT r.id AS request_id, r.kind, r.message, r.preferred_date,
       e.id, e.reference_no, e.user_type, e.full_name, e.company_name, e.position, e.email, e.mobile,
       l.id AS listing_id, l.reference_no AS listing_reference_no, l.title AS listing_title,
       l.location_text AS listing_location
     FROM lead_requests r
     JOIN enquiries e ON e.id = r.enquiry_id
     JOIN listings l ON l.id = r.listing_id
     WHERE r.id = ?`
  )
    .bind(requestId)
    .first<RequestRow>();
  if (!req) throw new Error(`Lead request ${requestId} not found`);

  await env.DB.prepare("INSERT INTO admin_notifications (id, type, payload, created_at) VALUES (?, 'lead_request', ?, ?)")
    .bind(
      crypto.randomUUID(),
      JSON.stringify({
        request_id: req.request_id,
        kind: req.kind,
        enquiry_id: req.id,
        reference_no: req.reference_no,
        listing_id: req.listing_id,
        listing_reference_no: req.listing_reference_no,
      }),
      Date.now()
    )
    .run();

  const kindLabel = LEAD_REQUEST_KIND_LABELS[req.kind];
  const listingRef = req.listing_reference_no ?? req.listing_title;
  const contact = [req.full_name, req.position].filter(Boolean).join(", ");
  const rows: Array<[string, string]> = [
    ["Lead", `${req.reference_no} (${USER_TYPE_LABELS[req.user_type]})`],
    ["Contact", req.company_name ? `${contact} — ${req.company_name}` : contact],
    ["Mobile", `${req.mobile} (verified)`],
    ["Email", req.email],
    ["Opportunity", `${req.listing_title}${req.listing_reference_no ? ` (${req.listing_reference_no})` : ""}`],
    ["Location", req.listing_location],
    ["Message", req.message ?? "—"],
  ];
  const preferred = formatDate(req.preferred_date);
  if (preferred) rows.push(["Preferred date", preferred]);

  const html = `<h2>${escapeHtml(kindLabel)} request</h2>\n${detailsTable(rows)}`;
  await sendEmail(env.ADMIN_EMAIL, `${kindLabel} request — ${listingRef} — lead ${req.reference_no}`, html, env);

  return { reference_no: req.reference_no, kind: req.kind, listing_id: req.listing_id };
}
