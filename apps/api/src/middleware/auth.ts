import { createMiddleware } from "hono/factory";
import type { Role } from "@momentum/shared";
import { verifyJwt } from "../lib/jwt";
import type { Bindings, Variables } from "../types";

export function requireAuth(roles?: Role[]) {
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Missing token" } }, 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyJwt(token, c.env.JWT_SECRET);
    if (!payload) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }, 401);
    }
    if (roles && roles.length > 0 && !roles.includes(payload.role)) {
      return c.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, 403);
    }
    c.set("jwtPayload", payload);
    await next();
  });
}
