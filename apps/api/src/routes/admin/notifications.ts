import { Hono } from "hono";
import type { AdminNotificationsResponse } from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";

export const adminNotificationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminNotificationRoutes.use("*", requireAuth(["admin"]));

adminNotificationRoutes.get("/", async (c) => {
  const { unread } = c.req.query();

  const where = unread === "true" ? "WHERE read_at IS NULL" : "";

  const rows = await c.env.DB.prepare(
    `SELECT id, type, payload, read_at, created_at
     FROM admin_notifications ${where}
     ORDER BY created_at DESC
     LIMIT 50`
  ).all<{ id: string; type: string; payload: string; read_at: number | null; created_at: number }>();

  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM admin_notifications WHERE read_at IS NULL"
  ).first<{ cnt: number }>();

  return c.json({
    count: count?.cnt ?? 0,
    items: rows.results.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload) as Record<string, unknown>,
    })),
  } as AdminNotificationsResponse);
});

adminNotificationRoutes.post("/read-all", async (c) => {
  await c.env.DB.prepare("UPDATE admin_notifications SET read_at = ? WHERE read_at IS NULL").bind(Date.now()).run();
  return c.json({ ok: true });
});

adminNotificationRoutes.post("/:id/read", async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare("UPDATE admin_notifications SET read_at = ? WHERE id = ?")
    .bind(Date.now(), id)
    .run();
  return c.json({ ok: true });
});
