import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const vendorListingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function getApprovedVendorId(
  userId: string,
  db: D1Database
): Promise<string | null> {
  const row = await db
    .prepare("SELECT id FROM vendor_profiles WHERE user_id = ? AND status = 'approved'")
    .bind(userId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

vendorListingRoutes.get("/", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.type, l.title, l.price, l.currency, l.status, l.location_text,
            l.created_at, l.updated_at, l.admin_note
     FROM listings l WHERE l.vendor_id = ? ORDER BY l.created_at DESC`
  )
    .bind(vendorId)
    .all();

  return c.json({ listings: rows.results });
});

vendorListingRoutes.post("/", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const body = await c.req.json<{
    type?: string;
    title?: string;
    description?: string;
    price?: number;
    currency?: string;
    location_slug?: string;
    location_text?: string;
    latitude?: number;
    longitude?: number;
    size_sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
    photo_keys?: string[];
  }>();

  if (!body.type || !body.title || body.price === undefined || !body.location_slug || !body.location_text) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Required fields missing" } }, 422);
  }

  const now = Date.now();
  const listingId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO listings (id, vendor_id, type, status, title, description, price, currency,
      location_slug, location_text, latitude, longitude, size_sqft, bedrooms, bathrooms,
      amenities, created_at, updated_at)
     VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      listingId, vendorId, body.type, body.title, body.description ?? null,
      body.price, body.currency ?? "AED", body.location_slug, body.location_text,
      body.latitude ?? null, body.longitude ?? null, body.size_sqft ?? null,
      body.bedrooms ?? null, body.bathrooms ?? null,
      body.amenities ? JSON.stringify(body.amenities) : null,
      now, now
    )
    .run();

  if (body.photo_keys?.length) {
    const stmts = body.photo_keys.map((key, i) =>
      c.env.DB.prepare(
        "INSERT INTO listing_photos (id, listing_id, r2_key, display_order, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), listingId, key, i, now)
    );
    await c.env.DB.batch(stmts);
  }

  return c.json({ listing_id: listingId, status: "draft" }, 201);
});

vendorListingRoutes.get("/:id", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const { id } = c.req.param();
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const listing = await c.env.DB.prepare(
    "SELECT * FROM listings WHERE id = ? AND vendor_id = ?"
  )
    .bind(id, vendorId)
    .first();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  const photos = await c.env.DB.prepare(
    "SELECT r2_key, display_order FROM listing_photos WHERE listing_id = ? ORDER BY display_order"
  )
    .bind(id)
    .all<{ r2_key: string; display_order: number }>();

  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    ...listing,
    photos: photos.results.map((p) => ({
      url: `${baseUrl}/files/${p.r2_key}`,
      display_order: p.display_order,
    })),
  });
});

vendorListingRoutes.patch("/:id", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const { id } = c.req.param();
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const listing = await c.env.DB.prepare(
    "SELECT id, status FROM listings WHERE id = ? AND vendor_id = ?"
  )
    .bind(id, vendorId)
    .first<{ id: string; status: string }>();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }
  if (!["draft", "rejected"].includes(listing.status)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Can only edit draft or rejected listings" } }, 403);
  }

  const body = await c.req.json<{
    title?: string; description?: string; price?: number; currency?: string;
    location_slug?: string; location_text?: string; latitude?: number; longitude?: number;
    size_sqft?: number; bedrooms?: number; bathrooms?: number; amenities?: string[];
  }>();

  const now = Date.now();
  await c.env.DB.prepare(
    `UPDATE listings SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      currency = COALESCE(?, currency),
      location_slug = COALESCE(?, location_slug),
      location_text = COALESCE(?, location_text),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      size_sqft = COALESCE(?, size_sqft),
      bedrooms = COALESCE(?, bedrooms),
      bathrooms = COALESCE(?, bathrooms),
      amenities = COALESCE(?, amenities),
      updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.title ?? null, body.description ?? null, body.price ?? null,
      body.currency ?? null, body.location_slug ?? null, body.location_text ?? null,
      body.latitude ?? null, body.longitude ?? null, body.size_sqft ?? null,
      body.bedrooms ?? null, body.bathrooms ?? null,
      body.amenities ? JSON.stringify(body.amenities) : null,
      now, id
    )
    .run();

  return c.json({ ok: true });
});

vendorListingRoutes.post("/:id/submit", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const { id } = c.req.param();
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const listing = await c.env.DB.prepare(
    "SELECT id, status FROM listings WHERE id = ? AND vendor_id = ?"
  )
    .bind(id, vendorId)
    .first<{ id: string; status: string }>();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }
  if (!["draft", "rejected"].includes(listing.status)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Can only submit draft or rejected listings" } }, 403);
  }

  const now = Date.now();
  await c.env.DB.prepare("UPDATE listings SET status = 'pending', updated_at = ? WHERE id = ?")
    .bind(now, id)
    .run();

  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      "INSERT INTO admin_notifications (id, type, payload, created_at) VALUES (?, 'listing_pending', ?, ?)"
    )
      .bind(crypto.randomUUID(), JSON.stringify({ listing_id: id, vendor_id: vendorId }), now)
      .run()
  );

  return c.json({ status: "pending" });
});

vendorListingRoutes.post("/:id/withdraw", requireAuth(["vendor"]), async (c) => {
  const payload = c.get("jwtPayload");
  const { id } = c.req.param();
  const vendorId = await getApprovedVendorId(payload.sub, c.env.DB);
  if (!vendorId) {
    return c.json({ error: { code: "FORBIDDEN", message: "Vendor not approved" } }, 403);
  }

  const listing = await c.env.DB.prepare(
    "SELECT id FROM listings WHERE id = ? AND vendor_id = ?"
  )
    .bind(id, vendorId)
    .first<{ id: string }>();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  await c.env.DB.prepare("UPDATE listings SET status = 'withdrawn', updated_at = ? WHERE id = ?")
    .bind(Date.now(), id)
    .run();

  return c.json({ status: "withdrawn" });
});
