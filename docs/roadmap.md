# Roadmap

> Detailed item-by-item status (done / partial / pending / legacy) is in [`implementation-status.md`](./implementation-status.md). This file tracks milestones.

## v1 — LabourCamps.com Corporate Site + Availability Journey

**Scope source:** client build specification (Sept 2026). Replaces the original Phase 1 marketplace scope from quotation LNG-2026-WD-003 (₹ 80,000 / 8 days). **The new scope is materially larger — a change request / revised quotation is required before the pending stages below are started** (quotation T&C: *"Any scope beyond the items listed above will be quoted and approved separately."*).

Build order follows the client spec §32.

### Stage 0 — Platform foundation (from original scope)
- [x] pnpm monorepo (`apps/web`, `apps/api`, `apps/ingestion`, `packages/shared`), Wrangler config, D1 migrations 0001–0003
- [x] GitHub Actions CI — typecheck + deploy on `main`
- [x] SMS OTP send/verify, HMAC-hashed tokens, KV rate-limit + lockout, JWT issue
- [x] Admin shell (layout, notifications, export, reports) — to be retargeted
- [ ] CI lint step + `pnpm audit`

### Stage 1 — Foundation
- [ ] Visual design system: navy / white / charcoal / gold tokens, typography, cards, buttons
- [ ] Global navigation (7 items + prominent AVAILABILITY, mobile hamburger) and footer
- [ ] Rebrand to Momentum Living + LABOURCAMPS.COM; remove invented company facts

### Stage 2 — Corporate pages
- [ ] Home (hero, about, why-choose-us cards — no inventory)
- [ ] About Us, Managing Director, MD's Note, Our Agents, Why Choose Us, Contact
- [ ] Privacy Policy, Terms & Conditions
- [ ] Chat With an Agent picker
- [ ] `site_content` + `agents` tables, public `GET /content`, `GET /agents`, placeholder seed

### Stage 3 — Availability workflow
- [ ] Wizard shell with progress indicator
- [ ] Step 1 user type, Step 2 dynamic details + consent
- [ ] OTP step inside the wizard (reuse existing OTP API/component)
- [ ] Step 3 dynamic requirements per user type
- [ ] `enquiries` table + `/availability/enquiries` endpoints
- [ ] Matching engine + `lead_matches`; results page with empty state

### Stage 4 — Details & contact
- [ ] Opportunity cards + detail page (gated by matches)
- [ ] Request information / viewing (`lead_requests`)
- [ ] Agent contact from card/detail
- [ ] Lead notification agent (in-dashboard + email)

### Stage 5 — Admin
- [ ] Leads module (filters, detail, assign agent, 8 statuses, notes, rematch)
- [ ] Properties / opportunities CRUD (rework listings: admin-owned, `opportunity_kind`, availability toggle, archive, confidential owner fields, photos)
- [ ] Agents CRUD
- [ ] Corporate content editor
- [ ] Retarget export + reports to leads

### Stage 6 — Hardening
- [ ] Remove public `/listings` API and unauthenticated file serving; signed URLs
- [ ] OTP dev fallback gated on `ENVIRONMENT`
- [ ] Zod validation on all endpoints; security headers; CORS for final domain
- [ ] Responsive QA (320 px → desktop), loading / empty / error states
- [ ] SEO: helmet, prerender, sitemap, robots, alt text
- [ ] Hide + remove legacy vendor portal, browse, shortlist, bookings (after client confirmation)

### Stage 7 — Testing & launch
- [ ] Client acceptance test (spec §33) on desktop + mobile
- [ ] Production MSG91 + Resend + domain (`labourcamps.com`) + Pages/Workers custom domains
- [ ] Admin training + documentation

### Free-tier constraints (unchanged)
- Everything on Cloudflare free tier except MSG91 (client-paid) and Resend (100/day free)
- Async work via `waitUntil`; no Queues
- Matching candidate query covered by `(status, is_available, opportunity_kind, location_slug, total_capacity)`

---

## Phase 2 — Smarter Matching & Operations
**Target:** after v1 launch | separate quote

- [ ] Agent logins (view/update only their assigned leads)
- [ ] Auto-assign leads by agent specialization / location
- [ ] Live web-chat provider connected (Tawk.to / Crisp) with agent routing
- [ ] Vectorize re-ranking of matches on free-text requirements
- [ ] Turnstile on OTP send
- [ ] Lead follow-up reminders (Resend) and SLA indicators
- [ ] Ingestion Worker: import opportunities from partner feeds as drafts (`job-sources.md`)

## Phase 3 — Growth
**Target:** 2027 | separate quote

- [ ] Arabic / RTL
- [ ] Enquirer self-service area (view past enquiries, new matches alerts)
- [ ] Advanced analytics (lead funnel, time-to-contact, conversion by user type)
- [ ] Native mobile apps (same API)

## Phase 4 — Platform Maturity
**Target:** late 2027 | separate quote

- [ ] Multi-country (KSA, Qatar): currency, location taxonomy
- [ ] CSV bulk import of properties
- [ ] Document management for landlords (expiry tracking)

---

## Backlog (Unscheduled)

- Side-by-side opportunity comparison inside results
- Upgrade to Workers Paid if traffic grows
- Annual maintenance plan (₹ 12,000/year — quotation terms)
