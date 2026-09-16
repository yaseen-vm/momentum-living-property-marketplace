import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const customerShortlistRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

customerShortlistRoutes.get("/", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");

  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.type, l.title, l.price, l.currency, l.location_text, l.size_sqft,
            l.bedrooms, l.bathrooms, l.published_at,
            (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order LIMIT 1) as thumbnail_key
     FROM shortlists s
     JOIN listings l ON l.id = s.listing_id
     WHERE s.user_id = ? AND l.status = 'approved'
     ORDER BY s.created_at DESC`
  )
    .bind(payload.sub)
    .all<{
      id: string; type: string; title: string; price: number; currency: string;
      location_text: string; size_sqft: number | null; bedrooms: number | null;
      bathrooms: number | null; published_at: number | null; thumbnail_key: string | null;
    }>();

  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    listings: rows.results.map((r) => ({
      ...r,
      cover_photo_url: r.thumbnail_key ? `${baseUrl}/files/${r.thumbnail_key}` : null,
      thumbnail_key: undefined,
    })),
  });
});

customerShortlistRoutes.post("/", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ listing_id?: string }>();

  if (!body.listing_id) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "listing_id required" } }, 422);
  }

  try {
    await c.env.DB.prepare(
      "INSERT INTO shortlists (id, user_id, listing_id, created_at) VALUES (?, ?, ?, ?)"
    )
      .bind(crypto.randomUUID(), payload.sub, body.listing_id, Date.now())
      .run();
    return c.json({ ok: true }, 201);
  } catch {
    return c.json({ error: { code: "CONFLICT", message: "Already shortlisted" } }, 409);
  }
});

customerShortlistRoutes.delete("/:listingId", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");
  const { listingId } = c.req.param();

  await c.env.DB.prepare("DELETE FROM shortlists WHERE user_id = ? AND listing_id = ?")
    .bind(payload.sub, listingId)
    .run();

  return c.json({ ok: true });
});
