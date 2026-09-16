import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
export const adminBookingRoutes = new Hono();
adminBookingRoutes.get("/", requireAuth(["admin"]), async (c) => {
    const { status, from, to, limit, offset } = c.req.query();
    const pageLimit = Math.min(parseInt(limit ?? "20", 10), 100);
    const pageOffset = parseInt(offset ?? "0", 10);
    const conditions = [];
    const params = [];
    if (status) {
        conditions.push("b.status = ?");
        params.push(status);
    }
    if (from) {
        conditions.push("b.created_at >= ?");
        params.push(parseInt(from, 10));
    }
    if (to) {
        conditions.push("b.created_at <= ?");
        params.push(parseInt(to, 10));
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await c.env.DB.prepare(`SELECT b.id, b.status, b.admin_note, b.created_at, b.updated_at,
            b.customer_name as booking_customer_name, b.customer_email, b.customer_alt_mobile,
            cu.id as customer_id, cu.name as customer_name, cu.mobile as customer_mobile,
            l.id as listing_id, l.title as listing_title, l.type as listing_type,
            l.location_text as listing_location, l.price as listing_price, l.currency as listing_currency,
            l.size_sqft as listing_size, l.bedrooms as listing_bedrooms, l.bathrooms as listing_bathrooms,
            l.total_capacity as listing_total_capacity, l.num_rooms as listing_num_rooms,
            vu.id as vendor_id, vu.name as vendor_name, vu.mobile as vendor_mobile
     FROM bookings b
     JOIN users cu ON cu.id = b.customer_id
     JOIN listings l ON l.id = b.listing_id
     JOIN vendor_profiles vp ON vp.id = l.vendor_id
     JOIN users vu ON vu.id = vp.user_id
     ${where}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`)
        .bind(...params, pageLimit, pageOffset)
        .all();
    return c.json({
        bookings: rows.results.map((r) => ({
            id: r.id,
            status: r.status,
            admin_note: r.admin_note,
            created_at: r.created_at,
            updated_at: r.updated_at,
            customer: {
                id: r.customer_id,
                name: r.booking_customer_name ?? r.customer_name,
                mobile: r.customer_mobile,
                email: r.customer_email ?? null,
                alt_mobile: r.customer_alt_mobile ?? null,
            },
            listing: {
                id: r.listing_id,
                title: r.listing_title,
                type: r.listing_type,
                location_text: r.listing_location,
                price: r.listing_price,
                currency: r.listing_currency,
                size_sqft: r.listing_size ?? null,
                bedrooms: r.listing_bedrooms ?? null,
                bathrooms: r.listing_bathrooms ?? null,
                total_capacity: r.listing_total_capacity ?? null,
                num_rooms: r.listing_num_rooms ?? null,
            },
            vendor: { id: r.vendor_id, name: r.vendor_name, mobile: r.vendor_mobile },
        })),
    });
});
adminBookingRoutes.patch("/:id", requireAuth(["admin"]), async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const now = Date.now();
    const validStatuses = ["pending", "owner_confirmed", "customer_contacted", "closed"];
    if (body.status && !validStatuses.includes(body.status)) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid status" } }, 422);
    }
    await c.env.DB.prepare(`UPDATE bookings SET
      status = COALESCE(?, status),
      admin_note = COALESCE(?, admin_note),
      updated_at = ?
     WHERE id = ?`)
        .bind(body.status ?? null, body.note ?? null, now, id)
        .run();
    const updated = await c.env.DB.prepare("SELECT * FROM bookings WHERE id = ?")
        .bind(id)
        .first();
    if (!updated) {
        return c.json({ error: { code: "NOT_FOUND", message: "Booking not found" } }, 404);
    }
    return c.json(updated);
});
adminBookingRoutes.post("/:id/notes", requireAuth(["admin"]), async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    if (!body.body) {
        return c.json({ error: { code: "VALIDATION_ERROR", message: "body required" } }, 422);
    }
    const noteId = crypto.randomUUID();
    await c.env.DB.prepare("INSERT INTO booking_notes (id, booking_id, body, created_at) VALUES (?, ?, ?, ?)")
        .bind(noteId, id, body.body, Date.now())
        .run();
    return c.json({ note_id: noteId }, 201);
});
