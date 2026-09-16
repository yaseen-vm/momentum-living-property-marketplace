# Technology Decisions

## Architecture

Cloud-native, API-first architecture running entirely on the Cloudflare free tier. Frontend and backend are separately deployable. No SSR runtime, no managed database outside Cloudflare, no paid hosting. The only non-Cloudflare runtime dependency is Amazon Bedrock (pay-per-use LLM, v2 only).

---

## Frontend

- **React + TypeScript + Vite** — single-page application; outputs pure static files with no SSR runtime
- **Tailwind CSS** — UI styling
- **shadcn/ui** — accessible component primitives built on Radix UI; source is copied into the project (no lock-in)
- **Cloudflare Pages** — frontend deployment and global CDN delivery; serves the Vite `dist/` output directly with no adapter required
  - Free tier: 500 builds/month, 1 concurrent build, 20,000 files/project

Three portals (public, vendor, admin) live in one SPA codebase, gated by JWT role at the React Router level and re-verified server-side on every API request.

---

## Backend

- **TypeScript + Hono** — backend language and web framework running natively on the Cloudflare Workers V8 runtime
  - Hono is purpose-built for Cloudflare Workers: typed routing, middleware, and first-class binding helpers for D1, KV, R2
  - Native V8 execution — no WASM, no cold-start overhead
  - Shared TypeScript types between frontend and backend via a monorepo workspace
- **REST API** — primary client-facing contract, served from a single Hono Worker
- **Async work** — OTP dispatch, email notifications, and moderation hooks run via `waitUntil` inside the API Worker; no separate queue consumers needed at v1 scale

---

## Cloudflare Services (Free Tier)

| Service | Role | Free Tier Limit |
|---------|------|----------------|
| **Workers** | API handlers, agent execution, async tasks | 100,000 req/day, 10 ms CPU/invocation |
| **Pages** | Frontend hosting (React + Vite SPA) | 500 builds/month, 20,000 files/project |
| **D1** | Primary relational database (SQLite-compatible) | 5 GB storage, 5 M rows read/day, 100,000 rows written/day |
| **KV** | OTP rate-limit state, session cache, config | 100,000 reads/day, 1,000 writes/day, 1 GB storage |
| **R2** | Listing photos, vendor documents | 10 GB storage/month, free egress, 1 M Class A ops/month |
| **Workers AI** | Embedding generation (v2 semantic search) | 10,000 Neurons/day |
| **Vectorize** | Semantic listing search (v2) | Included in Workers free plan |
| **Workers Logs** | Structured logging and observability | 200,000 events/day, 3-day retention |

**External services:** MSG91 (SMS OTP, client pays directly), Resend (transactional email, free tier 100/day), Amazon Bedrock (Claude — v2 AI moderation, pay-per-use).

**Services not used:** Vercel, Neon, Supabase, PlanetScale, Hyperdrive, Cloudflare Containers — either paid-only or require external hosting. No PostgreSQL at v1.

---

## Data Layer

- **D1** — sole relational database. SQLite-compatible; all structured application data (users, vendors, listings, enquiries, OTP tokens, notifications)
- **KV** — OTP rate-limit counters and config; not a substitute for D1 for primary data
- **R2** — listing photos and vendor documents; private bucket; no public access
- **Vectorize** — vector index for semantic listing similarity (v2 only)

---

## Auth

- **JWT (HS256)** — short-lived access tokens (24 h for customers/vendors, 8 h for admin)
- **SMS OTP (MSG91)** — passwordless; only auth factor for all roles
- No server-side session storage — JWT validated at the Worker edge on every request
- Secrets stored in Cloudflare Workers Secrets via Wrangler — never in source control

---

## SMS OTP

**Chosen:** MSG91
- Strong India + UAE delivery rates
- DLT-registered sender ID for India numbers
- Simple REST API
- Client (Momentum Living) pays gateway subscription and per-message costs directly

---

## Email — Resend

- Transactional email for admin enquiry notifications and vendor moderation outcomes
- React Email for template authoring
- Free tier: 100 emails/day — sufficient for v1 admin notification volume

---

## Maps — Leaflet + OpenStreetMap

- No billing account or API key required
- Adequate for pin-on-map listing display
- Swap to Google Maps in v2 if place autocomplete is needed

---

## AI (v2 only) — Amazon Bedrock

- Claude Opus via Bedrock REST API for listing moderation assistance
- Accessed from Workers using `aws4fetch` (SigV4 signing, Worker-compatible)
- AWS credentials stored as Cloudflare Workers Secrets
- Workers AI (`@cf/baai/bge-base-en-v1.5`) for embedding generation; Bedrock for any reasoning

---

## Full Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework (frontend) | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (auth/UI) + TanStack Query (server state) |
| Forms | React Hook Form + Zod |
| Framework (backend) | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Cache / Rate-limit | Cloudflare KV |
| File storage | Cloudflare R2 |
| Auth | JWT HS256 (custom, no NextAuth) |
| SMS OTP | MSG91 |
| Email | Resend + React Email |
| Maps | Leaflet + OpenStreetMap |
| Tables / Export | TanStack Table v8 + csv-stringify (streaming) |
| Charts | Recharts |
| Frontend hosting | Cloudflare Pages |
| API hosting | Cloudflare Workers |
| Package manager | pnpm |
| Monorepo | pnpm workspaces |
| Deployment | Wrangler + GitHub Actions |
| Linting | ESLint + Prettier |

---

## Engineering Principles

- Design for free-tier limits from day one: minimise D1 row reads, batch AI calls, stay within KV write budget
- Stateless Workers wherever possible; all state lives in D1, KV, or R2
- Idempotent ingestion and background jobs
- Async work via `waitUntil` — keep request handlers within the 10 ms CPU limit
- Secrets in Cloudflare Workers Secrets (Wrangler), never in source control
- Provider adapters for external listing sources so one failure does not break the pipeline
