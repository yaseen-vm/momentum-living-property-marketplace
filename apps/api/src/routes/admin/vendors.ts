import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { notifyVendorApproved, notifyVendorRejected } from "../../agents/moderation";

export const adminVendorRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminVendorRoutes.get("/", requireAuth(["admin"]), async (c) => {
  const { status, limit, offset } = c.req.query();
  const pageLimit = Math.min(parseInt(limit ?? "20", 10), 100);
  const pageOffset = parseInt(offset ?? "0", 10);

  const where = status ? "WHERE vp.status = ?" : "";
  const params: (string | number)[] = status ? [status, pageLimit, pageOffset] : [pageLimit, pageOffset];

  const rows = await c.env.DB.prepare(
    `SELECT vp.id, vp.user_id, vp.vendor_type, vp.status, vp.company_name, vp.licence_no,
            vp.admin_note, vp.created_at, u.name, u.mobile
     FROM vendor_profiles vp
     JOIN users u ON u.id = vp.user_id
     ${where}
     ORDER BY vp.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params)
    .all();

  return c.json({ vendors: rows.results });
});

adminVendorRoutes.get("/:id", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();

  const profile = await c.env.DB.prepare(
    `SELECT vp.*, u.name, u.mobile
     FROM vendor_profiles vp
     JOIN users u ON u.id = vp.user_id
     WHERE vp.id = ?`
  )
    .bind(id)
    .first<{
      id: string; user_id: string; vendor_type: string; status: string;
      company_name: string | null; licence_no: string | null; admin_note: string | null;
      created_at: number; name: string; mobile: string;
    }>();

  if (!profile) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vendor not found" } }, 404);
  }

  const docs = await c.env.DB.prepare(
    "SELECT id, label, r2_key FROM vendor_documents WHERE vendor_id = ?"
  )
    .bind(id)
    .all<{ id: string; label: string; r2_key: string }>();

  const baseUrl = new URL(c.req.url).origin;

  return c.json({
    ...profile,
    documents: docs.results.map((d) => ({
      id: d.id,
      label: d.label,
      url: `${baseUrl}/files/${d.r2_key}`,
    })),
  });
});

adminVendorRoutes.post("/:id/approve", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();
  const now = Date.now();

  const vendor = await c.env.DB.prepare(
    `SELECT vp.id, u.name, u.mobile FROM vendor_profiles vp JOIN users u ON u.id = vp.user_id WHERE vp.id = ?`
  )
    .bind(id)
    .first<{ id: string; name: string; mobile: string }>();

  if (!vendor) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vendor not found" } }, 404);
  }

  await c.env.DB.prepare(
    "UPDATE vendor_profiles SET status = 'approved', reviewed_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(now, now, id)
    .run();

  c.executionCtx.waitUntil(
    notifyVendorApproved(vendor.mobile, vendor.name, c.env).catch(() => {})
  );

  return c.json({ ok: true });
});

adminVendorRoutes.post("/:id/reject", requireAuth(["admin"]), async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ reason?: string }>();

  if (!body.reason) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "reason required" } }, 422);
  }

  const vendor = await c.env.DB.prepare(
    `SELECT vp.id, u.name, u.mobile FROM vendor_profiles vp JOIN users u ON u.id = vp.user_id WHERE vp.id = ?`
  )
    .bind(id)
    .first<{ id: string; name: string; mobile: string }>();

  if (!vendor) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vendor not found" } }, 404);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    "UPDATE vendor_profiles SET status = 'rejected', admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?"
  )
    .bind(body.reason, now, now, id)
    .run();

  c.executionCtx.waitUntil(
    notifyVendorRejected(vendor.mobile, vendor.name, body.reason, c.env).catch(() => {})
  );

  return c.json({ ok: true });
});
