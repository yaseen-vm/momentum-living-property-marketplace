import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { ZodError } from "zod";
import {
  DEFAULT_SITE_CONTENT,
  REQUIREMENTS_SCHEMAS,
  REQUIREMENTS_SCHEMA_VERSION,
  enquiryDetailsSchema,
  leadRequestSchema,
} from "@momentum/shared";
import type {
  AvailabilityConfig,
  CompleteEnquiryResponse,
  CreateEnquiryResponse,
  CreateLeadRequestResponse,
  EnquiriesResponse,
  EnquiryDetail,
  LeadRequestKind,
  MatchedOpportunity,
  MatchesResponse,
  OpportunityDetail,
  OpportunityDetailResponse,
  TypedRequirements,
  UserType,
} from "@momentum/shared";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { findMatches } from "../lib/matching";
import { runAgent } from "../lib/agentRuns";
import { notifyLeadRequest, notifyNewLead } from "../agents/leadNotification";

type Env = { Bindings: Bindings; Variables: Variables };

export const availabilityRoutes = new Hono<Env>();

const ENQUIRY_LIMIT_PER_HOUR = 5;
const REQUEST_LIMIT_PER_HOUR = 10;

// Every route: an enquirer whose mobile was verified by OTP. Handlers scope by jwt.sub.
availabilityRoutes.use(
  "*",
  requireAuth(["customer"]),
  createMiddleware<Env>(async (c, next) => {
    if (!c.get("jwtPayload").mobile_verified) {
      return c.json({ error: { code: "FORBIDDEN", message: "Mobile number not verified" } }, 403);
    }
    await next();
  })
);

function validationError(error: ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: issue ? (field ? `${field}: ${issue.message}` : issue.message) : "Invalid request",
    },
  };
}

const notQualified = {
  error: { code: "NOT_QUALIFIED", message: "Complete your availability enquiry to see matched opportunities" },
};

async function readJson(req: { json: () => Promise<unknown> }): Promise<unknown> {
  return req.json().catch(() => null);
}

async function availabilityConfig(db: D1Database): Promise<AvailabilityConfig> {
  const row = await db
    .prepare("SELECT value FROM site_content WHERE key = 'availability_config'")
    .first<{ value: string }>();
  return { ...DEFAULT_SITE_CONTENT.availability_config, ...(row ? (JSON.parse(row.value) as object) : {}) };
}

interface EnquiryRow {
  id: string;
  reference_no: string;
  user_type: UserType;
  stage: "verified" | "completed";
  created_at: number;
}

/** The caller's own enquiry, only once it is completed; `null` means NOT_QUALIFIED. */
async function completedEnquiry(db: D1Database, enquiryId: string, userId: string) {
  const enquiry = await db
    .prepare("SELECT id, reference_no, user_type, stage FROM enquiries WHERE id = ? AND user_id = ?")
    .bind(enquiryId, userId)
    .first<Pick<EnquiryRow, "id" | "reference_no" | "user_type" | "stage">>();
  return enquiry?.stage === "completed" ? enquiry : null;
}

// TODO(stage 6): replace with HMAC-signed, 1-hour URLs once file serving is locked down.
function fileUrl(requestUrl: string, key: string): string {
  return `${new URL(requestUrl).origin}/upload/files/${key}`;
}

// ─── Step 1 + 2: create the enquiry after OTP verification ──────────────────

availabilityRoutes.post("/enquiries", async (c) => {
  const userId = c.get("jwtPayload").sub;

  const parsed = enquiryDetailsSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);
  const details = parsed.data;

  const config = await availabilityConfig(c.env.DB);
  if ((details.user_type === "buyer" && !config.enable_buyer) || (details.user_type === "seller" && !config.enable_seller)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "user_type: This option is not available" } }, 422);
  }
  if (details.contact_kind === "individual" && config.nationality_field === "required" && !details.nationality) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "nationality: Nationality is required" } }, 422);
  }

  const rateKey = `rl:enquiry:${userId}`;
  const sent = parseInt((await c.env.KV.get(rateKey)) ?? "0", 10);
  if (sent >= ENQUIRY_LIMIT_PER_HOUR) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many enquiries. Please try again later." } }, 429);
  }

  // The mobile always comes from the OTP-verified user, never from the request body.
  const user = await c.env.DB.prepare("SELECT mobile, name FROM users WHERE id = ? AND mobile_verified_at IS NOT NULL")
    .bind(userId)
    .first<{ mobile: string; name: string }>();
  if (!user) return c.json({ error: { code: "FORBIDDEN", message: "Mobile number not verified" } }, 403);

  const now = Date.now();
  const id = crypto.randomUUID();
  const get = (key: string): string | null => {
    const value = (details as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  };

  // Sequential reference (LD-YYYY-000123): MAX() is served by the reference_no unique index,
  // and D1 serialises writes, so the subquery and insert are atomic.
  const created = await c.env.DB.prepare(
    `INSERT INTO enquiries (id, reference_no, user_id, user_type, contact_kind, full_name, company_name, position,
       email, mobile, nationality, company_website, business_type, ownership_status, consent_at, created_at, updated_at)
     VALUES (?, printf('LD-%s-%06d', ?, COALESCE((SELECT CAST(substr(MAX(reference_no), 9) AS INTEGER) FROM enquiries), 0) + 1),
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING reference_no`
  )
    .bind(
      id,
      String(new Date(now).getUTCFullYear()),
      userId,
      details.user_type,
      details.contact_kind,
      details.full_name,
      get("company_name"),
      get("position"),
      details.email,
      user.mobile,
      get("nationality"),
      get("company_website"),
      get("business_type"),
      get("ownership_status"),
      now,
      now,
      now
    )
    .first<{ reference_no: string }>();

  await c.env.KV.put(rateKey, String(sent + 1), { expirationTtl: 3600 });
  if (!user.name) {
    await c.env.DB.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").bind(details.full_name, now, userId).run();
  }

  const body: CreateEnquiryResponse = { enquiry_id: id, reference_no: created!.reference_no, stage: "verified" };
  return c.json(body, 201);
});

// ─── Resume: the caller's own enquiries ─────────────────────────────────────

availabilityRoutes.get("/enquiries", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, reference_no, user_type, stage, created_at FROM enquiries
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
  )
    .bind(c.get("jwtPayload").sub)
    .all<EnquiryRow>();

  const body: EnquiriesResponse = { enquiries: rows.results };
  return c.json(body);
});

availabilityRoutes.get("/enquiries/:id", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, reference_no, user_type, stage, created_at, contact_kind, full_name, company_name, position, email,
       mobile, nationality, company_website, business_type, ownership_status, requirements, match_count, completed_at
     FROM enquiries WHERE id = ? AND user_id = ?`
  )
    .bind(c.req.param("id"), c.get("jwtPayload").sub)
    .first<Omit<EnquiryDetail, "requirements"> & { requirements: string | null }>();
  if (!row) return c.json({ error: { code: "NOT_FOUND", message: "Enquiry not found" } }, 404);

  const body: EnquiryDetail = {
    ...row,
    requirements: row.requirements ? (JSON.parse(row.requirements) as Record<string, unknown>) : null,
  };
  return c.json(body);
});

// ─── Step 3: requirements → matching → lead ─────────────────────────────────

availabilityRoutes.put("/enquiries/:id/requirements", async (c) => {
  const userId = c.get("jwtPayload").sub;
  const enquiryId = c.req.param("id");

  const enquiry = await c.env.DB.prepare("SELECT id, user_type, stage FROM enquiries WHERE id = ? AND user_id = ?")
    .bind(enquiryId, userId)
    .first<Pick<EnquiryRow, "id" | "user_type" | "stage">>();
  if (!enquiry) return c.json({ error: { code: "NOT_FOUND", message: "Enquiry not found" } }, 404);

  const alreadyCompleted = {
    error: { code: "CONFLICT", message: "This enquiry is already complete. Start a new enquiry to change requirements." },
  };
  if (enquiry.stage === "completed") return c.json(alreadyCompleted, 409);

  const parsed = REQUIREMENTS_SCHEMAS[enquiry.user_type].safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const typed = { user_type: enquiry.user_type, requirements: parsed.data } as TypedRequirements;
  const matches = await findMatches(c.env.DB, typed);
  const now = Date.now();

  // One transaction. The stage guard plus the (enquiry_id, listing_id) unique index make a
  // concurrent second submission a no-op or a failed batch, never duplicate matches.
  const statements = [
    c.env.DB.prepare(
      `UPDATE enquiries SET requirements = ?, stage = 'completed', lead_status = 'new', match_count = ?,
         completed_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND stage = 'verified'`
    ).bind(
      JSON.stringify({ schema_version: REQUIREMENTS_SCHEMA_VERSION, ...parsed.data }),
      matches.length,
      now,
      now,
      enquiryId,
      userId
    ),
    ...matches.map((m) =>
      c.env.DB.prepare(
        "INSERT INTO lead_matches (id, enquiry_id, listing_id, score, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), enquiryId, m.listing_id, m.score, now)
    ),
  ];

  try {
    const [update] = await c.env.DB.batch(statements);
    if (!update?.meta.changes) return c.json(alreadyCompleted, 409);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) return c.json(alreadyCompleted, 409);
    throw err;
  }

  c.executionCtx.waitUntil(
    runAgent(
      c.env.DB,
      { agentType: "notification", userId, input: { event: "new_lead", enquiry_id: enquiryId } },
      () => notifyNewLead(enquiryId, c.env)
    )
  );

  const body: CompleteEnquiryResponse = { enquiry_id: enquiryId, stage: "completed", match_count: matches.length };
  return c.json(body);
});

// ─── Step 4: matched opportunities (owned + completed only) ─────────────────

interface MatchRow {
  score: number;
  id: string;
  reference_no: string | null;
  opportunity_kind: MatchedOpportunity["opportunity_kind"];
  title: string;
  type: MatchedOpportunity["type"];
  location_text: string;
  total_capacity: number | null;
  num_rooms: number | null;
  persons_per_room: number | null;
  amenities: string | null;
  availability_date: number | null;
  price: number | null;
  price_period: MatchedOpportunity["price_period"];
  currency: string;
  show_price: number;
  summary: string | null;
  cover_key: string | null;
  agent_id: string | null;
  agent_name: string | null;
  agent_whatsapp: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  request_kinds: string | null;
}

// Card fields only: never owner details, internal notes or coordinates.
const CARD_COLUMNS = `l.id, l.reference_no, l.opportunity_kind, l.title, l.type, l.location_text, l.total_capacity,
  l.num_rooms, l.persons_per_room, l.amenities, l.availability_date, l.price, l.price_period, l.currency,
  l.show_price, l.summary,
  a.id AS agent_id, a.name AS agent_name, a.whatsapp AS agent_whatsapp, a.phone AS agent_phone, a.email AS agent_email,
  (SELECT group_concat(kind) FROM lead_requests
   WHERE enquiry_id = lm.enquiry_id AND listing_id = l.id) AS request_kinds`;

type CardRow = Omit<MatchRow, "score" | "cover_key">;

function toCard(r: CardRow): Omit<MatchedOpportunity, "cover_photo_url" | "score"> {
  return {
    id: r.id,
    reference_no: r.reference_no,
    opportunity_kind: r.opportunity_kind,
    title: r.title,
    type: r.type,
    location_text: r.location_text,
    total_capacity: r.total_capacity,
    num_rooms: r.num_rooms,
    persons_per_room: r.persons_per_room,
    amenities: r.amenities ? (JSON.parse(r.amenities) as string[]) : [],
    availability_date: r.availability_date,
    price: r.show_price ? r.price : null,
    price_period: r.show_price ? r.price_period : null,
    currency: r.currency,
    show_price: !!r.show_price,
    summary: r.summary,
    agent: r.agent_id
      ? { id: r.agent_id, name: r.agent_name ?? "", whatsapp: r.agent_whatsapp, phone: r.agent_phone, email: r.agent_email }
      : null,
    requests: r.request_kinds ? (r.request_kinds.split(",") as LeadRequestKind[]) : [],
  };
}

availabilityRoutes.get("/enquiries/:id/matches", async (c) => {
  const enquiry = await completedEnquiry(c.env.DB, c.req.param("id"), c.get("jwtPayload").sub);
  if (!enquiry) return c.json(notQualified, 403);

  // Listings withdrawn since matching (unpublished or marked unavailable) drop out.
  const rows = await c.env.DB.prepare(
    `SELECT lm.score, ${CARD_COLUMNS},
       (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS cover_key
     FROM lead_matches lm
     JOIN listings l ON l.id = lm.listing_id
     LEFT JOIN agents a ON a.id = l.assigned_agent_id AND a.is_active = 1
     WHERE lm.enquiry_id = ? AND l.status = 'approved' AND l.is_available = 1
     ORDER BY lm.score DESC`
  )
    .bind(enquiry.id)
    .all<MatchRow>();

  const matches: MatchedOpportunity[] = rows.results.map((r) => ({
    ...toCard(r),
    cover_photo_url: r.cover_key ? fileUrl(c.req.url, r.cover_key) : null,
    score: r.score,
  }));

  const body: MatchesResponse = {
    enquiry: { id: enquiry.id, reference_no: enquiry.reference_no, user_type: enquiry.user_type },
    matches,
  };
  return c.json(body);
});

// ─── Opportunity detail (in the caller's own matches only) ──────────────────

interface DetailRow extends CardRow {
  status: string;
  is_available: number;
  description: string | null;
  terms: string | null;
  size_sqft: number | null;
  room_size_sqft: number | null;
  mohre_certified: number;
  ejari_registered: number;
  num_loading_bays: number | null;
  year_built: number | null;
  freehold: number;
  security_deposit_pct: number | null;
  commission_pct: number | null;
  ejari_fee: number | null;
  admin_fee: number | null;
  show_map: number;
  latitude: number | null;
  longitude: number | null;
}

availabilityRoutes.get("/opportunities/:id", async (c) => {
  const enquiry = await completedEnquiry(c.env.DB, c.req.query("enquiry_id") ?? "", c.get("jwtPayload").sub);
  if (!enquiry) return c.json(notQualified, 403);

  // lead_matches is the access-control list: no match row, no detail.
  const row = await c.env.DB.prepare(
    `SELECT ${CARD_COLUMNS}, l.status, l.is_available, l.description, l.terms, l.size_sqft, l.room_size_sqft,
       l.mohre_certified, l.ejari_registered, l.num_loading_bays, l.year_built, l.freehold,
       l.security_deposit_pct, l.commission_pct, l.ejari_fee, l.admin_fee, l.show_map, l.latitude, l.longitude
     FROM lead_matches lm
     JOIN listings l ON l.id = lm.listing_id
     LEFT JOIN agents a ON a.id = l.assigned_agent_id AND a.is_active = 1
     WHERE lm.enquiry_id = ? AND lm.listing_id = ?`
  )
    .bind(enquiry.id, c.req.param("id"))
    .first<DetailRow>();
  if (!row) return c.json(notQualified, 403);
  if (row.status !== "approved" || !row.is_available) {
    return c.json({ error: { code: "NOT_FOUND", message: "This opportunity is no longer available" } }, 404);
  }

  const photos = await c.env.DB.prepare("SELECT id, r2_key FROM listing_photos WHERE listing_id = ? ORDER BY display_order")
    .bind(row.id)
    .all<{ id: string; r2_key: string }>();

  const opportunity: OpportunityDetail = {
    ...toCard(row),
    description: row.description,
    terms: row.terms,
    photos: photos.results.map((p) => ({ id: p.id, url: fileUrl(c.req.url, p.r2_key) })),
    size_sqft: row.size_sqft,
    room_size_sqft: row.room_size_sqft,
    mohre_certified: !!row.mohre_certified,
    ejari_registered: !!row.ejari_registered,
    num_loading_bays: row.num_loading_bays,
    year_built: row.year_built,
    freehold: !!row.freehold,
    security_deposit_pct: row.security_deposit_pct,
    commission_pct: row.commission_pct,
    ejari_fee: row.ejari_fee,
    admin_fee: row.admin_fee,
    latitude: row.show_map ? row.latitude : null,
    longitude: row.show_map ? row.longitude : null,
  };

  const body: OpportunityDetailResponse = {
    enquiry: { id: enquiry.id, reference_no: enquiry.reference_no, user_type: enquiry.user_type },
    opportunity,
  };
  return c.json(body);
});

// ─── Request information / viewing ──────────────────────────────────────────

/** Early statuses a viewing request moves forward; later ones are left to the admin. */
const VIEWING_BUMP_FROM = ["new", "contacted", "qualified", "matching"] as const;

availabilityRoutes.post("/enquiries/:id/requests", async (c) => {
  const userId = c.get("jwtPayload").sub;

  const parsed = leadRequestSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);
  const request = parsed.data;

  const enquiry = await completedEnquiry(c.env.DB, c.req.param("id"), userId);
  if (!enquiry) return c.json(notQualified, 403);

  const matched = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM lead_matches lm JOIN listings l ON l.id = lm.listing_id
     WHERE lm.enquiry_id = ? AND lm.listing_id = ? AND l.status = 'approved' AND l.is_available = 1`
  )
    .bind(enquiry.id, request.listing_id)
    .first();
  if (!matched) return c.json(notQualified, 403);

  const rateKey = `rl:request:${userId}`;
  const sent = parseInt((await c.env.KV.get(rateKey)) ?? "0", 10);
  if (sent >= REQUEST_LIMIT_PER_HOUR) {
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }, 429);
  }

  const now = Date.now();
  const requestId = crypto.randomUUID();
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO lead_requests (id, enquiry_id, listing_id, kind, message, preferred_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(requestId, enquiry.id, request.listing_id, request.kind, request.message ?? null, request.preferred_date ?? null, now),
  ];
  if (request.kind === "viewing") {
    statements.push(
      c.env.DB.prepare(
        `UPDATE enquiries SET lead_status = 'viewing_requested', updated_at = ?
         WHERE id = ? AND lead_status IN (${VIEWING_BUMP_FROM.map(() => "?").join(", ")})`
      ).bind(now, enquiry.id, ...VIEWING_BUMP_FROM)
    );
  }

  // The (enquiry_id, listing_id, kind) unique index turns a repeat request into a failed batch.
  try {
    await c.env.DB.batch(statements);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      return c.json(
        { error: { code: "CONFLICT", message: "You have already sent this request. An agent will be in touch." } },
        409
      );
    }
    throw err;
  }
  await c.env.KV.put(rateKey, String(sent + 1), { expirationTtl: 3600 });

  c.executionCtx.waitUntil(
    runAgent(
      c.env.DB,
      { agentType: "notification", userId, input: { event: "lead_request", enquiry_id: enquiry.id, request_id: requestId } },
      () => notifyLeadRequest(requestId, c.env)
    )
  );

  const body: CreateLeadRequestResponse = { request_id: requestId };
  return c.json(body, 201);
});
