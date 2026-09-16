import { Hono } from "hono";
import type { Bindings, Variables } from "../types";

export const listingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

listingRoutes.get("/", async (c) => {
  const { type, location, min_price, max_price, min_size, sort, limit, offset } =
    c.req.query();

  const pageLimit = Math.min(parseInt(limit ?? "20", 10), 50);
  const pageOffset = parseInt(offset ?? "0", 10);

  const conditions: string[] = ["l.status = 'approved'"];
  const params: (string | number)[] = [];

  if (type) {
    conditions.push("l.type = ?");
    params.push(type);
  }
  if (location) {
    conditions.push("l.location_slug = ?");
    params.push(location);
  }
  if (min_price) {
    conditions.push("l.price >= ?");
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    conditions.push("l.price <= ?");
    params.push(parseFloat(max_price));
  }
  if (min_size) {
    conditions.push("l.size_sqft >= ?");
    params.push(parseInt(min_size, 10));
  }

  const where = conditions.join(" AND ");

  let orderBy = "l.published_at DESC";
  if (sort === "price_asc") orderBy = "l.price ASC";
  else if (sort === "price_desc") orderBy = "l.price DESC";

  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM listings l WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>();

  const rows = await c.env.DB.prepare(
    `SELECT l.id, l.type, l.title, l.price, l.currency, l.location_text,
            l.size_sqft, l.bedrooms, l.bathrooms, l.published_at,
            (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order ASC LIMIT 1) as thumbnail_key
     FROM listings l
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`
  )
    .bind(...params, pageLimit, pageOffset)
    .all<{
      id: string;
      type: string;
      title: string;
      price: number;
      currency: string;
      location_text: string;
      size_sqft: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      published_at: number | null;
      thumbnail_key: string | null;
    }>();

  const listings = rows.results.map((r) => ({
    ...r,
    cover_photo_url: r.thumbnail_key
      ? `${c.req.url.split("/listings")[0]}/upload/files/${r.thumbnail_key}`
      : null,
    thumbnail_key: undefined,
  }));

  return c.json({
    listings,
    total: countResult?.total ?? 0,
    limit: pageLimit,
    offset: pageOffset,
  });
});

listingRoutes.get("/:id", async (c) => {
  const { id } = c.req.param();

  const listing = await c.env.DB.prepare(
    `SELECT l.*, u.name as vendor_name
     FROM listings l
     JOIN vendor_profiles vp ON vp.id = l.vendor_id
     JOIN users u ON u.id = vp.user_id
     WHERE l.id = ? AND l.status = 'approved'`
  )
    .bind(id)
    .first<{
      id: string;
      type: string;
      title: string;
      description: string | null;
      price: number;
      currency: string;
      location_text: string;
      location_slug: string;
      latitude: number | null;
      longitude: number | null;
      size_sqft: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      amenities: string | null;
      published_at: number | null;
      vendor_name: string;
    }>();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }

  const photos = await c.env.DB.prepare(
    "SELECT r2_key, display_order FROM listing_photos WHERE listing_id = ? ORDER BY display_order ASC"
  )
    .bind(id)
    .all<{ r2_key: string; display_order: number }>();

  const baseUrl = c.req.url.split("/listings")[0];

  return c.json({
    ...listing,
    amenities: listing.amenities ? (JSON.parse(listing.amenities) as string[]) : [],
    photos: photos.results.map((p) => ({
      url: `${baseUrl}/upload/files/${p.r2_key}`,
      display_order: p.display_order,
    })),
  });
});
