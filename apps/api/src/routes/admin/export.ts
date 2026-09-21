import { Hono } from "hono";
import { EXPORT_TYPES, LEAD_STATUSES, LEAD_STATUS_LABELS, USER_TYPES, USER_TYPE_LABELS } from "@momentum/shared";
import type { ExportType, LeadStatus, UserType } from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { runAgent } from "../../lib/agentRuns";
import { summariseRequirements } from "../../agents/leadNotification";
import { errorBody, msParam } from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminExportRoutes = new Hono<Env>();

adminExportRoutes.use("*", requireAuth(["admin"]));

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 366 * DAY_MS;
const EXPORTS_PER_HOUR = 5;
const PERIODS: Record<string, number> = { "24h": DAY_MS, "2d": 2 * DAY_MS, "7d": 7 * DAY_MS, "30d": 30 * DAY_MS };

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(Number(ts)).toISOString().replace("T", " ").slice(0, 19);
}

// ="..." forces Excel to treat the cell as text, preventing scientific notation for phone numbers
function fmtPhone(val: string | null | undefined): string {
  if (!val) return "";
  return `="${val}"`;
}

function rowToCsv(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsv).join(",");
}

type LeadRow = {
  reference_no: string;
  created_at: number;
  user_type: UserType;
  full_name: string;
  company_name: string | null;
  position: string | null;
  email: string;
  mobile: string;
  lead_status: LeadStatus;
  agent_name: string | null;
  match_count: number;
  request_count: number;
  requirements: string | null;
};

type EnquirerRow = {
  name: string;
  mobile: string;
  mobile_verified_at: number | null;
  created_at: number;
  last_login_at: number | null;
};

adminExportRoutes.get("/", async (c) => {
  const { type, date_field, period, from, to, user_type, lead_status } = c.req.query();
  const userId = c.get("jwtPayload").sub;

  if (!type || !(EXPORT_TYPES as readonly string[]).includes(type)) {
    return c.json(errorBody("VALIDATION_ERROR", "type: Must be leads or enquirers"), 422);
  }
  if (user_type && !(USER_TYPES as readonly string[]).includes(user_type)) {
    return c.json(errorBody("VALIDATION_ERROR", "user_type: Unknown user type"), 422);
  }
  if (lead_status && !(LEAD_STATUSES as readonly string[]).includes(lead_status)) {
    return c.json(errorBody("VALIDATION_ERROR", "lead_status: Unknown status"), 422);
  }

  const now = Date.now();
  let fromMs: number;
  let toMs: number;
  if (period === "custom") {
    const f = msParam(from);
    const t = msParam(to);
    if (f === undefined || t === undefined || Number.isNaN(f) || Number.isNaN(t) || f > t) {
      return c.json(errorBody("VALIDATION_ERROR", "from/to: Choose a valid date range"), 422);
    }
    [fromMs, toMs] = [f, t];
  } else {
    [fromMs, toMs] = [now - (PERIODS[period ?? "7d"] ?? PERIODS["7d"]!), now];
  }
  if (toMs - fromMs > MAX_RANGE_MS) {
    return c.json(errorBody("VALIDATION_ERROR", "from/to: The range can be at most 366 days"), 422);
  }

  const rateKey = `rl:export:${userId}`;
  const done = parseInt((await c.env.KV.get(rateKey)) ?? "0", 10);
  if (done >= EXPORTS_PER_HOUR) {
    return c.json(errorBody("RATE_LIMITED", "Export limit reached. Please try again later."), 429);
  }

  let lines: string[];
  if ((type as ExportType) === "leads") {
    const conditions = ["e.stage = 'completed'", "e.created_at >= ?", "e.created_at <= ?"];
    const params: (string | number)[] = [fromMs, toMs];
    if (user_type) {
      conditions.push("e.user_type = ?");
      params.push(user_type);
    }
    if (lead_status) {
      conditions.push("e.lead_status = ?");
      params.push(lead_status);
    }

    const result = await c.env.DB.prepare(
      `SELECT e.reference_no, e.created_at, e.user_type, e.full_name, e.company_name, e.position, e.email, e.mobile,
         e.lead_status, a.name AS agent_name, e.match_count, e.requirements,
         (SELECT COUNT(*) FROM lead_requests r WHERE r.enquiry_id = e.id) AS request_count
       FROM enquiries e LEFT JOIN agents a ON a.id = e.assigned_agent_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY e.created_at DESC`
    )
      .bind(...params)
      .all<LeadRow>();

    lines = [
      "Reference,Created,User Type,Name,Company,Position,Email,Mobile,Status,Assigned Agent,Matches,Requests,Requirements",
    ];
    for (const r of result.results) {
      lines.push(
        rowToCsv([
          r.reference_no,
          fmtDate(r.created_at),
          USER_TYPE_LABELS[r.user_type] ?? r.user_type,
          r.full_name,
          r.company_name,
          r.position,
          r.email,
          fmtPhone(r.mobile),
          LEAD_STATUS_LABELS[r.lead_status] ?? r.lead_status,
          r.agent_name,
          r.match_count,
          r.request_count,
          summariseRequirements(r.requirements),
        ])
      );
    }
  } else {
    const dateCol = date_field === "last_login" ? "last_login_at" : "created_at";
    const result = await c.env.DB.prepare(
      `SELECT name, mobile, mobile_verified_at, created_at, last_login_at FROM users
       WHERE role = 'customer' AND mobile_verified_at IS NOT NULL AND ${dateCol} >= ? AND ${dateCol} <= ?
       ORDER BY ${dateCol} DESC`
    )
      .bind(fromMs, toMs)
      .all<EnquirerRow>();

    lines = ["Name,Mobile,Mobile Verified,Signup Date,Last Login"];
    for (const r of result.results) {
      lines.push(
        rowToCsv([r.name, fmtPhone(r.mobile), fmtDate(r.mobile_verified_at), fmtDate(r.created_at), fmtDate(r.last_login_at)])
      );
    }
  }

  await c.env.KV.put(rateKey, String(done + 1), { expirationTtl: 3600 });
  const rows = lines.length - 1;
  c.executionCtx.waitUntil(
    runAgent(
      c.env.DB,
      { agentType: "csv_export", userId, input: { type, from: fromMs, to: toMs, user_type, lead_status } },
      async () => ({ rows })
    )
  );

  const filename = `${type}-export-${fmtDate(now).slice(0, 10)}.csv`;
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
