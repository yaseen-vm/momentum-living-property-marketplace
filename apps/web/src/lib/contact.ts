import { isPlaceholder } from "./site";

// Contact links are built only from real values. Placeholders such as
// `[COMPANY PHONE]` return null so no fake tel:/mailto:/wa.me link is produced (spec §30).

export function telHref(phone: string | null | undefined): string | null {
  return phone && !isPlaceholder(phone) ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
}

export function mailHref(email: string | null | undefined): string | null {
  return email && !isPlaceholder(email) ? `mailto:${email.trim()}` : null;
}

export function whatsappHref(number: string | null | undefined, message?: string): string | null {
  if (!number || isPlaceholder(number)) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** External profile links (socials) must be real http(s) URLs. */
export function externalHref(url: string | null | undefined): string | null {
  return url && !isPlaceholder(url) && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}
