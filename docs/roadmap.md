# Roadmap

## Phase 1 — MVP (Cloudflare Free Tier)
**Target:** 8 working days from project kick-off | **Budget:** ₹ 80,000

Goal: a working end-to-end platform on Cloudflare free tier where vendors submit listings, admin moderates, and customers discover and enquire.

### Deliverables

- [ ] **Project setup** — pnpm monorepo, Wrangler environments (dev/prod), GitHub Actions CI (typecheck + deploy on main)
- [ ] **Auth** — SMS OTP send/verify, JWT issue, KV rate-limit and lockout
- [ ] **Customer registration** — OTP-verified signup, profile, shortlist, enquiry history in D1
- [ ] **Vendor registration** — OTP-verified signup, vendor type, document upload to R2, pending state in D1
- [ ] **Public listing search** — D1 filtered query with composite index, photo thumbnails, map pin, detail page
- [ ] **Vendor dashboard** — create/edit listings, direct-to-R2 photo upload via presigned PUT, listing status visibility
- [ ] **Admin panel — vendor queue** — review documents, approve/reject with reason, Resend email via `waitUntil`
- [ ] **Admin panel — listing queue** — approve/request changes/reject, Resend email via `waitUntil`
- [ ] **Enquiry system** — customer registers interest → D1 insert → `waitUntil` admin email + D1 notification
- [ ] **Enquiry workflow** — admin updates status (pending → owner_confirmed → customer_contacted → closed) + internal notes
- [ ] **Customer data export** — D1 query streamed as CSV via csv-stringify
- [ ] **Admin reports** — D1 aggregate counts with date-range filter
- [ ] **Frontend SPA** — React + Vite on Pages: public search, listing detail, customer auth + profile, vendor dashboard, admin panel
- [ ] **Deployment** — Wrangler deploy: API Worker + Ingestion Worker (stub); Cloudflare Pages deploy; D1 migrations

### Free-Tier Constraints
- Everything on Cloudflare free tier except MSG91 (client-paid SMS) and Resend (100 emails/day free)
- All async work via `waitUntil` — no Queues required at v1 scale
- Workers AI not used in v1 — reserved for v2 embeddings
- D1 composite index on `(status, type, location_slug, price)` to keep listing searches within 5 M reads/day

### Payment Gates (from quotation)
| Milestone | Amount |
|-----------|--------|
| Advance (commence work) | ₹ 40,000 |
| Demo approval | ₹ 24,000 |
| Final delivery | ₹ 16,000 |

---

## Phase 2 — Semantic Search & AI
**Target:** Q4 2026 | Requires separate quote

Goal: upgrade listing discovery with vector search and add AI pre-screening to reduce admin moderation load.

- [ ] **Vectorize index** — `listing-embeddings` (768-dim, `@cf/baai/bge-base-en-v1.5`)
- [ ] **Embedding agent** — `waitUntil` task embeds listing title + description on approval; upsert to Vectorize
- [ ] **Semantic search** — natural-language query embedded server-side; Vectorize nearest-neighbour merged with D1 filter
- [ ] **AI moderation pre-screen (Bedrock)** — Claude flags content issues/anomalies before admin queue; human decision always final
- [ ] **Ingestion Worker** — daily cron Cloudflare Worker; Bayut / Dubizzle adapters; D1 dedup by `(source_name, source_listing_id)`; photo re-upload to R2

---

## Phase 3 — Growth Features
**Target:** Q2 2027 | Requires separate quote

Goal: expand the platform from lead routing to a richer marketplace experience.

- [ ] **Arabic / RTL** — Tailwind `rtl:` variant, `next-intl` translations (or i18next for Vite SPA), bilingual listing fields
- [ ] **Vendor subscription tiers** — free (3 listings) vs. pro (unlimited + featured); Stripe for subscription billing
- [ ] **Public vendor profiles** — verified vendor page with active listings; customer ratings (admin-moderated)
- [ ] **Native mobile apps** — React Native (Expo); same Hono API, no backend changes; push notifications for enquiry updates
- [ ] **Advanced analytics** — vendor listing views, enquiry conversion, time-on-market via D1 event log
- [ ] **Upgrade to Workers Paid** — unlock higher CPU limits, longer cron schedules, more daily requests if traffic grows

---

## Phase 4 — Platform Maturity
**Target:** Q4 2027 | Requires separate quote

- [ ] **In-platform payments** — booking deposit via Stripe; admin-held escrow until deal confirmed
- [ ] **Multi-country expansion** — country-level config in D1: currency, location taxonomy, document requirements; Saudi Arabia + Qatar
- [ ] **CSV bulk ingest** — admin panel CSV upload for one-off data migrations
- [ ] **Interview-stage tracking** (if pivoting to rental management) — automated follow-up reminders via Resend

---

## Backlog (Unscheduled)

- SEO: static listing pages via Cloudflare Pages Functions for server-rendered HTML (keeps SPA for auth'd views)
- Property comparison tool (side-by-side 2–3 listings)
- Vendor document expiry tracking and re-verification prompts
- Annual maintenance plan (₹ 12,000/year — see quotation terms)
- Upgrade to Hyperdrive + PostgreSQL if D1's SQLite query limits become a constraint at scale
