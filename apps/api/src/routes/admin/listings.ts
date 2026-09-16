import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import {
  notifyVendorListingApproved,
  notifyVendorListingChangesRequested,
  notifyVendorListingRejected,
} from "../../agents/moderation";

export const adminListingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminListingRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { status, limit, offset } = c.req.query();
  const pageLimit = Math.min(parseInt(limit ?? "20", 10), 100);
  const pageOffset = parseInt(offset ?? "0", 10);

  const where = status ? "WHERE l.status = ?" : "WHERE 1=1";
  const params: (string | number)[] = status
    ? [status, pageLimit, pageOffset]
    : [pageLimit, pageOffset];

  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.type, l.title, l.status, l.price, l.currency,
            l.location_text, l.admin_note, l.created_at, u.name as vendor_name
     FROM listings l
     JOIN vendor_profiles vp ON vp.id = l.vendor_id
     JOIN users u ON u.id = vp.user_id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params)
    .all();

  return c.json({ listings: rows.results });
});

async function getListingWithVendorEmail(
  id: string,
  db: D1Database
): Promise<{ title: string; vendor_name: string; vendor_mobile: string } | null> {
  return db
    .prepare(
      `SELECT l.title, u.name as vendor_name, u.mobile as vendor_mobile
       FROM listings l
       JOIN vendor_profiles vp ON vp.id = l.vendor_id
       JOIN users u ON u.id = vp.user_id
       WHERE l.id = ?`
    )
    .bind(id)
    .first<{ title: string; vendor_name: string; vendor_mobile: string }>();
}

adminListingRoutes.post("/:id/approve", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();
  const now = Date.now();

  const listing = await getListingWithVendorEmail(id, c.env.DB);
  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  await c.env.DB.prepare(
    "UPDATE listings SET status = 'approved', published_at = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(now, now, now, id)
    .run();

  c.executionCtx.waitUntil(
    notifyVendorListingApproved(listing.vendor_mobile, listing.title, c.env).catch(() => {})
  );

  return c.json({ ok: true });
});

adminListingRoutes.post("/:id/request-changes", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ note?: string }>();

  if (!body.note) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "note required" } }, 422);
  }

  const listing = await getListingWithVendorEmail(id, c.env.DB);
  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    "UPDATE listings SET status = 'rejected', admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(body.note, now, now, id)
    .run();

  c.executionCtx.waitUntil(
    notifyVendorListingChangesRequested(
      listing.vendor_mobile, listing.title, body.note, c.env
    ).catch(() => {})
  );

  return c.json({ ok: true });
});

adminListingRoutes.post("/:id/reject", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ reason?: string }>();

  if (!body.reason) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "reason required" } }, 422);
  }

  const listing = await getListingWithVendorEmail(id, c.env.DB);
  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    "UPDATE listings SET status = 'rejected', admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(body.reason, now, now, id)
    .run();

  c.executionCtx.waitUntil(
    notifyVendorListingRejected(
      listing.vendor_mobile, listing.title, body.reason, c.env
    ).catch(() => {})
  );

  return c.json({ ok: true });
});
