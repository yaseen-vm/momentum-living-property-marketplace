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

uploadRoutes.post("/presign", requireAuth(["vendor", "admin"]), async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.json<{
    filename?: string;
    content_type?: string;
    context?: string;
  }>();

  if (!body.filename || !body.content_type || !body.context) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "filename, content_type, context required" } }, 422);
  }

  const isListingPhoto = body.context === "listing_photo";
  const isVendorDoc = body.context === "vendor_doc";

  if (!isListingPhoto && !isVendorDoc) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "context must be listing_photo or vendor_doc" } }, 422);
  }

  if (isListingPhoto && !ALLOWED_IMAGE_TYPES.has(body.content_type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid image content type" } }, 422);
  }
  if (isVendorDoc && !ALLOWED_DOC_TYPES.has(body.content_type)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid document content type" } }, 422);
  }

  const ext = extFromContentType(body.content_type);
  const folder = isListingPhoto ? "listing-photos" : "vendor-docs";
  const key = `${folder}/${payload.sub}/${crypto.randomUUID()}.${ext}`;

  const maxSize = isListingPhoto ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

  const uploadUrl = await (c.env.R2 as R2Bucket & {
    createPresignedUrl: (
      method: string,
      key: string,
      options: { expiresIn: number; contentType?: string; contentLengthRange?: { min: number; max: number } }
    ) => Promise<string>;
  }).createPresignedUrl("PUT", key, {
    expiresIn: 300,
    contentType: body.content_type,
    contentLengthRange: { min: 1, max: maxSize },
  });

  return c.json({ key, upload_url: uploadUrl });
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
