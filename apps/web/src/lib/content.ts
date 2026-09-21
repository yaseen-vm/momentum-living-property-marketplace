import { useQuery } from "@tanstack/react-query";
import { DEFAULT_SITE_CONTENT } from "@momentum/shared";
import type { PublicAgent, SiteContent, SiteContentKey } from "@momentum/shared";
import { api } from "./api";

// Corporate content is small and rarely edited: fetch it once per visit.
const CONTENT_STALE_MS = 5 * 60_000;

function useAllContent() {
  return useQuery({
    queryKey: ["content"],
    queryFn: () => api.content.all(),
    staleTime: CONTENT_STALE_MS,
  });
}

/**
 * One `site_content` block. Missing fields fall back to the placeholder seed, so a
 * page always renders: with real content once loaded, placeholders if the API is down.
 */
export function useContent<K extends SiteContentKey>(key: K): { data: SiteContent[K]; isPending: boolean } {
  const { data, isPending } = useAllContent();
  return {
    data: { ...DEFAULT_SITE_CONTENT[key], ...data?.items[key] },
    isPending,
  };
}

export function useAgents(): { agents: PublicAgent[]; isPending: boolean; isError: boolean } {
  const { data, isPending, isError } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.agents.list(),
    staleTime: CONTENT_STALE_MS,
  });
  return { agents: data?.agents ?? [], isPending, isError };
}
