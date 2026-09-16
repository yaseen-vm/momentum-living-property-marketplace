import { Hono } from "hono";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const customerProfileRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

customerProfileRoutes.get("/profile", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");

  const user = await c.env.DB.prepare(
    "SELECT id, name, mobile, mobile_verified_at FROM users WHERE id = ?"
  )
    .bind(payload.sub)
    .first<{ id: string; name: string; mobile: string; mobile_verified_at: number | null }>();

  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "User not found" } }, 404);
  }

  return c.json(user);
});

customerProfileRoutes.put("/profile", requireAuth(["customer"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{ name?: string }>();

  if (!body.name) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "name required" } }, 422);
  }

  await c.env.DB.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?")
    .bind(body.name, Date.now(), payload.sub)
    .run();

  return c.json({ ok: true });
});
