import { Hono } from "hono";
import { DEFAULT_SITE_CONTENT, SITE_CONTENT_KEYS, SITE_CONTENT_SCHEMAS, isSiteContentKey } from "@momentum/shared";
import type { AdminContentItem, AdminContentResponse, SiteContentKey } from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { errorBody, readJson, validationError } from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminContentRoutes = new Hono<Env>();

adminContentRoutes.use("*", requireAuth(["admin"]));

// Every key, uncached. A missing row falls back to the placeholder seed (updated_at = null).
adminContentRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT key, value, updated_at FROM site_content").all<{
    key: string;
    value: string;
    updated_at: number;
  }>();
  const stored = new Map(rows.results.map((r) => [r.key, r]));

  const items = {} as Record<SiteContentKey, AdminContentItem>;
  for (const key of SITE_CONTENT_KEYS) {
    const row = stored.get(key);
    items[key] = {
      value: { ...DEFAULT_SITE_CONTENT[key], ...(row ? (JSON.parse(row.value) as object) : {}) },
      updated_at: row?.updated_at ?? null,
    } as AdminContentItem;
  }

  const body = { items } as AdminContentResponse;
  return c.json(body);
});

// Public pages read GET /content with a 5-minute cache, so an edit can take that long to show.
adminContentRoutes.put("/:key", async (c) => {
  const key = c.req.param("key");
  if (!isSiteContentKey(key)) return c.json(errorBody("NOT_FOUND", "Unknown content key"), 404);

  const body = (await readJson(c.req)) as { value?: unknown } | null;
  const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(body?.value);
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO site_content (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  )
    .bind(key, JSON.stringify(parsed.data), c.get("jwtPayload").sub, now)
    .run();

  const item: AdminContentItem = { value: parsed.data, updated_at: now };
  return c.json(item);
});
