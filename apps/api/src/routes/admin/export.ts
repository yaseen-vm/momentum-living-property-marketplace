import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const adminExportRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function periodToMs(period: string, from?: string, to?: string): [number, number] {
  const now = Date.now();
  if (period === "custom" && from && to) {
    return [parseInt(from, 10), parseInt(to, 10)];
  }
  const msMap: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "2d": 2 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const ms = msMap[period] ?? msMap["7d"]!;
  return [now - ms, now];
}

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

adminExportRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { type, date_field, period, from, to, owner_status } = c.req.query();

  if (!type || !["customers", "owners"].includes(type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "type must be customers or owners" } }, 422);
  }

  const [fromMs, toMs] = periodToMs(period ?? "7d", from, to);
  const dateCol = date_field === "last_login" ? "last_login_at" : "created_at";

  let headers: string;
  let rows: Record<string, string | number | null>[];

  if (type === "customers") {
    headers = "name,mobile,mobile_verified_at,signup_date,last_login_at";
    const result = await c.env.DB.prepare(
      `SELECT name, mobile, mobile_verified_at, created_at as signup_date, last_login_at
       FROM users WHERE role = 'customer' AND ${dateCol} >= ? AND ${dateCol} <= ?
       ORDER BY created_at DESC`
    )
      .bind(fromMs, toMs)
      .all<{ name: string; mobile: string; mobile_verified_at: number | null; signup_date: number; last_login_at: number | null }>();
    rows = result.results;
  } else {
    headers = "name,mobile,mobile_verified_at,vendor_type,status,company_name,licence_no,signup_date,last_login_at";
    const statusFilter =
      owner_status && owner_status !== "all" ? "AND vp.status = ?" : "";
    const params: (string | number)[] = [fromMs, toMs];
    if (owner_status && owner_status !== "all") params.push(owner_status);

    const result = await c.env.DB.prepare(
      `SELECT u.name, u.mobile, u.mobile_verified_at, vp.vendor_type, vp.status,
              vp.company_name, vp.licence_no, u.created_at as signup_date, u.last_login_at
       FROM vendor_profiles vp
       JOIN users u ON u.id = vp.user_id
       WHERE u.${dateCol} >= ? AND u.${dateCol} <= ? ${statusFilter}
       ORDER BY u.created_at DESC`
    )
      .bind(...params)
      .all<{
        name: string; mobile: string; mobile_verified_at: number | null;
        vendor_type: string; status: string; company_name: string | null;
        licence_no: string | null; signup_date: number; last_login_at: number | null;
      }>();
    rows = result.results;
  }

  const lines: string[] = [headers];
  for (const row of rows) {
    let fields: (string | number | null | undefined)[];
    if (type === "customers") {
      const r = row as { name: string; mobile: string; mobile_verified_at: number | null; signup_date: number; last_login_at: number | null };
      fields = [r.name, fmtPhone(r.mobile), fmtDate(r.mobile_verified_at), fmtDate(r.signup_date), fmtDate(r.last_login_at)];
    } else {
      const r = row as { name: string; mobile: string; mobile_verified_at: number | null; vendor_type: string; status: string; company_name: string | null; licence_no: string | null; signup_date: number; last_login_at: number | null };
      fields = [r.name, fmtPhone(r.mobile), fmtDate(r.mobile_verified_at), r.vendor_type, r.status, r.company_name, r.licence_no, fmtDate(r.signup_date), fmtDate(r.last_login_at)];
    }
    lines.push(rowToCsv(fields));
  }
  const csv = lines.join("\r\n");

  const filename = `${type}-export-${fmtDate(Date.now()).slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
