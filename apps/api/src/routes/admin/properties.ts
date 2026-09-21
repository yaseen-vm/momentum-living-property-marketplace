import { Hono } from "hono";
import {
  OPPORTUNITY_KINDS,
  PROPERTY_TYPES,
  REFERENCE_PREFIX,
  propertyAvailabilitySchema,
  propertySchema,
  propertyUpdateSchema,
} from "@momentum/shared";
import type {
  AdminPropertiesResponse,
  AdminPropertyDetail,
  AdminPropertySummary,
  CreatePropertyResponse,
  PropertyValues,
} from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { fileUrl } from "../../lib/files";
import {
  errorBody,
  isUniqueViolation,
  likePattern,
  pageParams,
  readJson,
  validationError,
} from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminPropertyRoutes = new Hono<Env>();

adminPropertyRoutes.use("*", requireAuth(["admin"]));

const propertyNotFound = errorBody("NOT_FOUND", "Property not found");
const duplicateReference = errorBody("CONFLICT", "reference_no: This reference is already in use");

type Column = Exclude<keyof PropertyValues, "photos">;

/** `listings` columns stored as 0/1. */
const BOOLEAN_COLUMNS = new Set<Column>([
  "is_available",
  "show_price",
  "show_map",
  "mohre_certified",
  "ejari_registered",
  "freehold",
]);

/** Every admin-writable column, in schema order. `status` and `reference_no` are handled separately. */
const WRITABLE_COLUMNS = (Object.keys(propertySchema.shape) as Array<keyof PropertyValues>).filter(
  (k): k is Column => k !== "photos" && k !== "status" && k !== "reference_no"
);

function toDb(column: Column, value: unknown): string | number | null {
  if (BOOLEAN_COLUMNS.has(column)) return value ? 1 : 0;
  if (column === "amenities") return JSON.stringify(value ?? []);
  return (value ?? null) as string | number | null;
}

/**
 * Next `ML-{prefix}-{seq:04}` reference, computed inside the INSERT so the read and write are
 * one statement (D1 serialises writes). The sequence is global across prefixes.
 */
const NEXT_REFERENCE_SQL = `printf('ML-%s-%04d', ?, COALESCE((SELECT MAX(CAST(substr(reference_no, 7) AS INTEGER))
  FROM listings WHERE reference_no GLOB 'ML-[A-Z][A-Z]-[0-9]*'), 0) + 1)`;

async function checkAgent(db: D1Database, agentId: string | null | undefined, current: string | null = null) {
  if (!agentId || agentId === current) return true;
  return !!(await db.prepare("SELECT 1 AS ok FROM agents WHERE id = ? AND is_active = 1").bind(agentId).first());
}
const inactiveAgent = errorBody("VALIDATION_ERROR", "assigned_agent_id: Choose an active agent");

function photoStatements(db: D1Database, listingId: string, photos: PropertyValues["photos"], now: number) {
  return [
    db.prepare("DELETE FROM listing_photos WHERE listing_id = ?").bind(listingId),
    ...photos.map((p, i) =>
      db
        .prepare(
          "INSERT INTO listing_photos (id, listing_id, r2_key, alt_text, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(crypto.randomUUID(), listingId, p.key, p.alt_text, i, now)
    ),
  ];
}

// ─── List ───────────────────────────────────────────────────────────────────

type SummaryRow = Omit<AdminPropertySummary, "is_available" | "show_price" | "assigned_agent" | "cover_photo_url"> & {
  is_available: number;
  show_price: number;
  agent_id: string | null;
  agent_name: string | null;
  cover_key: string | null;
};

adminPropertyRoutes.get("/", async (c) => {
  const query = c.req.query();
  const { limit, offset } = pageParams(query);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const enumFilter = (name: string, column: string, allowed: readonly string[]) => {
    const value = query[name];
    if (!value) return true;
    if (!allowed.includes(value)) return false;
    conditions.push(`${column} = ?`);
    params.push(value);
    return true;
  };
  if (
    !enumFilter("opportunity_kind", "l.opportunity_kind", OPPORTUNITY_KINDS) ||
    !enumFilter("type", "l.type", PROPERTY_TYPES)
  ) {
    return c.json(errorBody("VALIDATION_ERROR", "Unknown filter value"), 422);
  }

  // Archived rows are hidden unless asked for; `status=all` lists everything.
  const status = query["status"];
  if (!status) {
    conditions.push("l.status != 'archived'");
  } else if (status !== "all") {
    conditions.push("l.status = ?");
    params.push(status);
  }

  if (query["is_available"] === "true" || query["is_available"] === "false") {
    conditions.push("l.is_available = ?");
    params.push(query["is_available"] === "true" ? 1 : 0);
  }
  if (query["location"]) {
    conditions.push("l.location_slug = ?");
    params.push(query["location"]);
  }

  const q = query["q"]?.trim();
  if (q) {
    conditions.push(
      `(l.reference_no LIKE ? ESCAPE '\\' OR l.title LIKE ? ESCAPE '\\' OR l.location_text LIKE ? ESCAPE '\\'
        OR l.owner_name LIKE ? ESCAPE '\\')`
    );
    const pattern = likePattern(q);
    params.push(pattern, pattern, pattern, pattern);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [count, rows] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT COUNT(*) AS total FROM listings l ${where}`).bind(...params),
    c.env.DB.prepare(
      `SELECT l.id, l.reference_no, l.opportunity_kind, l.type, l.status, l.is_available, l.title, l.location_slug,
         l.location_text, l.total_capacity, l.price, l.price_period, l.currency, l.show_price, l.owner_name,
         l.created_at, l.updated_at, a.id AS agent_id, a.name AS agent_name,
         (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS cover_key,
         (SELECT COUNT(*) FROM lead_matches WHERE listing_id = l.id) AS match_count
       FROM listings l LEFT JOIN agents a ON a.id = l.assigned_agent_id
       ${where}
       ORDER BY l.updated_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset),
  ]);

  const body: AdminPropertiesResponse = {
    properties: (rows!.results as SummaryRow[]).map(({ agent_id, agent_name, cover_key, ...r }) => ({
      ...r,
      is_available: !!r.is_available,
      show_price: !!r.show_price,
      assigned_agent: agent_id ? { id: agent_id, name: agent_name ?? "" } : null,
      cover_photo_url: cover_key ? fileUrl(c.req.url, cover_key) : null,
    })),
    total: (count!.results[0] as { total: number } | undefined)?.total ?? 0,
  };
  return c.json(body);
});

// ─── Detail ─────────────────────────────────────────────────────────────────

async function loadProperty(db: D1Database, requestUrl: string, id: string): Promise<AdminPropertyDetail | null> {
  const [listing, photos] = await db.batch([
    db.prepare(
      `SELECT id, reference_no, status, vendor_id, published_at, archived_at, created_at, updated_at,
         ${WRITABLE_COLUMNS.join(", ")}
       FROM listings WHERE id = ?`
    ).bind(id),
    db.prepare("SELECT id, r2_key, alt_text FROM listing_photos WHERE listing_id = ? ORDER BY display_order").bind(id),
  ]);

  const row = listing!.results[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  for (const column of BOOLEAN_COLUMNS) row[column] = !!row[column];
  row["amenities"] = row["amenities"] ? (JSON.parse(row["amenities"] as string) as string[]) : [];
  return {
    ...(row as unknown as Omit<AdminPropertyDetail, "photos">),
    photos: (photos!.results as Array<{ id: string; r2_key: string; alt_text: string | null }>).map((p) => ({
      id: p.id,
      key: p.r2_key,
      url: fileUrl(requestUrl, p.r2_key),
      alt_text: p.alt_text,
    })),
  };
}

adminPropertyRoutes.get("/:id", async (c) => {
  const property = await loadProperty(c.env.DB, c.req.url, c.req.param("id"));
  if (!property) return c.json(propertyNotFound, 404);
  return c.json(property);
});

// ─── Create ─────────────────────────────────────────────────────────────────

adminPropertyRoutes.post("/", async (c) => {
  const parsed = propertySchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);
  const values = parsed.data;
  if (!(await checkAgent(c.env.DB, values.assigned_agent_id))) return c.json(inactiveAgent, 422);

  const id = crypto.randomUUID();
  const now = Date.now();
  const columns = ["id", "created_by", "status", "published_at", "archived_at", "created_at", "updated_at", ...WRITABLE_COLUMNS];
  const binds: (string | number | null)[] = [
    id,
    c.get("jwtPayload").sub,
    values.status,
    values.status === "approved" ? now : null,
    values.status === "archived" ? now : null,
    now,
    now,
    ...WRITABLE_COLUMNS.map((col) => toDb(col, values[col])),
  ];

  const reference = values.reference_no ? "?" : NEXT_REFERENCE_SQL;
  const referenceBind = values.reference_no ?? REFERENCE_PREFIX[values.type];

  try {
    const [inserted] = await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO listings (reference_no, ${columns.join(", ")})
         VALUES (${reference}, ${columns.map(() => "?").join(", ")})
         RETURNING reference_no`
      ).bind(referenceBind, ...binds),
      ...photoStatements(c.env.DB, id, values.photos, now),
    ]);
    const body: CreatePropertyResponse = {
      id,
      reference_no: (inserted!.results[0] as { reference_no: string }).reference_no,
    };
    return c.json(body, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json(duplicateReference, 409);
    throw err;
  }
});

// ─── Update ─────────────────────────────────────────────────────────────────

adminPropertyRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = propertyUpdateSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);
  const values = parsed.data;

  const current = await c.env.DB.prepare("SELECT status, published_at, assigned_agent_id FROM listings WHERE id = ?")
    .bind(id)
    .first<{ status: string; published_at: number | null; assigned_agent_id: string | null }>();
  if (!current) return c.json(propertyNotFound, 404);
  if (!(await checkAgent(c.env.DB, values.assigned_agent_id, current.assigned_agent_id))) {
    return c.json(inactiveAgent, 422);
  }

  const now = Date.now();
  const sets: string[] = ["updated_at = ?"];
  const binds: (string | number | null)[] = [now];
  for (const column of WRITABLE_COLUMNS) {
    if (values[column] === undefined) continue;
    sets.push(`${column} = ?`);
    binds.push(toDb(column, values[column]));
  }
  if (values.reference_no !== undefined) {
    sets.push("reference_no = ?");
    binds.push(values.reference_no);
  }
  if (values.status !== undefined && values.status !== current.status) {
    sets.push("status = ?", "archived_at = ?");
    binds.push(values.status, values.status === "archived" ? now : null);
    if (values.status === "approved" && current.published_at === null) {
      sets.push("published_at = ?");
      binds.push(now);
    }
  }

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE listings SET ${sets.join(", ")} WHERE id = ?`).bind(...binds, id),
      ...(values.photos ? photoStatements(c.env.DB, id, values.photos, now) : []),
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json(duplicateReference, 409);
    throw err;
  }

  return c.json(await loadProperty(c.env.DB, c.req.url, id));
});

// ─── Quick actions ──────────────────────────────────────────────────────────

adminPropertyRoutes.post("/:id/availability", async (c) => {
  const parsed = propertyAvailabilitySchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const result = await c.env.DB.prepare("UPDATE listings SET is_available = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.is_available ? 1 : 0, Date.now(), c.req.param("id"))
    .run();
  if (!result.meta.changes) return c.json(propertyNotFound, 404);
  return c.json({ id: c.req.param("id"), is_available: parsed.data.is_available });
});

// Soft delete: archived rows never match, and lead_matches history is kept.
adminPropertyRoutes.post("/:id/archive", async (c) => {
  const now = Date.now();
  const result = await c.env.DB.prepare(
    "UPDATE listings SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(now, now, c.req.param("id"))
    .run();
  if (!result.meta.changes) return c.json(propertyNotFound, 404);
  return c.json({ id: c.req.param("id"), status: "archived" });
});
