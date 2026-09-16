import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const vendorProfileRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

vendorProfileRoutes.post("/register", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    vendor_type?: string;
    company_name?: string;
    licence_no?: string;
  }>();

  if (!body.vendor_type || !["landlord", "company", "agent", "broker"].includes(body.vendor_type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid vendor_type" } }, 422);
  }

  const now = Date.now();
  const existing = await c.env.DB.prepare(
    "SELECT id FROM vendor_profiles WHERE user_id = ?"
  )
    .bind(payload.sub)
    .first<{ id: string }>();

  let vendorId: string;
  if (existing) {
    vendorId = existing.id;
    await c.env.DB.prepare(
      "UPDATE vendor_profiles SET vendor_type = ?, company_name = ?, licence_no = ?, status = 'pending', updated_at = ? WHERE id = ?"
    )
      .bind(body.vendor_type, body.company_name ?? null, body.licence_no ?? null, now, vendorId)
      .run();
  } else {
    vendorId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO vendor_profiles (id, user_id, vendor_type, status, company_name, licence_no, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)"
    )
      .bind(vendorId, payload.sub, body.vendor_type, body.company_name ?? null, body.licence_no ?? null, now, now)
      .run();
  }

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "INSERT INTO admin_notifications (id, type, payload, created_at) VALUES (?, 'vendor_pending', ?, ?)"
    )
      .bind(crypto.randomUUID(), JSON.stringify({ vendor_id: vendorId, user_id: payload.sub }), now)
      .run()
  );

  return c.json({ vendor_id: vendorId, status: "pending" }, 201);
});

vendorProfileRoutes.post("/documents", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ label?: string; r2_key?: string }>();

  if (!body.label || !body.r2_key) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "label and r2_key required" } }, 422);
  }

  const vendor = await c.env.DB.prepare("SELECT id FROM vendor_profiles WHERE user_id = ?")
    .bind(payload.sub)
    .first<{ id: string }>();

  if (!vendor) {
    return c.json({ error: { code: "NOT_FOUND", message: "Vendor profile not found" } }, 404);
  }

  const docId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO vendor_documents (id, vendor_id, label, r2_key, uploaded_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(docId, vendor.id, body.label, body.r2_key, Date.now())
    .run();

  return c.json({ document_id: docId }, 201);
});

vendorProfileRoutes.get("/profile", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");

  const profile = await c.env.DB.prepare(
    `SELECT vp.*, u.name, u.mobile FROM vendor_profiles vp
     JOIN users u ON u.id = vp.user_id
     WHERE vp.user_id = ?`
  )
    .bind(payload.sub)
    .first<{
      id: string;
      user_id: string;
      vendor_type: string;
      status: string;
      company_name: string | null;
      licence_no: string | null;
      admin_note: string | null;
      created_at: number;
      name: string;
      mobile: string;
    }>();

  if (!profile) {
    return c.json({ error: { code: "NOT_FOUND", message: "Profile not found" } }, 404);
  }

  const docs = await c.env.DB.prepare(
    "SELECT id, label, r2_key FROM vendor_documents WHERE vendor_id = ?"
  )
    .bind(profile.id)
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

vendorProfileRoutes.put("/profile", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ name?: string; company_name?: string; licence_no?: string }>();
  const now = Date.now();

  if (body.name !== undefined) {
    await c.env.DB.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?")
      .bind(body.name, now, payload.sub)
      .run();
  }

  await c.env.DB.prepare(
    "UPDATE vendor_profiles SET company_name = COALESCE(?, company_name), licence_no = COALESCE(?, licence_no), updated_at = ? WHERE user_id = ?"
  )
    .bind(body.company_name ?? null, body.licence_no ?? null, now, payload.sub)
    .run();

  return c.json({ ok: true });
});
