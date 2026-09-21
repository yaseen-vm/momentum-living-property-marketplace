# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

Application code exists (`apps/web`, `apps/api`, `apps/ingestion`, `packages/shared`). It was built for the **original marketplace scope** (quotation LNG-2026-WD-003). The client has since supplied a new build specification: a corporate site plus a private Availability journey. The **docs describe the new target system**, and `docs/implementation-status.md` records what is built, partial, pending or legacy. Read it before starting any task.

## Documentation Map

| File | Purpose |
|------|---------|
| `docs/implementation-status.md` | Built vs pending vs legacy, gap analysis against the client spec. Read this first |
| `docs/requirements.md` | Canonical product requirements and user flows (from the client build spec) |
| `docs/techstack.md` | Technology decisions with rationale; includes free-tier limits |
| `docs/architecture.md` | System diagram, component roles, all request flows |
| `docs/data-model.md` | D1 SQLite schema, KV key patterns, R2 key conventions, Vectorize indexes |
| `docs/api-spec.md` | Full REST API contract with request/response shapes |
| `docs/agent-spec.md` | Async agent tasks (OTP, lead notifications, CSV export, embeddings) |
| `docs/job-sources.md` | Listing provider adapter interface for external feed ingestion |
| `docs/security.md` | JWT auth, OTP security, R2 access rules, AWS/Bedrock constraints |
| `docs/roadmap.md` | Phase 1 (v1 scope) through Phase 4; free-tier constraints per phase |
| `quotation-LNG-2026-WD-003.md` | Original client quotation. Its scope was superseded by the client build spec |

## Stack

- **Frontend:** React 18 + TypeScript + Vite — static SPA deployed on **Cloudflare Pages**
- **Backend:** TypeScript + **Hono** on **Cloudflare Workers** (V8 native, no Node.js)
- **Database:** **Cloudflare D1** (SQLite) — sole relational store; no PostgreSQL
- **Cache / rate-limit:** **Cloudflare KV** — OTP counters only, not primary data
- **Files:** **Cloudflare R2** — private bucket; listing photos, corporate media (agent photos, MD portrait), enquiry documents
- **Auth:** Custom JWT HS256; `crypto.randomUUID()` for all IDs; `crypto.getRandomValues()` for OTPs
- **SMS:** MSG91 REST API
- **Email:** Resend + React Email
- **Package manager:** pnpm with workspaces monorepo

## Monorepo Layout

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
- Role is read from the JWT on every request, never from query params or request body
- Roles: `customer` (= availability enquirer), `admin`; `vendor` is legacy
- Availability results/details are gated server-side: enquiry owned by `jwt.sub`, `stage = completed`, listing present in `lead_matches`

**R2 files**
- All R2 objects are in a private bucket — never public-by-key
- `public-media/*` (agent photos, corporate imagery) is served publicly by the Worker; every other prefix needs an HMAC-signed URL with a 1-hour TTL
- Upload flow: multipart `POST /upload/file` through the Worker → R2 key returned → key sent in the form body

**Agents**
- All async tasks follow the pattern in `docs/agent-spec.md`: create an `agent_runs` row in D1 (status: pending), run via `waitUntil`, update status on completion/failure
- External content (listing descriptions, vendor text) passed to any LLM must be in XML-delimited user-turn messages — never interpolated into the system prompt

## User Flows (quick reference)

```
Visitor:  corporate pages (Home, About, MD, MD Note, Agents, Why Us, Contact)
          → NO inventory anywhere → chat with an agent

Enquirer: AVAILABILITY → user type → details + consent → OTP verify
          → requirements → [matching + lead created + admin notified]
          → matched opportunities → detail → request info / viewing / chat

Admin:    leads (assign agent, 8 statuses, notes) → properties/opportunities
          → agents → corporate content → export / reports
```

**Strict no-listing rule:** corporate pages must never render property cards, prices, counts or "browse" CTAs. The only way into inventory is AVAILABILITY.

## Docs Are the Source of Truth

The `docs/` folder must stay in sync with the code at all times. If a code change affects anything documented, update the relevant doc file in the **same commit** — never after.

| If you change… | Update… |
|----------------|---------|
| A D1 table, column, or index | `docs/data-model.md` |
| An API route, request shape, or response shape | `docs/api-spec.md` |
| An async agent task or its tools | `docs/agent-spec.md` |
| A listing provider adapter | `docs/job-sources.md` |
| The tech stack, a library swap, or a Cloudflare service | `docs/techstack.md` |
| System components, request flows, or deployment topology | `docs/architecture.md` |
| Auth, secrets, file access, or security rules | `docs/security.md` |
| A user-facing feature or flow | `docs/requirements.md` |
| A phase milestone or backlog item | `docs/roadmap.md` |
| Anything that moves an item from pending to built | `docs/implementation-status.md` |

A commit that adds a new feature or changes behaviour without updating the matching doc is incomplete. Code and docs must always describe the same system.

---

## Source vs Compiled Files — IMPORTANT

Each workspace has both TypeScript source files (`.ts` / `.tsx`) and compiled JavaScript output (`.js`) **in the same `src/` directories**. The CI build compiles the TypeScript and overwrites the JS files on every deploy.

**Always edit the `.ts` / `.tsx` source files. Never edit the `.js` files directly — they will be overwritten by the next build.**

| Workspace | Source to edit | Compiled output (do not edit) |
|-----------|---------------|-------------------------------|
| `apps/api/src/**` | `*.ts` | `*.js` (same path, overwritten by build) |
| `apps/web/src/**` | `*.tsx` / `*.ts` | `*.js` (same path, overwritten by build) |
| `apps/ingestion/src/**` | `*.ts` | `*.js` (same path, overwritten by build) |

---

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
