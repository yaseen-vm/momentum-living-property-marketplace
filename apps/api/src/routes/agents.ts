import { Hono } from "hono";
import type { AgentsResponse } from "@momentum/shared";
import type { Bindings, Variables } from "../types";
import { publicMediaUrl } from "../lib/files";

export const agentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface AgentRow {
  id: string;
  name: string;
  position: string;
  specialization: string | null;
  languages: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_r2_key: string | null;
  bio: string | null;
}

// Active agents in display order. Covered by idx_agents_active_order.
agentRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, name, position, specialization, languages, phone, email, whatsapp, photo_r2_key, bio
     FROM agents
     WHERE is_active = 1
     ORDER BY display_order`
  ).all<AgentRow>();

  // Agent photos live under public-media/, which the upload route serves without a signature.
  const body: AgentsResponse = {
    agents: rows.results.map(({ photo_r2_key, languages, ...agent }) => ({
      ...agent,
      languages: JSON.parse(languages) as string[],
      photo_url: publicMediaUrl(c.req.url, photo_r2_key),
    })),
  };

  c.header("Cache-Control", "public, max-age=300");
  return c.json(body);
});
