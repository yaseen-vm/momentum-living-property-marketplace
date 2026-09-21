import { z } from "zod";
import { FEATURE_ICONS } from "./content";
import type { SiteContent, SiteContentKey } from "./content";
import { LEAD_STATUSES, OPPORTUNITY_KINDS, PROPERTY_TYPES, isLocationSlug } from "./availability";
import type {
  ContactKind,
  EnquiryStage,
  LeadRequestKind,
  LeadStatus,
  OpportunityKind,
  PropertyType,
  UserType,
} from "./availability";

// Admin dashboard (spec §20–21): request schemas for `/admin/*` handlers and the admin forms,
// plus response shapes. Unknown keys are stripped by every schema.

// ─── Field helpers ──────────────────────────────────────────────────────────

const text = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);
const requiredText = (label: string, max = 160) => text(max).min(1, `${label} is required`);
/** Optional text: empty or missing becomes `null`, so a PATCH can clear the column. */
const nullableText = (max: number) =>
  text(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const numberMessages = { invalid_type_error: "Enter a number" };
const nullableNumber = (min: number, max: number, int = false) => {
  const base = z.number(numberMessages).min(min, `Must be at least ${min}`).max(max, `Must be at most ${max}`);
  return (int ? base.int("Enter a whole number") : base)
    .nullable()
    .optional()
    .transform((v) => v ?? null);
};
const nullableId = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const e164 = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +971501234567"));
const nullableE164 = z
  .union([z.literal(""), e164])
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));
const nullableEmail = z
  .union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email address").max(254)])
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

/** R2 keys the admin may attach. Uploads return keys in exactly these shapes. */
const LISTING_PHOTO_KEY = /^listing-photos\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(jpg|png|webp)$/;
const PUBLIC_MEDIA_KEY = /^public-media\/[a-z-]+\/[A-Za-z0-9-]+\.(jpg|png|webp)$/;

export function isPublicMediaKey(key: string): boolean {
  return PUBLIC_MEDIA_KEY.test(key);
}

// ─── Leads ──────────────────────────────────────────────────────────────────

/** `PATCH /admin/leads/:id`. A status change or a note is logged to `lead_notes`. */
export const leadUpdateSchema = z
  .object({
    lead_status: z.enum(LEAD_STATUSES).optional(),
    /** `null` (or "") unassigns; omitted leaves the assignment unchanged. */
    assigned_agent_id: z
      .string()
      .trim()
      .max(64)
      .nullable()
      .optional()
      .transform((v) => (v === "" ? null : v)),
    note: text(2000).optional(),
  })
  .refine((u) => u.lead_status !== undefined || u.assigned_agent_id !== undefined || !!u.note, {
    message: "Nothing to update",
  });
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;

/** `POST /admin/leads/:id/notes`. */
export const leadNoteSchema = z.object({ body: requiredText("Note", 2000) });

export interface AdminAgentRef {
  id: string;
  name: string;
}

export interface AdminLeadSummary {
  id: string;
  reference_no: string;
  user_type: UserType;
  contact_kind: ContactKind;
  full_name: string;
  company_name: string | null;
  mobile: string;
  email: string;
  stage: EnquiryStage;
  lead_status: LeadStatus;
  assigned_agent: AdminAgentRef | null;
  match_count: number;
  request_count: number;
  created_at: number;
  completed_at: number | null;
}

export interface AdminLeadsResponse {
  leads: AdminLeadSummary[];
  total: number;
}

export interface AdminLeadMatch {
  listing_id: string;
  reference_no: string | null;
  title: string;
  opportunity_kind: OpportunityKind;
  type: PropertyType;
  location_text: string;
  status: string;
  is_available: boolean;
  score: number;
}

export interface AdminLeadRequest {
  id: string;
  kind: LeadRequestKind;
  message: string | null;
  preferred_date: number | null;
  created_at: number;
  listing: { id: string; reference_no: string | null; title: string };
}

export interface AdminLeadNote {
  id: string;
  body: string;
  /** `new→contacted` when the note recorded a status change. */
  status_change: string | null;
  author_name: string | null;
  created_at: number;
}

export interface AdminLeadDetail extends AdminLeadSummary {
  position: string | null;
  nationality: string | null;
  company_website: string | null;
  business_type: string | null;
  ownership_status: string | null;
  requirements: Record<string, unknown> | null;
  consent_at: number;
  updated_at: number;
  matches: AdminLeadMatch[];
  requests: AdminLeadRequest[];
  notes: AdminLeadNote[];
}

export interface RematchResponse {
  match_count: number;
}

// ─── Properties / opportunities ─────────────────────────────────────────────

/** Statuses the admin sets. Vendor-era rows may still carry `pending`, `rejected`, … */
export const PROPERTY_STATUSES = ["draft", "approved", "archived"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Published",
  archived: "Archived",
  pending: "Pending review",
  rejected: "Rejected",
  rented_sold: "Rented / sold",
  withdrawn: "Withdrawn",
};

export const PRICE_PERIODS = ["year", "month", "total"] as const;
export type PricePeriod = (typeof PRICE_PERIODS)[number];

export const PRICE_PERIOD_LABELS: Record<PricePeriod, string> = {
  year: "Per year",
  month: "Per month",
  total: "Total (sale)",
};

/** Reference prefix per property type: `ML-LC-0042`. */
export const REFERENCE_PREFIX: Record<PropertyType, string> = {
  labour_camp: "LC",
  warehouse: "WH",
  land: "LD",
};

export const propertyPhotoSchema = z.object({
  key: z.string().regex(LISTING_PHOTO_KEY, "Unknown photo"),
  alt_text: nullableText(200),
});

/**
 * `POST /admin/properties` body; `PATCH` takes any subset (`propertyUpdateSchema`).
 * Field names are `listings` columns, except `photos`, which replaces `listing_photos` in order.
 */
export const propertySchema = z.object({
  reference_no: z
    .string()
    .trim()
    .toUpperCase()
    .max(30)
    .regex(/^[A-Z0-9-]*$/, "Use letters, digits and dashes")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  opportunity_kind: z.enum(OPPORTUNITY_KINDS),
  type: z.enum(PROPERTY_TYPES),
  status: z.enum(PROPERTY_STATUSES).default("draft"),
  is_available: z.boolean().default(true),
  title: requiredText("Title"),
  summary: nullableText(300),
  description: nullableText(5000),
  terms: nullableText(3000),
  price: nullableNumber(0, 1_000_000_000),
  price_period: z.enum(PRICE_PERIODS).nullable().optional().transform((v) => v ?? null),
  currency: z.enum(["AED", "USD"]).default("AED"),
  show_price: z.boolean().default(true),
  location_slug: z.string().refine(isLocationSlug, "Choose an area from the list"),
  location_text: requiredText("General location"),
  latitude: nullableNumber(-90, 90),
  longitude: nullableNumber(-180, 180),
  show_map: z.boolean().default(false),
  availability_date: nullableNumber(0, 4_102_444_800_000, true),
  size_sqft: nullableNumber(0, 100_000_000, true),
  num_rooms: nullableNumber(0, 100_000, true),
  persons_per_room: nullableNumber(0, 100, true),
  room_size_sqft: nullableNumber(0, 100_000),
  total_capacity: nullableNumber(0, 1_000_000, true),
  mohre_certified: z.boolean().default(false),
  ejari_registered: z.boolean().default(false),
  num_loading_bays: nullableNumber(0, 1000, true),
  year_built: nullableNumber(1900, 2100, true),
  freehold: z.boolean().default(false),
  security_deposit_pct: nullableNumber(0, 100),
  commission_pct: nullableNumber(0, 100),
  ejari_fee: nullableNumber(0, 10_000_000),
  admin_fee: nullableNumber(0, 10_000_000),
  amenities: z.array(requiredText("Facility", 60)).max(40).default([]),
  assigned_agent_id: nullableId,
  owner_name: nullableText(160),
  owner_contact: nullableText(300),
  internal_notes: nullableText(5000),
  photos: z.array(propertyPhotoSchema).max(20, "At most 20 photos").default([]),
});

export const propertyUpdateSchema = propertySchema.partial();

export type PropertyInput = z.input<typeof propertySchema>;
export type PropertyValues = z.output<typeof propertySchema>;

export const propertyAvailabilitySchema = z.object({ is_available: z.boolean() });

export interface AdminPropertySummary {
  id: string;
  reference_no: string | null;
  opportunity_kind: OpportunityKind;
  type: PropertyType;
  status: string;
  is_available: boolean;
  title: string;
  location_slug: string;
  location_text: string;
  total_capacity: number | null;
  price: number | null;
  price_period: PricePeriod | null;
  currency: string;
  show_price: boolean;
  assigned_agent: AdminAgentRef | null;
  owner_name: string | null;
  cover_photo_url: string | null;
  match_count: number;
  created_at: number;
  updated_at: number;
}

export interface AdminPropertiesResponse {
  properties: AdminPropertySummary[];
  total: number;
}

export interface AdminPropertyPhoto {
  id: string;
  key: string;
  url: string;
  alt_text: string | null;
}

/** Full record for the edit form, including confidential owner fields. */
export interface AdminPropertyDetail extends Omit<PropertyValues, "photos" | "status"> {
  id: string;
  status: string;
  photos: AdminPropertyPhoto[];
  /** Set on vendor-era rows only. */
  vendor_id: string | null;
  published_at: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreatePropertyResponse {
  id: string;
  reference_no: string;
}

// ─── Agents ─────────────────────────────────────────────────────────────────

/** `POST /admin/agents`; `PATCH` takes any subset (`agentUpdateSchema`). */
export const agentSchema = z.object({
  name: requiredText("Name", 120),
  position: requiredText("Position", 120),
  specialization: nullableText(160),
  languages: z.array(requiredText("Language", 40)).max(12).default([]),
  phone: nullableE164,
  email: nullableEmail,
  whatsapp: nullableE164,
  photo_key: z
    .string()
    .regex(PUBLIC_MEDIA_KEY, "Upload the photo again")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  bio: nullableText(1000),
  display_order: z.number(numberMessages).int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const agentUpdateSchema = agentSchema.partial();

export type AgentInput = z.input<typeof agentSchema>;

export interface AdminAgent {
  id: string;
  name: string;
  position: string;
  specialization: string | null;
  languages: string[];
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_key: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  is_active: boolean;
  lead_count: number;
  property_count: number;
  created_at: number;
  updated_at: number;
}

export interface AdminAgentsResponse {
  agents: AdminAgent[];
}

// ─── Corporate content ──────────────────────────────────────────────────────

const titledText = z.object({ title: requiredText("Title", 120), text: requiredText("Text", 800) });
const socialUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/\S+\.\S+/i.test(v), "Enter a full address starting with https://");
const legal = z.object({ body_markdown: requiredText("Wording", 50_000), updated_on: text(40) });

/** `PUT /admin/content/:key` value, per key. Mirrors the `SiteContent` shapes in content.ts. */
export const SITE_CONTENT_SCHEMAS = {
  home: z.object({
    about_intro: requiredText("About text", 2000),
    audiences: z.array(requiredText("Audience", 80)).max(20),
  }),
  about: z.object({
    who_we_are: requiredText("Who we are", 3000),
    what_we_do: z.array(titledText).max(20),
    who_we_work_with: z.array(titledText).max(20),
    why_us: requiredText("Why Momentum Living", 3000),
    approach_steps: z.array(titledText).max(12),
  }),
  why_choose_us: z.object({
    intro: requiredText("Intro", 2000),
    features: z
      .array(
        z.object({
          title: requiredText("Title", 120),
          summary: requiredText("Summary", 200),
          text: requiredText("Text", 800),
          icon: z.enum(FEATURE_ICONS),
        })
      )
      .max(12),
  }),
  md_profile: z.object({
    name: requiredText("Name", 120),
    title: requiredText("Title", 160),
    photo_key: z.string().refine((v) => v === "" || isPublicMediaKey(v), "Upload the portrait again"),
    biography: requiredText("Biography", 5000),
    experience: requiredText("Experience", 5000),
    philosophy: requiredText("Leadership philosophy", 5000),
    vision: requiredText("Vision", 5000),
    commitment_clients: requiredText("Commitment to clients", 5000),
    commitment_standards: requiredText("Commitment to standards", 5000),
    market_vision: requiredText("Market vision", 5000),
  }),
  md_note: z.object({
    heading: requiredText("Heading", 200),
    body: requiredText("Message", 10_000),
    signature_name: requiredText("Signature", 120),
  }),
  company: z.object({
    phone: text(60),
    whatsapp: text(60),
    email: text(254),
    general_email: text(254),
    sales_email: text(254),
    management_email: text(254),
    address: text(300),
    working_hours: text(200),
    socials: z.object({
      linkedin: socialUrl,
      instagram: socialUrl,
      other: z.array(z.object({ label: requiredText("Label", 40), url: socialUrl })).max(8),
    }),
  }),
  legal_privacy: legal,
  legal_terms: legal,
  availability_config: z.object({
    enable_buyer: z.boolean(),
    enable_seller: z.boolean(),
    nationality_field: z.enum(["hidden", "optional", "required"]),
  }),
} satisfies { [K in SiteContentKey]: z.ZodType<SiteContent[K], z.ZodTypeDef, unknown> };

export interface AdminContentItem<K extends SiteContentKey = SiteContentKey> {
  value: SiteContent[K];
  updated_at: number | null;
}

export interface AdminContentResponse {
  items: { [K in SiteContentKey]: AdminContentItem<K> };
}

// ─── Reports, export, notifications ─────────────────────────────────────────

export interface AdminReportsResponse {
  leads: {
    total: number;
    by_status: Record<LeadStatus, number>;
    by_user_type: Record<UserType, number>;
  };
  requests: Record<LeadRequestKind, number>;
  properties: {
    /** Excludes archived. */
    total: number;
    /** Published and available: what the matching engine can return. */
    available: number;
    by_kind: Record<OpportunityKind, number>;
    by_status: Record<string, number>;
  };
  enquirers: { verified: number };
}

export const EXPORT_TYPES = ["leads", "enquirers"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

/** Notification types the admin UI links to a lead. */
export interface LeadNotificationPayload {
  enquiry_id: string;
  reference_no: string;
  user_type?: UserType;
  kind?: LeadRequestKind;
  listing_reference_no?: string | null;
}
