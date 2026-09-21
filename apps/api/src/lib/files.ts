import { isPublicMediaKey } from "@momentum/shared";

// TODO(stage 6): replace with HMAC-signed, 1-hour URLs once file serving is locked down.
export function fileUrl(requestUrl: string, key: string): string {
  return `${new URL(requestUrl).origin}/upload/files/${key}`;
}

/** URL for a `public-media/*` object (agent photos, MD portrait); `null` for any other key. */
export function publicMediaUrl(requestUrl: string, key: string | null): string | null {
  return key && isPublicMediaKey(key) ? fileUrl(requestUrl, key) : null;
}
