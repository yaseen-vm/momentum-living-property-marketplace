# Technology Decisions

> Stack for the client build spec. Libraries marked **(to add)** are not yet in `package.json`. Build status: [`implementation-status.md`](./implementation-status.md).

## Architecture

Cloud-native, API-first, entirely on the Cloudflare free tier. Frontend and backend deploy separately. No SSR runtime, no database outside Cloudflare, no paid hosting.

**Base44:** the client spec was written with Base44 in mind. We are **not** using Base44 — the stack below meets every spec requirement. The spec's one hard dependency is a real SMS/OTP provider (MSG91 below).

---

## Frontend

- **React 18 + TypeScript + Vite** — SPA, static output
- **Tailwind CSS** — styling; design tokens for the corporate palette (navy / white / charcoal / gold)
- **Primitives:** in-repo UI components (`apps/web/src/components/ui/*`); shadcn/ui-style patterns (copy-in, no lock-in)
- **GSAP** — subtle section animations (respect `prefers-reduced-motion`)
- **lucide-react** — icons
- **React Router v6** — routing for corporate / availability / admin areas
- **TanStack Query + Zustand** — server state + auth/wizard state
- **React Hook Form + Zod** — wizard and admin forms (per-user-type schemas shared with the API via `packages/shared`)
- **SEO:** interim `usePageMeta` hook (`apps/web/src/lib/usePageMeta.ts`) sets title/description/robots client-side; `react-helmet-async` **(to add)** for per-route `<title>`/meta/canonical; corporate routes **prerendered to static HTML at build** (`vite-react-ssg` or equivalent — **(to add)**, tool chosen during implementation); generated `sitemap.xml` + `robots.txt`; availability routes `noindex`
- **Cloudflare Pages** — hosting + CDN (500 builds/month, 20,000 files)

Corporate site, availability journey and admin live in one SPA, gated by JWT role at the router and re-verified server-side on every request.

---

## Backend

- **TypeScript + Hono** on Cloudflare Workers (V8 native, no Node built-ins)
- **Zod** — request validation; schemas live in `packages/shared` and are shared with the wizard forms (used by `/availability/*`; older handlers still validate manually)
- **REST API** from a single Worker
- **Matching engine** — plain TypeScript, rule-based, inline in the request (≤ 200 candidates scored)
- **Async work** — `waitUntil` (OTP SMS, lead emails); no Queues at v1 scale

---

## Cloudflare Services (Free Tier)

| Service | Role | Free Tier Limit |
|---------|------|----------------|
| **Workers** | API, matching, async tasks | 100,000 req/day, 10 ms CPU/invocation |
| **Pages** | Frontend | 500 builds/month, 20,000 files |
| **D1** | Primary database | 5 GB, 5 M rows read/day, 100,000 rows written/day |
| **KV** | Rate-limit counters, config | 100,000 reads/day, 1,000 writes/day |
| **R2** | Photos, corporate media, documents | 10 GB/month, free egress |
| **WAF rate limiting** | Per-IP limit on OTP send | 1 free rule |
| **Workers AI / Vectorize** | v2 semantic re-ranking | Free allocation |
| **Workers Logs** | Observability | 200,000 events/day |

**External services:** MSG91 (SMS OTP — client pays), Resend (email, 100/day free).

---

## Data Layer

- **D1** — all structured data: users, enquiries/leads, matches, requests, notes, listings (properties & opportunities), agents, site content
- **KV** — rate-limit counters and config only
- **R2** — private bucket; `public-media/` served publicly by the Worker, everything else via signed URLs
- **Vectorize** — v2 only

---

## Auth

- **SMS OTP (MSG91)** — passwordless; verifies enquirers mid-journey and admins at login
- **JWT HS256** — 24 h enquirer, 8 h admin; custom implementation (`apps/api/src/lib/jwt.ts`)
- Secrets via Wrangler, never in source control

---

## SMS OTP — MSG91

Strong UAE + India delivery, simple REST API, client pays subscription and per-message cost. UAE sender ID registration to be completed by the client (see open questions in `implementation-status.md`).

---

## Email — Resend

Admin new-lead and request notifications; optional enquirer acknowledgement. Plain HTML templates in v1 (React Email optional). Free tier 100 emails/day.

---

## Agent Communication ("Chat With an Agent")

- **WhatsApp:** `https://wa.me/<number>?text=<prefilled message with reference>` — no API/account needed
- **Phone / Email:** `tel:` / `mailto:`
- **Website chat:** provider-agnostic slot; recommended free options Tawk.to or Crisp (script loaded only when a provider ID is configured in `site_content`)

---

## Maps — Leaflet + OpenStreetMap

Used only on opportunity detail, and only when the admin enables `show_map` for that record (default is general area text, no pin). No API key required.

---

## Full Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling / motion | Tailwind CSS, GSAP |
| State | Zustand + TanStack Query |
| Forms / validation | React Hook Form + Zod (shared schemas) |
| SEO | react-helmet-async + build-time prerender (to add) |
| Backend | Hono on Cloudflare Workers |
| Database | Cloudflare D1 |
| Rate limits | Cloudflare KV + WAF |
| Files | Cloudflare R2 (private) |
| Auth | MSG91 OTP + custom JWT HS256 |
| Email | Resend |
| Chat | WhatsApp deep links, tel/mailto, pluggable web chat |
| Maps | Leaflet + OSM (optional per record) |
| Export | Streamed CSV from the Worker |
| Charts (reports) | Recharts (to add, optional) |
| Hosting | Cloudflare Pages + Workers |
| Package manager / monorepo | pnpm workspaces |
| CI/CD | GitHub Actions + Wrangler |
| Linting | ESLint + Prettier |

---

## Engineering Principles

- Design for free-tier limits: indexed queries, small candidate sets, minimal KV writes
- Stateless Workers; all state in D1 / KV / R2
- Async side effects via `waitUntil`; handlers within 10 ms CPU
- Corporate content is data (CMS), never hard-coded facts — placeholders until the client supplies real information
- Secrets in Workers Secrets only
