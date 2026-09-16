import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { notifyAdminNewBooking } from "../../agents/notification";

export const customerBookingRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

customerBookingRoutes.post("/", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    listing_id?: string;
    name?: string;
    email?: string;
    alt_mobile?: string;
  }>();

  if (!body.listing_id) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "listing_id required" } }, 422);
  }
  if (!body.name || !body.email) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "name and email are required" } }, 422);
  }

  const listing = await c.env.DB.prepare(
    `SELECT l.id, l.title, l.type, l.location_text, l.status,
            vp.id as vendor_profile_id,
            u.name as vendor_name, u.mobile as vendor_mobile
     FROM listings l
     JOIN vendor_profiles vp ON vp.id = l.vendor_id
     JOIN users u ON u.id = vp.user_id
     WHERE l.id = ?`
  )
    .bind(body.listing_id)
    .first<{
      id: string;
      title: string;
      type: string;
      location_text: string;
      status: string;
      vendor_profile_id: string;
      vendor_name: string;
      vendor_mobile: string;
    }>();

  if (!listing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Listing not found" } }, 404);
  }
  if (listing.status !== "approved") {
    return c.json({ error: { code: "FORBIDDEN", message: "Listing not available" } }, 403);
  }

  const existing = await c.env.DB.prepare(
    "SELECT id FROM bookings WHERE customer_id = ? AND listing_id = ?"
  )
    .bind(payload.sub, body.listing_id)
    .first<{ id: string }>();

  if (existing) {
    return c.json({ error: { code: "CONFLICT", message: "Already booked this listing" } }, 409);
  }

  const customer = await c.env.DB.prepare("SELECT name, mobile FROM users WHERE id = ?")
    .bind(payload.sub)
    .first<{ name: string; mobile: string }>();

  const bookingId = crypto.randomUUID();
  const now = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO bookings (id, customer_id, listing_id, status, customer_name, customer_email, customer_alt_mobile, created_at, updated_at) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)"
  )
    .bind(bookingId, payload.sub, body.listing_id, body.name, body.email, body.alt_mobile ?? null, now, now)
    .run();

  c.executionCtx.waitUntil(
    (async () => {
      await c.env.DB.prepare(
        "INSERT INTO admin_notifications (id, type, payload, created_at) VALUES (?, 'new_booking', ?, ?)"
      )
        .bind(
          crypto.randomUUID(),
          JSON.stringify({ booking_id: bookingId, listing_id: body.listing_id }),
          now
        )
        .run();

      await notifyAdminNewBooking(
        {
          bookingId,
          customerName: body.name!,
          customerMobile: customer?.mobile ?? "",
          customerEmail: body.email!,
          customerAltMobile: body.alt_mobile ?? null,
          listingTitle: listing.title,
          listingType: listing.type,
          locationText: listing.location_text,
          vendorName: listing.vendor_name,
          vendorMobile: listing.vendor_mobile,
        },
        c.env
      );
    })()
  );

  return c.json({ booking_id: bookingId }, 201);
});

customerBookingRoutes.get("/", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");

  const rows = await c.env.DB.prepare(
    `SELECT b.id, b.status, b.created_at,
            l.id as listing_id, l.title, l.type, l.location_text,
            (SELECT r2_key FROM listing_photos WHERE listing_id = l.id ORDER BY display_order LIMIT 1) as thumbnail_key
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     WHERE b.customer_id = ?
     ORDER BY b.created_at DESC`
  )
    .bind(payload.sub)
    .all<{
      id: string;
      status: string;
      created_at: number;
      listing_id: string;
      title: string;
      type: string;
      location_text: string;
      thumbnail_key: string | null;
    }>();

  const baseUrl = new URL(c.req.url).origin;

  return c.json({
    bookings: rows.results.map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      listing: {
        id: r.listing_id,
        title: r.title,
        type: r.type,
        location_text: r.location_text,
        cover_photo_url: r.thumbnail_key ? `${baseUrl}/files/${r.thumbnail_key}` : null,
      },
    })),
  });
});
