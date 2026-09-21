import { Hono } from "hono";
import {
  LEAD_STATUSES,
  REQUIREMENTS_SCHEMAS,
  USER_TYPES,
  leadNoteSchema,
  leadUpdateSchema,
} from "@momentum/shared";
import type {
  AdminLeadDetail,
  AdminLeadMatch,
  AdminLeadNote,
  AdminLeadRequest,
  AdminLeadSummary,
  AdminLeadsResponse,
  RematchResponse,
  TypedRequirements,
} from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { findMatches } from "../../lib/matching";
import { errorBody, likePattern, msParam, pageParams, readJson, validationError } from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminLeadRoutes = new Hono<Env>();

adminLeadRoutes.use("*", requireAuth(["admin"]));

const leadNotFound = errorBody("NOT_FOUND", "Lead not found");

type SummaryRow = Omit<AdminLeadSummary, "assigned_agent"> & { agent_id: string | null; agent_name: string | null };

const SUMMARY_COLUMNS = `e.id, e.reference_no, e.user_type, e.contact_kind, e.full_name, e.company_name, e.mobile,
  e.email, e.stage, e.lead_status, e.match_count, e.created_at, e.completed_at,
  a.id AS agent_id, a.name AS agent_name,
  (SELECT COUNT(*) FROM lead_requests r WHERE r.enquiry_id = e.id) AS request_count`;

function toSummary({ agent_id, agent_name, ...row }: SummaryRow): AdminLeadSummary {
  return { ...row, assigned_agent: agent_id ? { id: agent_id, name: agent_name ?? "" } : null };
}

// ─── List ───────────────────────────────────────────────────────────────────

adminLeadRoutes.get("/", async (c) => {
  const query = c.req.query();
  const { limit, offset } = pageParams(query);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Default view is completed leads; `stage=verified` shows journeys abandoned after OTP.
  const stage = query["stage"] ?? "completed";
  if (stage !== "all") {
    if (stage !== "completed" && stage !== "verified") {
      return c.json(errorBody("VALIDATION_ERROR", "stage: Unknown stage"), 422);
    }
    conditions.push("e.stage = ?");
    params.push(stage);
  }

  const userType = query["user_type"];
  if (userType) {
    if (!(USER_TYPES as readonly string[]).includes(userType)) {
      return c.json(errorBody("VALIDATION_ERROR", "user_type: Unknown user type"), 422);
    }
    conditions.push("e.user_type = ?");
    params.push(userType);
  }

  const status = query["lead_status"];
  if (status) {
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
      return c.json(errorBody("VALIDATION_ERROR", "lead_status: Unknown status"), 422);
    }
    conditions.push("e.lead_status = ?");
    params.push(status);
  }

  const agentId = query["assigned_agent_id"];
  if (agentId === "none") {
    conditions.push("e.assigned_agent_id IS NULL");
  } else if (agentId) {
    conditions.push("e.assigned_agent_id = ?");
    params.push(agentId);
  }

  const from = msParam(query["from"]);
  const to = msParam(query["to"]);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return c.json(errorBody("VALIDATION_ERROR", "from/to: Use Unix milliseconds"), 422);
  }
  if (from !== undefined) {
    conditions.push("e.created_at >= ?");
    params.push(from);
  }
  if (to !== undefined) {
    conditions.push("e.created_at <= ?");
    params.push(to);
  }

  // Free-text search is a scan, which is fine at admin volumes.
  const q = query["q"]?.trim();
  if (q) {
    conditions.push(
      `(e.reference_no LIKE ? ESCAPE '\\' OR e.full_name LIKE ? ESCAPE '\\' OR e.company_name LIKE ? ESCAPE '\\'
        OR e.mobile LIKE ? ESCAPE '\\' OR e.email LIKE ? ESCAPE '\\')`
    );
    const pattern = likePattern(q);
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [count, rows] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM enquiries e ${where}`).bind(...params),
    c.env.DB.prepare(
      `SELECT ${SUMMARY_COLUMNS}
       FROM enquiries e LEFT JOIN agents a ON a.id = e.assigned_agent_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset),
  ]);

  const body: AdminLeadsResponse = {
    leads: (rows!.results as SummaryRow[]).map(toSummary),
    total: (count!.results[0] as { total: number } | undefined)?.total ?? 0,
  };
  return c.json(body);
});

// ─── Detail ─────────────────────────────────────────────────────────────────

type DetailRow = SummaryRow &
  Omit<AdminLeadDetail, keyof AdminLeadSummary | "requirements" | "matches" | "requests" | "notes"> & {
    requirements: string | null;
  };

type MatchRow = Omit<AdminLeadMatch, "is_available"> & { is_available: number };

type RequestRow = Omit<AdminLeadRequest, "listing"> & {
  listing_id: string;
  listing_reference_no: string | null;
  listing_title: string;
};

async function loadLead(db: D1Database, id: string): Promise<AdminLeadDetail | null> {
  const [lead, matches, requests, notes] = await db.batch([
    db
      .prepare(
        `SELECT ${SUMMARY_COLUMNS}, e.position, e.nationality, e.company_website, e.business_type,
           e.ownership_status, e.requirements, e.consent_at, e.updated_at
         FROM enquiries e LEFT JOIN agents a ON a.id = e.assigned_agent_id
         WHERE e.id = ?`
      )
      .bind(id),
    db
      .prepare(
        `SELECT l.id AS listing_id, l.reference_no, l.title, l.opportunity_kind, l.type, l.location_text,
           l.status, l.is_available, lm.score
         FROM lead_matches lm JOIN listings l ON l.id = lm.listing_id
         WHERE lm.enquiry_id = ?
         ORDER BY lm.score DESC`
      )
      .bind(id),
    db
      .prepare(
        `SELECT r.id, r.kind, r.message, r.preferred_date, r.created_at,
           l.id AS listing_id, l.reference_no AS listing_reference_no, l.title AS listing_title
         FROM lead_requests r JOIN listings l ON l.id = r.listing_id
         WHERE r.enquiry_id = ?
         ORDER BY r.created_at DESC`
      )
      .bind(id),
    db
      .prepare(
        `SELECT n.id, n.body, n.status_change, n.created_at, NULLIF(u.name, '') AS author_name
         FROM lead_notes n LEFT JOIN users u ON u.id = n.author_id
         WHERE n.enquiry_id = ?
         ORDER BY n.created_at DESC`
      )
      .bind(id),
  ]);

  const row = lead!.results[0] as DetailRow | undefined;
  if (!row) return null;

  const { requirements, ...rest } = row;
  return {
    ...toSummary(rest),
    position: rest.position,
    nationality: rest.nationality,
    company_website: rest.company_website,
    business_type: rest.business_type,
    ownership_status: rest.ownership_status,
    consent_at: rest.consent_at,
    updated_at: rest.updated_at,
    requirements: requirements ? (JSON.parse(requirements) as Record<string, unknown>) : null,
    matches: (matches!.results as MatchRow[]).map((m) => ({ ...m, is_available: !!m.is_available })),
    requests: (requests!.results as RequestRow[]).map(({ listing_id, listing_reference_no, listing_title, ...r }) => ({
      ...r,
      listing: { id: listing_id, reference_no: listing_reference_no, title: listing_title },
    })),
    notes: notes!.results as AdminLeadNote[],
  };
}

adminLeadRoutes.get("/:id", async (c) => {
  const lead = await loadLead(c.env.DB, c.req.param("id"));
  if (!lead) return c.json(leadNotFound, 404);
  return c.json(lead);
});

// ─── Status, agent, notes ───────────────────────────────────────────────────

adminLeadRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = leadUpdateSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);
  const update = parsed.data;

  const current = await c.env.DB.prepare("SELECT lead_status, assigned_agent_id FROM enquiries WHERE id = ?")
    .bind(id)
    .first<{ lead_status: string; assigned_agent_id: string | null }>();
  if (!current) return c.json(leadNotFound, 404);

  // A new assignment must be an active agent; keeping an agent who was since deactivated is fine.
  const agentId = update.assigned_agent_id;
  if (agentId && agentId !== current.assigned_agent_id) {
    const agent = await c.env.DB.prepare("SELECT 1 AS ok FROM agents WHERE id = ? AND is_active = 1").bind(agentId).first();
    if (!agent) return c.json(errorBody("VALIDATION_ERROR", "assigned_agent_id: Choose an active agent"), 422);
  }

  const now = Date.now();
  const statusChanged = update.lead_status !== undefined && update.lead_status !== current.lead_status;
  const statements = [
    c.env.DB.prepare(
      `UPDATE enquiries SET lead_status = ?, assigned_agent_id = ?, updated_at = ? WHERE id = ?`
    ).bind(
      update.lead_status ?? current.lead_status,
      agentId === undefined ? current.assigned_agent_id : agentId,
      now,
      id
    ),
  ];
  if (statusChanged || update.note) {
    statements.push(
      c.env.DB.prepare(
        "INSERT INTO lead_notes (id, enquiry_id, author_id, body, status_change, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        crypto.randomUUID(),
        id,
        c.get("jwtPayload").sub,
        update.note ?? "",
        statusChanged ? `${current.lead_status}→${update.lead_status}` : null,
        now
      )
    );
  }
  await c.env.DB.batch(statements);

  return c.json(await loadLead(c.env.DB, id));
});

adminLeadRoutes.post("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const parsed = leadNoteSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const exists = await c.env.DB.prepare("SELECT 1 AS ok FROM enquiries WHERE id = ?").bind(id).first();
  if (!exists) return c.json(leadNotFound, 404);

  const noteId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO lead_notes (id, enquiry_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(noteId, id, c.get("jwtPayload").sub, parsed.data.body, Date.now())
    .run();

  return c.json({ note_id: noteId }, 201);
});

// ─── Rematch against current inventory ──────────────────────────────────────

adminLeadRoutes.post("/:id/rematch", async (c) => {
  const id = c.req.param("id");
  const enquiry = await c.env.DB.prepare("SELECT user_type, stage, requirements FROM enquiries WHERE id = ?")
    .bind(id)
    .first<{ user_type: TypedRequirements["user_type"]; stage: string; requirements: string | null }>();
  if (!enquiry) return c.json(leadNotFound, 404);
  if (enquiry.stage !== "completed" || !enquiry.requirements) {
    return c.json(errorBody("CONFLICT", "Only completed enquiries can be rematched"), 409);
  }

  // Stored requirements carry schema_version, which the per-type schema strips.
  const parsed = REQUIREMENTS_SCHEMAS[enquiry.user_type].safeParse(JSON.parse(enquiry.requirements));
  if (!parsed.success) {
    return c.json(errorBody("CONFLICT", "The stored requirements no longer validate; they cannot be rematched"), 409);
  }

  const matches = await findMatches(c.env.DB, {
    user_type: enquiry.user_type,
    requirements: parsed.data,
  } as TypedRequirements);
  const now = Date.now();

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM lead_matches WHERE enquiry_id = ?").bind(id),
    ...matches.map((m) =>
      c.env.DB.prepare(
        "INSERT INTO lead_matches (id, enquiry_id, listing_id, score, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), id, m.listing_id, m.score, now)
    ),
    c.env.DB.prepare("UPDATE enquiries SET match_count = ?, updated_at = ? WHERE id = ?").bind(matches.length, now, id),
    c.env.DB.prepare(
      "INSERT INTO lead_notes (id, enquiry_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      crypto.randomUUID(),
      id,
      c.get("jwtPayload").sub,
      `Matching re-run: ${matches.length} ${matches.length === 1 ? "opportunity" : "opportunities"}`,
      now
    ),
  ]);

  const body: RematchResponse = { match_count: matches.length };
  return c.json(body);
});
