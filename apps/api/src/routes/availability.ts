import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { ZodError } from "zod";
import { DEFAULT_SITE_CONTENT, REQUIREMENTS_SCHEMAS, REQUIREMENTS_SCHEMA_VERSION, enquiryDetailsSchema } from "@momentum/shared";
import type {
  AvailabilityConfig,
  CompleteEnquiryResponse,
  CreateEnquiryResponse,
  EnquiriesResponse,
  EnquiryDetail,
  MatchedOpportunity,
  MatchesResponse,
  TypedRequirements,
  UserType,
} from "@momentum/shared";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { findMatches } from "../lib/matching";
import { runAgent } from "../lib/agentRuns";
import { notifyNewLead } from "../agents/leadNotification";

type Env = { Bindings: Bindings; Variables: Variables };

export const availabilityRoutes = new Hono<Env>();

const ENQUIRY_LIMIT_PER_HOUR = 5;

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
}

availabilityRoutes.get("/enquiries/:id/matches", async (c) => {
  const enquiry = await c.env.DB.prepare(
    "SELECT id, reference_no, user_type, stage FROM enquiries WHERE id = ? AND user_id = ?"
  )
    .bind(c.req.param("id"), c.get("jwtPayload").sub)
    .first<Pick<EnquiryRow, "id" | "reference_no" | "user_type" | "stage">>();
  if (!enquiry || enquiry.stage !== "completed") return c.json(notQualified, 403);

  // Card fields only: never owner details, internal notes or coordinates.
  // Listings withdrawn since matching (unpublished or marked unavailable) drop out.
  const rows = await c.env.DB.prepare(
    `SELECT lm.score, l.id, l.reference_no, l.opportunity_kind, l.title, l.type, l.location_text, l.total_capacity,
       l.num_rooms, l.persons_per_room, l.amenities, l.availability_date, l.price, l.price_period, l.currency,
       l.show_price, l.summary,
       (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS cover_key,
       a.id AS agent_id, a.name AS agent_name, a.whatsapp AS agent_whatsapp, a.phone AS agent_phone, a.email AS agent_email
     FROM lead_matches lm
     JOIN listings l ON l.id = lm.listing_id
     LEFT JOIN agents a ON a.id = l.assigned_agent_id AND a.is_active = 1
     WHERE lm.enquiry_id = ? AND l.status = 'approved' AND l.is_available = 1
     ORDER BY lm.score DESC`
  )
    .bind(enquiry.id)
    .all<MatchRow>();

  // TODO(stage 6): replace with HMAC-signed, 1-hour URLs once file serving is locked down.
  const origin = new URL(c.req.url).origin;

  const matches: MatchedOpportunity[] = rows.results.map((r) => ({
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
    cover_photo_url: r.cover_key ? `${origin}/upload/files/${r.cover_key}` : null,
    score: r.score,
    agent: r.agent_id
      ? { id: r.agent_id, name: r.agent_name ?? "", whatsapp: r.agent_whatsapp, phone: r.agent_phone, email: r.agent_email }
      : null,
  }));

  const body: MatchesResponse = {
    enquiry: { id: enquiry.id, reference_no: enquiry.reference_no, user_type: enquiry.user_type },
    matches,
  };
  return c.json(body);
});
