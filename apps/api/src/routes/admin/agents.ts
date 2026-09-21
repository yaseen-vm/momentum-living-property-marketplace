import { Hono } from "hono";
import { agentSchema, agentUpdateSchema } from "@momentum/shared";
import type { AdminAgent, AdminAgentsResponse } from "@momentum/shared";
import type { Bindings, Variables } from "../../types";
import { requireAuth } from "../../middleware/auth";
import { publicMediaUrl } from "../../lib/files";
import { errorBody, readJson, validationError } from "../../lib/validation";

type Env = { Bindings: Bindings; Variables: Variables };

export const adminAgentRoutes = new Hono<Env>();

adminAgentRoutes.use("*", requireAuth(["admin"]));

const agentNotFound = errorBody("NOT_FOUND", "Agent not found");

type AgentRow = Omit<AdminAgent, "languages" | "photo_key" | "photo_url" | "is_active"> & {
  languages: string;
  photo_r2_key: string | null;
  is_active: number;
};

const AGENT_SELECT = `SELECT a.id, a.name, a.position, a.specialization, a.languages, a.phone, a.email, a.whatsapp,
    a.photo_r2_key, a.bio, a.display_order, a.is_active, a.created_at, a.updated_at,
    (SELECT COUNT(*) FROM enquiries WHERE assigned_agent_id = a.id) AS lead_count,
    (SELECT COUNT(*) FROM listings WHERE assigned_agent_id = a.id) AS property_count
  FROM agents a`;

function toAgent(requestUrl: string, { languages, photo_r2_key, is_active, ...row }: AgentRow): AdminAgent {
  return {
    ...row,
    languages: JSON.parse(languages) as string[],
    photo_key: photo_r2_key,
    photo_url: publicMediaUrl(requestUrl, photo_r2_key),
    is_active: !!is_active,
  };
}

async function loadAgent(db: D1Database, requestUrl: string, id: string): Promise<AdminAgent | null> {
  const row = await db.prepare(`${AGENT_SELECT} WHERE a.id = ?`).bind(id).first<AgentRow>();
  return row ? toAgent(requestUrl, row) : null;
}

/** Schema field → `agents` column. */
const COLUMNS = {
  name: "name",
  position: "position",
  specialization: "specialization",
  languages: "languages",
  phone: "phone",
  email: "email",
  whatsapp: "whatsapp",
  photo_key: "photo_r2_key",
  bio: "bio",
  display_order: "display_order",
  is_active: "is_active",
} as const;
type Field = keyof typeof COLUMNS;

function toDb(field: Field, value: unknown): string | number | null {
  if (field === "languages") return JSON.stringify(value ?? []);
  if (field === "is_active") return value ? 1 : 0;
  return (value ?? null) as string | number | null;
}

// All agents, including inactive ones (kept for lead history).
adminAgentRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare(`${AGENT_SELECT} ORDER BY a.is_active DESC, a.display_order, a.name`).all<AgentRow>();
  const body: AdminAgentsResponse = { agents: rows.results.map((r) => toAgent(c.req.url, r)) };
  return c.json(body);
});

adminAgentRoutes.post("/", async (c) => {
  const parsed = agentSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const id = crypto.randomUUID();
  const now = Date.now();
  const fields = Object.keys(COLUMNS) as Field[];
  await c.env.DB.prepare(
    `INSERT INTO agents (id, ${fields.map((f) => COLUMNS[f]).join(", ")}, created_at, updated_at)
     VALUES (?, ${fields.map(() => "?").join(", ")}, ?, ?)`
  )
    .bind(id, ...fields.map((f) => toDb(f, parsed.data[f])), now, now)
    .run();

  return c.json(await loadAgent(c.env.DB, c.req.url, id), 201);
});

adminAgentRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = agentUpdateSchema.safeParse(await readJson(c.req));
  if (!parsed.success) return c.json(validationError(parsed.error), 422);

  const fields = (Object.keys(COLUMNS) as Field[]).filter((f) => parsed.data[f] !== undefined);
  const result = await c.env.DB.prepare(
    `UPDATE agents SET ${[...fields.map((f) => `${COLUMNS[f]} = ?`), "updated_at = ?"].join(", ")} WHERE id = ?`
  )
    .bind(...fields.map((f) => toDb(f, parsed.data[f])), Date.now(), id)
    .run();
  if (!result.meta.changes) return c.json(agentNotFound, 404);

  return c.json(await loadAgent(c.env.DB, c.req.url, id));
});

// Hard delete only when nothing references the agent; otherwise deactivate instead.
adminAgentRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const agent = await loadAgent(c.env.DB, c.req.url, id);
  if (!agent) return c.json(agentNotFound, 404);
  if (agent.lead_count > 0 || agent.property_count > 0) {
    return c.json(
      errorBody("CONFLICT", "This agent is assigned to leads or properties. Deactivate the agent instead."),
      409
    );
  }

  await c.env.DB.prepare("DELETE FROM agents WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
