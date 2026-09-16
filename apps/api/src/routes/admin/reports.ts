import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const adminReportRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminReportRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { from, to } = c.req.query();
  const fromMs = from ? parseInt(from, 10) : 0;
  const toMs = to ? parseInt(to, 10) : Date.now();

  const [listingStats, vendorStats, customerStats, bookingStats, listingByType] =
    await c.env.DB.batch([
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

  function toMap(rows: { status: string; cnt: number }[]) {
    return Object.fromEntries(rows.map((r) => [r.status, r.cnt]));
  }

  const lMap = toMap(listingStats.results as { status: string; cnt: number }[]);
  const vMap = toMap(vendorStats.results as { status: string; cnt: number }[]);
  const bMap = toMap(bookingStats.results as { status: string; cnt: number }[]);
  const tMap = toMap(listingByType.results as { status: string; cnt: number }[]);
  const cRow = (customerStats.results[0] ?? { total: 0, verified: 0 }) as { total: number; verified: number };

  const lTotal = Object.values(lMap).reduce((a, b) => a + b, 0);
  const vTotal = Object.values(vMap).reduce((a, b) => a + b, 0);
  const bTotal = Object.values(bMap).reduce((a, b) => a + b, 0);

  return c.json({
    listings: {
      total: lTotal,
      approved: lMap["approved"] ?? 0,
      pending: lMap["pending"] ?? 0,
      rejected: lMap["rejected"] ?? 0,
      by_type: {
        property: tMap["property"] ?? 0,
        plot: tMap["plot"] ?? 0,
        room: tMap["room"] ?? 0,
      },
    },
    vendors: {
      total: vTotal,
      approved: vMap["approved"] ?? 0,
      pending: vMap["pending"] ?? 0,
      rejected: vMap["rejected"] ?? 0,
    },
    customers: { total: cRow.total, verified: cRow.verified },
    bookings: {
      total: bTotal,
      closed: bMap["closed"] ?? 0,
      pending: bMap["pending"] ?? 0,
    },
  });
});
