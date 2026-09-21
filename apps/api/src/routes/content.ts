import { Hono } from "hono";
import { isSiteContentKey } from "@momentum/shared";
import type { ContentAllResponse, ContentItemResponse, SiteContent, SiteContentKey } from "@momentum/shared";
import type { Bindings, Variables } from "../types";

export const contentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Corporate content changes rarely; let the edge and browser cache it briefly.
const CACHE_CONTROL = "public, max-age=300";

interface ContentRow {
  key: string;
  value: string;
  updated_at: number;
}

// All public keys in one response (loaded once per visit by the SPA).
contentRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT key, value, updated_at FROM site_content").all<ContentRow>();

  const items: Record<string, unknown> = {};
  for (const row of rows.results) {
    if (isSiteContentKey(row.key)) items[row.key] = JSON.parse(row.value);
  }
  const body = { items } as ContentAllResponse;

  c.header("Cache-Control", CACHE_CONTROL);
  return c.json(body);
});

contentRoutes.get("/:key", async (c) => {
  const key = c.req.param("key");
  if (!isSiteContentKey(key)) {
    return c.json({ error: { code: "NOT_FOUND", message: "Unknown content key" } }, 404);
  }

  const row = await c.env.DB.prepare("SELECT key, value, updated_at FROM site_content WHERE key = ?")
    .bind(key)
    .first<ContentRow>();
  if (!row) {
    return c.json({ error: { code: "NOT_FOUND", message: "Content not found" } }, 404);
  }

  const body: ContentItemResponse<SiteContentKey> = {
    key,
    value: JSON.parse(row.value) as SiteContent[SiteContentKey],
    updated_at: row.updated_at,
  };

  c.header("Cache-Control", CACHE_CONTROL);
  return c.json(body);
});
