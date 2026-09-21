import { Hono } from "hono";
import { LEAD_REQUEST_KINDS, LEAD_STATUSES, OPPORTUNITY_KINDS, USER_TYPES } from "@momentum/shared";
import type { AdminReportsResponse } from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { errorBody, msParam } from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminReportRoutes = new Hono<Env>();

adminReportRoutes.use("*", requireAuth(["admin"]));

type CountRow = { k: string; cnt: number };

/** `{ key: count }` with every expected key present (0 when absent). */
function tally<K extends string>(keys: readonly K[], rows: CountRow[]): Record<K, number> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const r of rows) if ((keys as readonly string[]).includes(r.k)) counts[r.k as K] = r.cnt;
  return counts;
}

// Leads, requests and enquirers are counted by creation date within the range;
// properties are a snapshot of current inventory.
adminReportRoutes.get("/", async (c) => {
  const from = msParam(c.req.query("from")) ?? 0;
  const to = msParam(c.req.query("to")) ?? Date.now();
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return c.json(errorBody("VALIDATION_ERROR", "from/to: Use Unix milliseconds"), 422);
  }

  const db = c.env.DB;
  const [byStatus, byUserType, requests, byKind, byPropertyStatus, available, enquirers] = await db.batch([
    db.prepare(
      `SELECT lead_status AS k, COUNT(*) AS cnt FROM enquiries
       WHERE stage = 'completed' AND created_at >= ? AND created_at <= ? GROUP BY lead_status`
    ).bind(from, to),
    db.prepare(
      `SELECT user_type AS k, COUNT(*) AS cnt FROM enquiries
       WHERE stage = 'completed' AND created_at >= ? AND created_at <= ? GROUP BY user_type`
    ).bind(from, to),
    db.prepare(
      `SELECT kind AS k, COUNT(*) AS cnt FROM lead_requests WHERE created_at >= ? AND created_at <= ? GROUP BY kind`
    ).bind(from, to),
    db.prepare(`SELECT opportunity_kind AS k, COUNT(*) AS cnt FROM listings WHERE status != 'archived' GROUP BY opportunity_kind`),
    db.prepare("SELECT status AS k, COUNT(*) AS cnt FROM listings GROUP BY status"),
    db.prepare("SELECT COUNT(*) AS cnt FROM listings WHERE status = 'approved' AND is_available = 1"),
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM users
       WHERE role = 'customer' AND mobile_verified_at IS NOT NULL AND created_at >= ? AND created_at <= ?`
    ).bind(from, to),
  ]);

  const rows = (r: D1Result | undefined) => (r?.results ?? []) as CountRow[];
  const count = (r: D1Result | undefined) => (r?.results[0] as { cnt: number } | undefined)?.cnt ?? 0;

  const leadsByStatus = tally(LEAD_STATUSES, rows(byStatus));
  const propertiesByKind = tally(OPPORTUNITY_KINDS, rows(byKind));
  const body: AdminReportsResponse = {
    leads: {
      total: Object.values(leadsByStatus).reduce((a, b) => a + b, 0),
      by_status: leadsByStatus,
      by_user_type: tally(USER_TYPES, rows(byUserType)),
    },
    requests: tally(LEAD_REQUEST_KINDS, rows(requests)),
    properties: {
      total: Object.values(propertiesByKind).reduce((a, b) => a + b, 0),
      available: count(available),
      by_kind: propertiesByKind,
      by_status: Object.fromEntries(rows(byPropertyStatus).map((r) => [r.k, r.cnt])),
    },
    enquirers: { verified: count(enquirers) },
  };
  return c.json(body);
});
