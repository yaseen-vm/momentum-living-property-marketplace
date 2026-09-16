import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const adminReportRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminReportRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { from, to } = c.req.query();
  const fromMs = from ? parseInt(from, 10) : 0;
  const toMs = to ? parseInt(to, 10) : Date.now();

  const results = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM listings
         WHERE created_at >= ? AND created_at <= ? GROUP BY status`
      ).bind(fromMs, toMs),
      c.env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM vendor_profiles
         WHERE created_at >= ? AND created_at <= ? GROUP BY status`
      ).bind(fromMs, toMs),
      c.env.DB.prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN mobile_verified_at IS NOT NULL THEN 1 ELSE 0 END) as verified
         FROM users WHERE role = 'customer' AND created_at >= ? AND created_at <= ?`
      ).bind(fromMs, toMs),
      c.env.DB.prepare(
        `SELECT status, COUNT(*) as cnt FROM bookings
         WHERE created_at >= ? AND created_at <= ? GROUP BY status`
      ).bind(fromMs, toMs),
      c.env.DB.prepare(
        `SELECT type, COUNT(*) as cnt FROM listings
         WHERE status = 'approved' AND created_at >= ? AND created_at <= ? GROUP BY type`
      ).bind(fromMs, toMs),
    ]);

  const [listingStats, vendorStats, customerStats, bookingStats, listingByType] = results as [
    typeof results[0], typeof results[0], typeof results[0], typeof results[0], typeof results[0]
  ];

  function toMap(rows: { status: string; cnt: number }[]) {
    return Object.fromEntries(rows.map((r) => [r.status, r.cnt]));
  }

  const lMap = toMap(listingStats.results as { status: string; cnt: number }[]);
  const vMap = toMap(vendorStats.results as { status: string; cnt: number }[]);
  const bMap = toMap(bookingStats.results as { status: string; cnt: number }[]);
  const tMap = toMap(listingByType.results as { status: string; cnt: number }[]);
  const cRow = (customerStats.results[0] ?? { total: 0, verified: 0 }) as { total: number; verified: number };

  return c.json({
    customers_total: cRow.total,
    listings_by_status: {
      pending: lMap["pending"] ?? 0,
      approved: lMap["approved"] ?? 0,
      rejected: lMap["rejected"] ?? 0,
    },
    listings_by_type: {
      property: tMap["property"] ?? 0,
      plot: tMap["plot"] ?? 0,
      room: tMap["room"] ?? 0,
    },
    vendors_by_status: {
      pending: vMap["pending"] ?? 0,
      approved: vMap["approved"] ?? 0,
      rejected: vMap["rejected"] ?? 0,
    },
    bookings_by_status: {
      pending: bMap["pending"] ?? 0,
      owner_confirmed: bMap["owner_confirmed"] ?? 0,
      customer_contacted: bMap["customer_contacted"] ?? 0,
      closed: bMap["closed"] ?? 0,
    },
  });
});
