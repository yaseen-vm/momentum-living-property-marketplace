import { z } from "zod";

// Availability journey (spec §12–17): user types, enquiry details, requirements and
// matched opportunities. The Zod schemas are the single source of validation for the
// wizard forms (apps/web) and the `/availability/*` handlers (apps/api).

// ─── Domain literals ────────────────────────────────────────────────────────

export const USER_TYPES = ["tenant", "landlord", "management_company", "buyer", "seller"] as const;
export type UserType = (typeof USER_TYPES)[number];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  tenant: "Tenant",
  landlord: "Landlord",
  management_company: "Management Company",
  buyer: "Buyer",
  seller: "Seller",
};

/** Which Step 2 form a user type may use. Tenants and buyers choose individual or company. */
export const CONTACT_KINDS_BY_USER_TYPE = {
  tenant: ["individual", "company"],
  buyer: ["individual", "company"],
  management_company: ["company"],
  landlord: ["landlord"],
  seller: ["landlord"],
} as const satisfies Record<UserType, readonly ContactKind[]>;

export type ContactKind = "individual" | "company" | "landlord";

export type EnquiryStage = "verified" | "completed";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "matching",
  "viewing_requested",
  "negotiation",
  "closed",
  "not_proceeding",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const OPPORTUNITY_KINDS = [
  "accommodation_lease",
  "accommodation_sale",
  "tenant_demand",
  "management",
  "investor_demand",
] as const;
export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number];

/** What each user type is shown in Step 4 (data-model.md, "Matching kinds by user type"). */
export const OPPORTUNITY_KINDS_BY_USER_TYPE: Record<UserType, readonly OpportunityKind[]> = {
  tenant: ["accommodation_lease"],
  buyer: ["accommodation_sale"],
  landlord: ["tenant_demand", "management"],
  management_company: ["accommodation_lease", "management"],
  seller: ["investor_demand"],
};

export const PROPERTY_TYPES = ["labour_camp", "warehouse", "land"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  labour_camp: "Labour camp / accommodation",
  warehouse: "Warehouse",
  land: "Land / plot",
};

export const OWNERSHIP_STATUSES = ["owner", "representative", "agent", "other"] as const;
export const OWNERSHIP_STATUS_LABELS: Record<(typeof OWNERSHIP_STATUSES)[number], string> = {
  owner: "Owner",
  representative: "Authorised representative",
  agent: "Agent",
  other: "Other",
};

// ─── Locations ──────────────────────────────────────────────────────────────
// Canonical area catalogue. `listings.location_slug` must be one of these slugs for a
// listing to match a location filter; admin property forms pick from the same list.

export const EMIRATES = [
  { slug: "dubai", label: "Dubai" },
  { slug: "abu-dhabi", label: "Abu Dhabi" },
  { slug: "sharjah", label: "Sharjah" },
  { slug: "ajman", label: "Ajman" },
  { slug: "umm-al-quwain", label: "Umm Al Quwain" },
  { slug: "ras-al-khaimah", label: "Ras Al Khaimah" },
  { slug: "fujairah", label: "Fujairah" },
] as const;
export type EmirateSlug = (typeof EMIRATES)[number]["slug"];

export interface LocationArea {
  slug: string;
  emirate: EmirateSlug;
  label: string;
}

function areas(emirate: EmirateSlug, labels: string[]): LocationArea[] {
  return labels.map((label) => ({ emirate, label, slug: `${emirate}-${slugify(label)}` }));
}

export const LOCATIONS: readonly LocationArea[] = [
  ...areas("dubai", [
    "Jebel Ali",
    "Al Quoz",
    "Dubai Investments Park",
    "Al Qusais",
    "Muhaisnah",
    "Ras Al Khor",
    "Dubai Industrial City",
    "Al Awir",
    "Other area",
  ]),
  ...areas("abu-dhabi", ["Mussafah", "ICAD", "KIZAD", "Al Mafraq", "Other area"]),
  ...areas("sharjah", ["Industrial Area", "Al Sajaa", "Al Hamriyah", "Other area"]),
  ...areas("ajman", ["Industrial Area", "Al Jurf", "Other area"]),
  ...areas("umm-al-quwain", ["Industrial Area", "Other area"]),
  ...areas("ras-al-khaimah", ["Industrial Area", "Al Ghail", "Other area"]),
  ...areas("fujairah", ["Industrial Area", "Other area"]),
];

const LOCATION_SLUGS = new Set(LOCATIONS.map((l) => l.slug));
const EMIRATE_SLUGS = EMIRATES.map((e) => e.slug) as [EmirateSlug, ...EmirateSlug[]];

export function locationLabel(slug: string): string {
  const area = LOCATIONS.find((l) => l.slug === slug);
  if (!area) return slug;
  const emirate = EMIRATES.find((e) => e.slug === area.emirate)?.label ?? "";
  return `${area.label}, ${emirate}`;
}

/**
 * Area slugs a location answer covers: chosen areas, plus every area of an emirate
 * picked without specific areas. Empty means "anywhere".
 */
export function resolveLocationSlugs(emirates: readonly string[], locationSlugs: readonly string[]): string[] {
  const slugs = new Set(locationSlugs);
  for (const emirate of emirates) {
    const inEmirate = LOCATIONS.filter((l) => l.emirate === emirate);
    if (!inEmirate.some((l) => slugs.has(l.slug))) inEmirate.forEach((l) => slugs.add(l.slug));
  }
  return [...slugs];
}

// ─── Facilities ─────────────────────────────────────────────────────────────
// Stored as slugs; listing `amenities` labels are compared through the same slugify().

export const FACILITIES = [
  "AC",
  "Kitchen",
  "Canteen",
  "Laundry",
  "Wifi",
  "CCTV",
  "24/7 Security",
  "Prayer Room",
  "Gym",
  "Separate Toilets",
  "First Aid",
  "Parking",
].map((label) => ({ slug: slugify(label), label }));

const FACILITY_SLUGS = new Set(FACILITIES.map((f) => f.slug));

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Step 2: enquiry details ────────────────────────────────────────────────

const text = (max: number) => z.string().trim().max(max);
const requiredText = (label: string, max = 120) => text(max).min(1, `${label} is required`);
const optionalText = (max = 120) =>
  text(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const consent = z.literal(true, { errorMap: () => ({ message: "Please confirm you agree to be contacted" }) });

const website = optionalText(200).refine((v) => !v || /^https?:\/\/\S+\.\S+/i.test(v), {
  message: "Enter a full address starting with https://",
});

export const individualDetailsSchema = z.object({
  user_type: z.enum(["tenant", "buyer"]),
  contact_kind: z.literal("individual"),
  full_name: requiredText("Full name"),
  email,
  nationality: optionalText(60),
  company_name: optionalText(),
  position: optionalText(),
  consent,
});

export const companyDetailsSchema = z.object({
  user_type: z.enum(["tenant", "buyer", "management_company"]),
  contact_kind: z.literal("company"),
  company_name: requiredText("Company name"),
  full_name: requiredText("Contact person"),
  position: requiredText("Position"),
  email,
  company_website: website,
  business_type: requiredText("Business type"),
  consent,
});

export const landlordDetailsSchema = z.object({
  user_type: z.enum(["landlord", "seller"]),
  contact_kind: z.literal("landlord"),
  full_name: requiredText("Full name / contact person"),
  company_name: optionalText(),
  email,
  ownership_status: z.enum(OWNERSHIP_STATUSES, {
    errorMap: () => ({ message: "Select your ownership or representation status" }),
  }),
  consent,
});

/** `POST /availability/enquiries` body. The mobile is never sent: the API takes it from the verified user. */
export const enquiryDetailsSchema = z.discriminatedUnion("contact_kind", [
  individualDetailsSchema,
  companyDetailsSchema,
  landlordDetailsSchema,
]);
export type EnquiryDetails = z.infer<typeof enquiryDetailsSchema>;

/** Mobile entered in Step 2 for OTP. Spaces and dashes are removed before validation. */
export const mobileSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter your mobile with country code, e.g. +971501234567"));

// ─── Step 3: requirements ───────────────────────────────────────────────────

const numberMessages = { required_error: "This field is required", invalid_type_error: "Enter a number" };
const count = (max = 100_000) =>
  z.number(numberMessages).int("Enter a whole number").min(1, "Must be at least 1").max(max, `Must be at most ${max}`);
const money = z.number(numberMessages).min(0, "Cannot be negative").max(1_000_000_000);
const timestamp = z.number({ invalid_type_error: "Enter a valid date" }).int().min(0);

/** Required single choice with a readable message (radio buttons and selects). */
function choice<T extends string>(values: readonly [T, ...T[]]) {
  return z.enum(values, { errorMap: () => ({ message: "Please choose an option" }) });
}
const longText = optionalText(1000);

const locationFields = {
  emirates: z.array(z.enum(EMIRATE_SLUGS)).max(EMIRATE_SLUGS.length).default([]),
  location_slugs: z
    .array(z.string().refine((s) => LOCATION_SLUGS.has(s), "Unknown area"))
    .max(LOCATIONS.length)
    .default([]),
};

const facilities = z
  .array(z.string().refine((s) => FACILITY_SLUGS.has(s), "Unknown facility"))
  .max(FACILITIES.length)
  .default([]);

export const TIMELINES = ["immediate", "3_months", "6_months", "12_months", "flexible"] as const;
export const TIMELINE_LABELS: Record<(typeof TIMELINES)[number], string> = {
  immediate: "Immediately",
  "3_months": "Within 3 months",
  "6_months": "Within 6 months",
  "12_months": "Within 12 months",
  flexible: "Flexible",
};

function rangeCheck(min: number | undefined, max: number | undefined): boolean {
  return min === undefined || max === undefined || min <= max;
}

export const tenantRequirementsSchema = z
  .object({
    ...locationFields,
    preferred_area: optionalText(200),
    occupants: count(),
    rooms: count().optional(),
    beds: count().optional(),
    move_in_date: timestamp.optional(),
    contract_months: z.number().int().min(1).max(120).optional(),
    budget_min: money.optional(),
    budget_max: money.optional(),
    budget_period: z.enum(["year", "month"]).default("year"),
    property_type: z.enum(PROPERTY_TYPES).optional(),
    facilities,
    parking: z.enum(["none", "car", "bus", "car_and_bus"]).optional(),
    transport: z.enum(["required", "not_required"]).optional(),
    other: longText,
  })
  .refine((r) => rangeCheck(r.budget_min, r.budget_max), {
    message: "Minimum budget must not exceed maximum",
    path: ["budget_max"],
  });

export const landlordRequirementsSchema = z.object({
  ...locationFields,
  property_type: choice(PROPERTY_TYPES),
  capacity: count(),
  rooms: count().optional(),
  current_occupancy: z.number().int().min(0).max(100_000).optional(),
  availability_date: timestamp.optional(),
  asking_price: money.optional(),
  price_period: z.enum(["year", "month", "total"]).default("year"),
  preference: choice(["lease", "sale", "management"]),
  contract_preference: optionalText(200),
  property_condition: z.enum(["new", "good", "fair", "needs_renovation"]).optional(),
  facilities,
  other: longText,
});

export const managementCompanyRequirementsSchema = z.object({
  ...locationFields,
  company_name: optionalText(),
  managed_capacity: z.number().int().min(0).max(1_000_000).optional(),
  capacity_min: count().optional(),
  management_requirements: longText,
  operational_requirements: longText,
  contract_requirements: longText,
  other: longText,
});

export const buyerRequirementsSchema = z
  .object({
    ...locationFields,
    property_type: z.enum(PROPERTY_TYPES).optional(),
    capacity_min: count().optional(),
    capacity_max: count().optional(),
    budget_min: money.optional(),
    budget_max: money.optional(),
    timeline: z.enum(TIMELINES).optional(),
    other: longText,
  })
  .refine((r) => rangeCheck(r.capacity_min, r.capacity_max), {
    message: "Minimum capacity must not exceed maximum",
    path: ["capacity_max"],
  })
  .refine((r) => rangeCheck(r.budget_min, r.budget_max), {
    message: "Minimum budget must not exceed maximum",
    path: ["budget_max"],
  });

export const sellerRequirementsSchema = z.object({
  ...locationFields,
  property_type: choice(PROPERTY_TYPES),
  capacity: count().optional(),
  asking_price: money.optional(),
  timeline: z.enum(TIMELINES).optional(),
  facilities,
  other: longText,
});

/** Step 3 schema per user type. Unknown keys are stripped. */
export const REQUIREMENTS_SCHEMAS = {
  tenant: tenantRequirementsSchema,
  landlord: landlordRequirementsSchema,
  management_company: managementCompanyRequirementsSchema,
  buyer: buyerRequirementsSchema,
  seller: sellerRequirementsSchema,
} as const satisfies Record<UserType, z.ZodTypeAny>;

export type TenantRequirements = z.infer<typeof tenantRequirementsSchema>;
export type LandlordRequirements = z.infer<typeof landlordRequirementsSchema>;
export type ManagementCompanyRequirements = z.infer<typeof managementCompanyRequirementsSchema>;
export type BuyerRequirements = z.infer<typeof buyerRequirementsSchema>;
export type SellerRequirements = z.infer<typeof sellerRequirementsSchema>;

/** Requirements tagged with their user type, as the matching engine consumes them. */
export type TypedRequirements =
  | { user_type: "tenant"; requirements: TenantRequirements }
  | { user_type: "landlord"; requirements: LandlordRequirements }
  | { user_type: "management_company"; requirements: ManagementCompanyRequirements }
  | { user_type: "buyer"; requirements: BuyerRequirements }
  | { user_type: "seller"; requirements: SellerRequirements };

/** Current `enquiries.requirements` JSON version. */
export const REQUIREMENTS_SCHEMA_VERSION = 1;

// ─── API shapes ─────────────────────────────────────────────────────────────

export interface CreateEnquiryResponse {
  enquiry_id: string;
  reference_no: string;
  stage: EnquiryStage;
}

export interface EnquirySummary {
  id: string;
  reference_no: string;
  user_type: UserType;
  stage: EnquiryStage;
  created_at: number;
}

export interface EnquiriesResponse {
  enquiries: EnquirySummary[];
}

export interface EnquiryDetail extends EnquirySummary {
  contact_kind: ContactKind;
  full_name: string;
  company_name: string | null;
  position: string | null;
  email: string;
  mobile: string;
  nationality: string | null;
  company_website: string | null;
  business_type: string | null;
  ownership_status: string | null;
  requirements: Record<string, unknown> | null;
  match_count: number;
  completed_at: number | null;
}

export interface CompleteEnquiryResponse {
  enquiry_id: string;
  stage: "completed";
  match_count: number;
}

export interface OpportunityAgent {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

/** An opportunity card (spec §18). Never carries owner identity or exact coordinates. */
export interface MatchedOpportunity {
  id: string;
  reference_no: string | null;
  opportunity_kind: OpportunityKind;
  title: string;
  type: PropertyType;
  location_text: string;
  total_capacity: number | null;
  num_rooms: number | null;
  persons_per_room: number | null;
  amenities: string[];
  availability_date: number | null;
  /** `null` when the listing hides its price ("price on request"). */
  price: number | null;
  price_period: "year" | "month" | "total" | null;
  currency: string;
  show_price: boolean;
  summary: string | null;
  cover_photo_url: string | null;
  score: number;
  agent: OpportunityAgent | null;
}

export interface MatchesResponse {
  enquiry: { id: string; reference_no: string; user_type: UserType };
  matches: MatchedOpportunity[];
}
