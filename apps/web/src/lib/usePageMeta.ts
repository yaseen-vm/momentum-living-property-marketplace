import { useEffect } from "react";
import { BRAND } from "./site";

interface PageMeta {
  /** Page-specific title; the brand suffix is added automatically. */
  title?: string;
  description?: string;
  /** Private pages (availability results/details) must not be indexed. */
  noindex?: boolean;
}

const DEFAULT_TITLE = `${BRAND.name} | Labour Accommodation Specialists | ${BRAND.domain}`;

function setMeta(name: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Per-route <title> and meta description (spec §24).
 * Client-side only; build-time prerendering is part of the SEO stage.
 */
export function usePageMeta({ title, description, noindex = false }: PageMeta) {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND.name}` : DEFAULT_TITLE;
    if (description) setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : null);
  }, [title, description, noindex]);
}
