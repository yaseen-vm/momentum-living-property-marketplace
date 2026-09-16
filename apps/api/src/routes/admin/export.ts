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

type CustomerRow = {
  name: string; mobile: string; mobile_verified_at: number | null;
  signup_date: number; last_login_at: number | null;
  email: string | null; alt_mobile: string | null;
  total_enquiries: number; open_enquiries: number;
  shortlisted: number; last_enquiry_date: number | null;
};

type OwnerRow = {
  name: string; mobile: string; mobile_verified_at: number | null;
  vendor_type: string; status: string; company_name: string | null;
  licence_no: string | null; reviewed_at: number | null;
  signup_date: number; last_login_at: number | null;
  total_listings: number; live_listings: number;
  total_enquiries: number; open_enquiries: number;
  last_listing_date: number | null;
};

function leadStage(row: CustomerRow): string {
  if (row.open_enquiries > 0) return "Hot";
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (row.shortlisted > 0 || (row.last_enquiry_date && row.last_enquiry_date >= thirtyDaysAgo)) return "Warm";
  return "Cold";
}

function daysSince(ts: number | null | undefined): string {
  if (!ts) return "";
  return String(Math.floor((Date.now() - Number(ts)) / (24 * 60 * 60 * 1000)));
}

adminExportRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { type, date_field, period, from, to, owner_status } = c.req.query();

  if (!type || !["customers", "owners"].includes(type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "type must be customers or owners" } }, 422);
  }

  const [fromMs, toMs] = periodToMs(period ?? "7d", from, to);
  const dateCol = date_field === "last_login" ? "last_login_at" : "created_at";

  let lines: string[];

  if (type === "customers") {
    const headers = "Name,Mobile,Email,Alt Mobile,Mobile Verified,Lead Stage,Total Enquiries,Open Enquiries,Shortlisted,Last Enquiry Date,Days Since Last Activity,Signup Date,Last Login";
    const result = await c.env.DB.prepare(
      `SELECT u.name, u.mobile, u.mobile_verified_at, u.created_at AS signup_date, u.last_login_at,
              (SELECT b2.customer_email FROM bookings b2 WHERE b2.customer_id = u.id AND b2.customer_email IS NOT NULL ORDER BY b2.created_at DESC LIMIT 1) AS email,
              (SELECT b3.customer_alt_mobile FROM bookings b3 WHERE b3.customer_id = u.id AND b3.customer_alt_mobile IS NOT NULL ORDER BY b3.created_at DESC LIMIT 1) AS alt_mobile,
              COUNT(DISTINCT b.id) AS total_enquiries,
              COUNT(DISTINCT CASE WHEN b.status IN ('pending','owner_confirmed','customer_contacted') THEN b.id END) AS open_enquiries,
              COUNT(DISTINCT sl.id) AS shortlisted,
              MAX(b.created_at) AS last_enquiry_date
       FROM users u
       LEFT JOIN bookings b ON b.customer_id = u.id
       LEFT JOIN shortlists sl ON sl.user_id = u.id
       WHERE u.role = 'customer' AND u.${dateCol} >= ? AND u.${dateCol} <= ?
       GROUP BY u.id
       ORDER BY open_enquiries DESC, last_enquiry_date DESC`
    )
      .bind(fromMs, toMs)
      .all<CustomerRow>();

    lines = [headers];
    for (const r of result.results) {
      const lastActivity = Math.max(r.last_login_at ?? 0, r.last_enquiry_date ?? 0) || null;
      lines.push(rowToCsv([
        r.name, fmtPhone(r.mobile), r.email, fmtPhone(r.alt_mobile),
        r.mobile_verified_at ? "Yes" : "No",
        leadStage(r),
        r.total_enquiries, r.open_enquiries, r.shortlisted,
        fmtDate(r.last_enquiry_date),
        daysSince(lastActivity),
        fmtDate(r.signup_date), fmtDate(r.last_login_at),
      ]));
    }
  } else {
    const headers = "Name,Mobile,Company Name,Vendor Type,Status,Licence No,Total Listings,Live Listings,Total Enquiries Received,Open Enquiries,Last Listing Date,Approved Since,Signup Date,Last Login";
    const statusFilter = owner_status && owner_status !== "all" ? "AND vp.status = ?" : "";
    const params: (string | number)[] = [fromMs, toMs];
    if (owner_status && owner_status !== "all") params.push(owner_status);

    const result = await c.env.DB.prepare(
      `SELECT u.name, u.mobile, u.mobile_verified_at, vp.vendor_type, vp.status,
              vp.company_name, vp.licence_no, vp.reviewed_at,
              u.created_at AS signup_date, u.last_login_at,
              COUNT(DISTINCT l.id) AS total_listings,
              COUNT(DISTINCT CASE WHEN l.status = 'approved' THEN l.id END) AS live_listings,
              COUNT(DISTINCT bk.id) AS total_enquiries,
              COUNT(DISTINCT CASE WHEN bk.status IN ('pending','owner_confirmed','customer_contacted') THEN bk.id END) AS open_enquiries,
              MAX(l.created_at) AS last_listing_date
       FROM vendor_profiles vp
       JOIN users u ON u.id = vp.user_id
       LEFT JOIN listings l ON l.vendor_id = vp.id
       LEFT JOIN bookings bk ON bk.listing_id = l.id
       WHERE u.${dateCol} >= ? AND u.${dateCol} <= ? ${statusFilter}
       GROUP BY vp.id
       ORDER BY open_enquiries DESC, total_enquiries DESC`
    )
      .bind(...params)
      .all<OwnerRow>();

    lines = [headers];
    for (const r of result.results) {
      lines.push(rowToCsv([
        r.name, fmtPhone(r.mobile), r.company_name, r.vendor_type, r.status, r.licence_no,
        r.total_listings, r.live_listings,
        r.total_enquiries, r.open_enquiries,
        fmtDate(r.last_listing_date), fmtDate(r.reviewed_at),
        fmtDate(r.signup_date), fmtDate(r.last_login_at),
      ]));
    }
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
