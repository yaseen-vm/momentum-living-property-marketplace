# System Architecture

> Target architecture for the client build spec. Build status: [`implementation-status.md`](./implementation-status.md).

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          User's Browser                          │
│             React + TypeScript + Vite SPA — Cloudflare Pages     │
│                                                                  │
│  Corporate site (public, prerendered)   Availability journey     │
│  / /about /managing-director /agents    /availability (wizard)   │
│  /why-choose-us /contact /privacy       /availability/results/*  │
│  → NO inventory                         /availability/opps/*     │
│                                                                  │
│  Admin dashboard  /admin/* (leads, properties, agents, content)  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS REST (Bearer JWT)
┌──────────────────────────────▼───────────────────────────────────┐
│                     API Worker (Hono) — Cloudflare Workers        │
│  /auth  /content  /agents  /availability  /upload  /admin/*       │
│  Matching engine (inline, rule-based)                             │
└──┬──────────┬──────────┬──────────────┬──────────────────────────┘
   ▼          ▼          ▼              ▼
  D1         KV         R2          Vectorize (v2)
(data)  (rate limits) (photos/docs)

          waitUntil (async, same invocation)
   ┌──────────────────────────────┐
   │ - OTP dispatch               │──► MSG91 (SMS)
   │ - new-lead / request alerts  │──► Resend (email to admin)
   │ - CSV export stream          │
   └──────────────────────────────┘

External links (no integration): wa.me (WhatsApp), tel:, mailto:
Website chat: provider slot (e.g. Tawk.to / Crisp) — v1 UI only
```

---

## Components

### Cloudflare Pages (Frontend)
Static SPA built with React + TypeScript + Vite. Three areas in one codebase:

1. **Corporate site** — Home, About Us, Managing Director, MD's Note, Our Agents, Why Choose Us, Contact, Privacy, Terms. Content is fetched from `GET /content` and `GET /agents` (admin-editable). Routes are **prerendered at build time** to static HTML with per-page `<title>`/meta for SEO; content hydrates from the API. **No component on these routes may render inventory.**
2. **Availability journey** — a single wizard route (`/availability`) with local step state: user type → details → OTP → requirements; then results and opportunity detail routes that require a JWT and call server-gated endpoints. `noindex`.
3. **Admin dashboard** — `/admin/*`, admin JWT. Modules: Leads (list/filter/detail/assign/notes/rematch), Properties (CRUD/archive/availability/photos), Agents (CRUD/photo), Content (recursive per-key editor), Reports (stats + breakdowns), Export (CSV download).

Deployed from `main` via GitHub Actions.

### API Worker (Hono)
Single Hono Worker. Thin handlers: Zod-validate input, authorise via JWT, read/write D1/KV/R2, respond. Async side-effects (SMS, email) run in `waitUntil`. All request-path work within the 10 ms CPU budget.

**Bindings:** `DB` (D1), `KV`, `R2`, plus secrets `JWT_SECRET`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `RESEND_API_KEY`, `ADMIN_EMAIL`; vars `ENVIRONMENT`, `SITE_URL`. v2 adds `AI`, `VECTORIZE_LISTINGS`, AWS secrets.

### Matching Engine (inline, synchronous)
`apps/api/src/lib/matching.ts`. Runs inside `PUT /availability/enquiries/:id/requirements` (and, from Stage 5, `POST /admin/leads/:id/rematch`).

1. Map `user_type` → allowed `opportunity_kind`s (table in `data-model.md`).
2. Candidate query on the covering index `(status, is_available, opportunity_kind, location_slug, total_capacity)`: `status='approved' AND is_available=1 AND opportunity_kind IN (…) AND location_slug IN (…)` (location filter dropped if the enquirer chose "any"), `LIMIT 200`. The enquirer's emirates/areas are expanded to area slugs from the shared location catalogue (`packages/shared/src/availability.ts`): an emirate chosen without specific areas covers all its areas.
3. Score each candidate in JS (0–100): capacity fit, budget fit (price within range, tolerance ±10 %), availability date ≤ move-in (+30 days tolerance), property type match, facility overlap. Hard-exclude candidates failing capacity or budget by > 25 %. Weights: capacity 30, budget 25, dates 15, type 15, facilities 15; a criterion the enquirer left blank scores full marks, a listing value that is missing scores half. Tenants, buyers and management companies are matched as *seekers* (the listing must cover their need); landlords and sellers as *providers* (their property must cover the demand record's need, and the demand's budget must reach their asking price). Budgets compare per year (monthly × 12), or on totals for sales.
4. Keep top 20 with score ≥ 40 → `lead_matches` (batch insert).

Deterministic and cheap (≤ 200 rows scored) — fits the CPU budget. v2 may add Vectorize re-ranking on free-text requirements.

### Notification Agent (`waitUntil`)
Triggered by lead completion and by info/viewing requests. Writes `admin_notifications` and emails `ADMIN_EMAIL` via Resend with the lead summary (user type, name, company, verified mobile, email, requirements summary, matched references, requested listing). See `agent-spec.md`.

### OTP Agent
`POST /auth/otp/send` checks KV lock + send count, generates a CSPRNG 6-digit code, stores an HMAC-SHA256 hash in D1 and calls MSG91. Plain OTP never stored or returned.

### Ingestion Worker (v2 — Scheduled Cron)
Stub today. Future: external feed adapters (see `job-sources.md`) producing **draft** admin-managed listings for review.

---

## Request Flows

### Corporate page load
```
Browser → Pages (prerendered HTML: title/meta/H1 + placeholder-safe copy)
        → GET /content  +  GET /agents   (edge-cached 5 min)
        → hydrate admin-edited content
```

### Availability journey
```
Step 1–2 (client state only)
   │
POST /auth/otp/send {mobile}            → KV rate check → D1 otp_tokens → MSG91
POST /auth/otp/verify {mobile, code}    → D1 verify → upsert users → JWT (role=customer)
POST /availability/enquiries {type, details, consent}
                                        → D1 enquiries (stage=verified)
Step 3
PUT  /availability/enquiries/:id/requirements
                                        → D1 update (stage=completed)
                                        → matching engine → D1 lead_matches
                                        → 200 {match_count}
                                        → waitUntil: admin_notifications + Resend email
Step 4
GET  /availability/enquiries/:id/matches   (403 NOT_QUALIFIED unless owned + completed)
GET  /availability/opportunities/:id?enquiry_id=…   (403 unless in lead_matches)
POST /availability/enquiries/:id/requests {listing_id, kind}
                                        → D1 lead_requests (+ lead_status bump)
                                        → waitUntil: notification + email
```

### Chat With an Agent
```
Browser opens picker → agent list from GET /agents (or match.agent on cards)
  → WhatsApp: https://wa.me/<digits>?text=<prefilled incl. reference_no>
  → Phone: tel:  → Email: mailto:  → Website chat: provider widget (when configured)
No server call; placeholders render disabled buttons until real contact data exists.
```

### File upload & delivery
```
POST /upload/file (multipart; admin, or enquirer for enquiry_doc)
  → type/size validation → R2 put (private bucket) → { key }

API responses that include photos/docs mint signed URLs:
  /upload/files/<key>?exp=<now+1h>&sig=HMAC(key+exp)
GET /upload/files/:key
  → public-media/*  : stream, long cache
  → other prefixes  : verify sig + exp, else 403
```

### Admin lead handling
```
GET /admin/leads (filters) → GET /admin/leads/:id
PATCH /admin/leads/:id {lead_status, assigned_agent_id, note} → D1 enquiries + lead_notes
POST /admin/leads/:id/rematch → matching engine → replace lead_matches
```

### CSV Export
```
GET /admin/export?type=leads&period=30d → admin JWT → KV rate limit
  → D1 range query → streamed CSV (text/csv attachment)
```

---

## Security Boundaries

- **Corporate / inventory separation:** corporate routes call only `/content` and `/agents`. Inventory is only served by `/availability/*` (qualified enquirer) and `/admin/*` (admin). No public listing endpoint exists.
- **Qualification enforced server-side:** results and details are gated on enquiry ownership + `stage=completed` + `lead_matches` membership.
- **Confidential fields:** owner identity/contact, internal notes and exact coordinates are selected only by admin handlers.
- **JWT secrets:** Workers Secrets only.
- **R2:** private bucket; signed 1-hour URLs for everything except `public-media/`.
- **OTP:** hashed at rest; never returned; dev fallback code only when `ENVIRONMENT=development`.
- **Role enforcement:** role read from the signed JWT on every request, never from params/body.

---

## Legacy components (pending removal)

Vendor portal (`/vendor/*` routes and pages), public listing browse (`/listings`), shortlists, bookings, vendor/listing moderation agent. See `api-spec.md` → Legacy endpoints.
