import { Hono } from "hono";
import type { Role } from "@momentum/shared";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

/** Upload contexts: who may use each, what it accepts, and where it lands in R2. */
const CONTEXTS: Record<string, { roles: Role[]; types: Set<string>; maxBytes: number; folder: string }> = {
  listing_photo: { roles: ["admin", "vendor"], types: ALLOWED_IMAGE_TYPES, maxBytes: 10 * 1024 * 1024, folder: "listing-photos" },
  public_media: { roles: ["admin"], types: ALLOWED_IMAGE_TYPES, maxBytes: 10 * 1024 * 1024, folder: "public-media" },
  vendor_doc: { roles: ["vendor", "admin"], types: ALLOWED_DOC_TYPES, maxBytes: 5 * 1024 * 1024, folder: "vendor-docs" },
};

/** `public-media/{area}/…` areas. */
const PUBLIC_MEDIA_AREAS = new Set(["agents", "md", "site"]);

function extFromContentType(ct: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return map[ct] ?? "bin";
}

// Upload a file directly through the Worker → R2
uploadRoutes.post("/file", requireAuth(["vendor", "admin"]), async (c) => {
  const payload = c.get("jwtPayload");

  const formData = await c.req.formData();
  const contextName = formData.get("context") as string | null;
  const file = formData.get("file") as File | null;

  if (!contextName || !file) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "context and file are required" } }, 422);
  }

  const context = CONTEXTS[contextName];
  if (!context) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: `context must be one of: ${Object.keys(CONTEXTS).join(", ")}` } },
      422
    );
  }
  if (!context.roles.includes(payload.role)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, 403);
  }

  if (!context.types.has(file.type)) {
    const allowed = context.types === ALLOWED_IMAGE_TYPES ? "JPEG, PNG, or WebP" : "PDF, JPEG, or PNG";
    return c.json({ error: { code: "VALIDATION_ERROR", message: `File must be ${allowed}` } }, 422);
  }
  if (file.size > context.maxBytes) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: `File exceeds ${context.maxBytes / (1024 * 1024)} MB limit` } },
      422
    );
  }

  // public-media keys are grouped by area; the other folders by uploader.
  let scope = payload.sub;
  if (contextName === "public_media") {
    const area = formData.get("area");
    if (typeof area !== "string" || !PUBLIC_MEDIA_AREAS.has(area)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "area must be agents, md or site" } }, 422);
    }
    scope = area;
  }

  const key = `${context.folder}/${scope}/${crypto.randomUUID()}.${extFromContentType(file.type)}`;
  await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

  return c.json({ key }, 201);
});

uploadRoutes.get("/files/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.R2.get(key);
  if (!obj) {
    return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  // public-media objects are write-once (new key per upload), so they cache for a day.
  headers.set("Cache-Control", key.startsWith("public-media/") ? "public, max-age=86400" : "public, max-age=3600");
  return new Response(obj.body, { headers });
});
