import type { ZodError } from "zod";

/** `422 VALIDATION_ERROR` body; the message is prefixed with the failing field. */
export function validationError(error: ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: issue ? (field ? `${field}: ${issue.message}` : issue.message) : "Invalid request",
    },
  };
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/** Request JSON, or `null` when the body is missing or malformed (Zod then rejects it). */
export async function readJson(req: { json: () => Promise<unknown> }): Promise<unknown> {
  return req.json().catch(() => null);
}

/** `limit` (1–100, default 20) and `offset` query params. */
export function pageParams(query: Record<string, string>): { limit: number; offset: number } {
  const limit = parseInt(query["limit"] ?? "", 10);
  const offset = parseInt(query["offset"] ?? "", 10);
  return {
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20,
    offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
  };
}

/** Optional Unix-ms query param; `undefined` when absent, `NaN` when malformed. */
export function msParam(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  return /^\d+$/.test(value) ? Number(value) : NaN;
}

/** `%term%` for a `LIKE … ESCAPE '\'` search, with LIKE wildcards in the term escaped. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE/i.test(err.message);
}
