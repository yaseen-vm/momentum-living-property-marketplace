import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

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
  const context = formData.get("context") as string | null;
  const file = formData.get("file") as File | null;

  if (!context || !file) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "context and file are required" } }, 422);
  }

  const isListingPhoto = context === "listing_photo";
  const isVendorDoc = context === "vendor_doc";

  if (!isListingPhoto && !isVendorDoc) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "context must be listing_photo or vendor_doc" } }, 422);
  }

  const contentType = file.type;

  if (isListingPhoto && !ALLOWED_IMAGE_TYPES.has(contentType)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Listing photos must be JPEG, PNG, or WebP" } }, 422);
  }
  if (isVendorDoc && !ALLOWED_DOC_TYPES.has(contentType)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Documents must be PDF, JPEG, or PNG" } }, 422);
  }

  const maxSize = isListingPhoto ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    const limit = isListingPhoto ? "10 MB" : "5 MB";
    return c.json({ error: { code: "VALIDATION_ERROR", message: `File exceeds ${limit} limit` } }, 422);
  }

  const ext = extFromContentType(contentType);
  const folder = isListingPhoto ? "listing-photos" : "vendor-docs";
  const key = `${folder}/${payload.sub}/${crypto.randomUUID()}.${ext}`;

  const buffer = await file.arrayBuffer();
  await c.env.R2.put(key, buffer, { httpMetadata: { contentType } });

  return c.json({ key });
});

uploadRoutes.get("/files/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.R2.get(key);
  if (!obj) {
    return c.json({ error: { code: "NOT_FOUND", message: "File not found" } }, 404);
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(obj.body, { headers });
});
