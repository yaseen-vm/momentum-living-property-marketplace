import type { AgentType } from "@momentum/shared";

interface AgentRunInput {
  agentType: AgentType;
  userId: string | null;
  /** Logged as JSON. Never include OTP codes, full requirements or unmasked mobiles. */
  input: Record<string, unknown>;
}

/**
 * Audit wrapper for async agent tasks (agent-spec.md, "General Rules"):
 * insert an `agent_runs` row, run the task, then record completed/failed.
 * Call inside `executionCtx.waitUntil()`; it never throws.
 */
export async function runAgent(
  db: D1Database,
  { agentType, userId, input }: AgentRunInput,
  task: () => Promise<Record<string, unknown> | void>
): Promise<void> {
  const runId = crypto.randomUUID();
  try {
    await db
      .prepare(
        "INSERT INTO agent_runs (id, user_id, agent_type, status, input, started_at) VALUES (?, ?, ?, 'running', ?, ?)"
      )
      .bind(runId, userId, agentType, JSON.stringify(input), Date.now())
      .run();
  } catch (err) {
    console.error(`agent_runs insert failed (${agentType})`, err);
  }

  try {
    const output = await task();
    await db
      .prepare("UPDATE agent_runs SET status = 'completed', output = ?, completed_at = ? WHERE id = ?")
      .bind(output ? JSON.stringify(output) : null, Date.now(), runId)
      .run();
  } catch (err) {
    console.error(`agent ${agentType} failed`, err);
    await db
      .prepare("UPDATE agent_runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?")
      .bind(err instanceof Error ? err.message : String(err), Date.now(), runId)
      .run()
      .catch(() => undefined);
  }
}

/** `+971501234567` → `+97150•••4567` for logs. */
export function maskMobile(mobile: string): string {
  return mobile.length > 9 ? `${mobile.slice(0, 6)}•••${mobile.slice(-4)}` : "•••";
}
