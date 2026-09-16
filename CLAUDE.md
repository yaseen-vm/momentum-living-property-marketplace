# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This is currently a **documentation-only repository**. No application code exists yet. All architecture decisions, requirements, and API contracts are documented in `docs/`. Development should follow the decisions recorded there before writing any code.

## Documentation Map

| File | Purpose |
|------|---------|
| `docs/requirements.md` | Canonical product requirements and user flows — read this first |
| `docs/techstack.md` | Technology decisions with rationale; includes free-tier limits |
| `docs/architecture.md` | System diagram, component roles, all request flows |
| `docs/data-model.md` | D1 SQLite schema, KV key patterns, R2 key conventions, Vectorize indexes |
| `docs/api-spec.md` | Full REST API contract with request/response shapes |
| `docs/agent-spec.md` | Async agent tasks (OTP, notifications, moderation, CSV export, embeddings) |
| `docs/job-sources.md` | Listing provider adapter interface for external feed ingestion |
| `docs/security.md` | JWT auth, OTP security, R2 access rules, AWS/Bedrock constraints |
| `docs/roadmap.md` | Phase 1 (v1 scope) through Phase 4; free-tier constraints per phase |
| `quotation-LNG-2026-WD-003.md` | Original client quotation — scope, costs, timeline |

## Planned Stack (when code is added)

- **Frontend:** React 18 + TypeScript + Vite — static SPA deployed on **Cloudflare Pages**
- **Backend:** TypeScript + **Hono** on **Cloudflare Workers** (V8 native, no Node.js)
- **Database:** **Cloudflare D1** (SQLite) — sole relational store; no PostgreSQL
- **Cache / rate-limit:** **Cloudflare KV** — OTP counters only, not primary data
- **Files:** **Cloudflare R2** — private bucket; vendor documents and listing photos
- **Auth:** Custom JWT HS256; `crypto.randomUUID()` for all IDs; `crypto.getRandomValues()` for OTPs
- **SMS:** MSG91 REST API
- **Email:** Resend + React Email
- **Package manager:** pnpm with workspaces monorepo

## Planned Monorepo Layout

```
apps/
  web/          # React + Vite SPA (Cloudflare Pages)
  api/          # Hono Worker — all REST routes
  ingestion/    # Standalone cron Worker — listing feed adapters
```

## Key Architectural Rules

**Cloudflare Workers constraints**
- All request-path code must complete within the **10 ms CPU limit**
- Async work (OTP send, email, moderation emails, CSV streaming) runs via `ctx.waitUntil()` — never blocking the response
- No `node:` built-ins; use Web APIs (`crypto`, `fetch`, `ReadableStream`)

**D1 / data layer**
- Every hot query path must have a covering index — see `docs/data-model.md` for the defined indexes
- All primary keys: `crypto.randomUUID()` (TEXT UUID)
- All timestamps: Unix milliseconds (INTEGER), not ISO strings
- JSON arrays/objects stored as `TEXT` columns (SQLite has no native array type)
- KV is for OTP rate-limit counters and config only — never primary application data

**Auth**
- JWT HS256 signed with `JWT_SECRET` (Workers Secret)
- JWT payload: `{ sub: userId, role, mobile_verified: bool, exp }`
- Role is read from the JWT on every request — never from query params or request body
- Vendor routes additionally check `vendor_profiles.status = approved` in D1

**R2 files**
- All R2 objects are in a private bucket — never public-by-key
- Listing photos served via short-lived presigned GET URLs (1-hour TTL)
- Upload flow: client calls `POST /upload/presign` → gets a presigned PUT URL → uploads directly to R2 → sends R2 key in the listing form body

**Agents**
- All async tasks follow the pattern in `docs/agent-spec.md`: create an `agent_runs` row in D1 (status: pending), run via `waitUntil`, update status on completion/failure
- External content (listing descriptions, vendor text) passed to any LLM must be in XML-delimited user-turn messages — never interpolated into the system prompt

## User Flows (quick reference)

```
Owner:   landing → OTP verify → fill details form → pending
         → [admin approves] → dashboard → submit listing
         → [admin approves listing] → listing goes live

Customer: landing → OTP verify → browse/search → listing detail
          → "Book" button → [admin notified with both contacts]
          → admin handles offline

Admin:   owner verification queue → listing approval queue
         → booking requests panel → CSV export (customers / owners)
```

## Git Workflow

**Before every commit:** run linting and fix all errors before staging.
```bash
pnpm lint          # from repo root (runs ESLint across all workspaces)
pnpm typecheck     # tsc --noEmit across all workspaces
```

**Commit messages:** one short imperative line, 50 characters or fewer.
```
Add OTP rate-limit KV helper
Fix listing status update in D1
Remove unused vendor type field
```
No bullet bodies, no multi-paragraph descriptions — the diff speaks for itself.

---

## Secrets (Wrangler)

Never in source control. Set via `wrangler secret put`:
`JWT_SECRET`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `RESEND_API_KEY`, `ADMIN_EMAIL`

Local dev values go in `apps/api/.dev.vars` (gitignored).
