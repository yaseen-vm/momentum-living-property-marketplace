# Product Requirements

## Overview

A multi-sided listing marketplace for properties, plots and rooms, running entirely on the **Cloudflare free tier**. Three user personas — customer, vendor, admin — interact through a single React SPA with role-gated views. The backend is a Hono Worker on Cloudflare Workers with D1 (SQLite) as the sole database.

Every vendor and listing is moderated before going live. Deals close offline; the platform is a lead-generation and routing layer, not a transaction processor.

---

## Personas

### Customer
- Discovers and shortlists listings
- Must verify mobile via SMS OTP before searching
- Registers interest in a listing; cannot contact vendor directly
- Tracks enquiry history in their profile

### Vendor
- Types: landlord, company, agent, broker
- Verifies mobile via SMS OTP on signup
- Uploads type-specific documents to R2; account stays `pending` until admin approves
- Creates and manages listings (draft → submit → approved/rejected)
- Sees admin remarks on rejected submissions

### Admin
- Single internal role; full platform control via admin panel
- Verifies vendors and approves/rejects listings from D1 queues
- Receives enquiry notifications (in-dashboard + email)
- Manages deal tracking workflow
- Exports customer data from D1 and views aggregate reports

---

## Functional Requirements

### FR-01 Public Listing Search
- Filter by type (property / plot / room), location slug, price range, size, amenities
- Sort by price (asc/desc), date
- Paginated results (default 20/page, max 50)
- Listing detail: photo gallery, map pin, specs, enquiry CTA
- Shortlist / favourites stored in D1 (customer) or localStorage (anonymous)

### FR-02 Customer Auth
- Signup with name + mobile number
- SMS OTP verified before search access; OTP expires in 5 minutes; max 3 resends/10 min; 5 wrong attempts → 15-min lockout (KV)
- Login via OTP (passwordless)
- JWT (HS256) returned on verify; 24-hour expiry
- Profile: saved listings, enquiry history

### FR-03 Vendor Auth & Onboarding
- Signup with vendor type selection
- Mobile verified by SMS OTP (same rules as FR-02)
- Document upload to R2 per type:
  - Landlord: ownership proof + national ID
  - Company: trade licence + authorised signatory ID
  - Agent: agency licence + personal ID
  - Broker: brokerage certificate + personal ID
- Account status `pending` until admin approves; rejection includes reason text stored in D1
- JWT role=vendor assigned immediately; vendor portal locked until status=approved

### FR-04 Vendor Listing Management
- Create listing: type, title, description, price, currency, location, lat/lng, size, bedrooms/bathrooms, amenities, up to 20 photos (direct-to-R2 via presigned PUT)
- Statuses stored in D1: `draft` | `pending` | `approved` | `rejected` | `rented_sold` | `withdrawn`
- Edit allowed on `draft` and `rejected` listings only
- Rejection shows admin remarks from D1

### FR-05 Admin — Vendor Verification
- Queue: D1 SELECT vendor_profiles WHERE status=pending
- Actions: approve | reject with reason → D1 update + Resend email to vendor (via `waitUntil`)

### FR-06 Admin — Listing Approval
- Queue: D1 SELECT listings WHERE status=pending
- Actions: approve | request changes (remarks to vendor) | reject → D1 update + email (via `waitUntil`)

### FR-07 Admin — Enquiry Management
- Triggered when customer POSTs `/enquiries`
- D1 insert + `waitUntil`: email admin via Resend + insert `admin_notifications` row
- Enquiry states in D1: `pending` | `owner_confirmed` | `customer_contacted` | `closed`
- Internal notes per enquiry (`enquiry_notes` table)

### FR-08 Customer Data Export
- Export types: `verified_customers` | `interested_customers`
- Period filters: 24 h, 2 days, 7 days, 30 days, custom date range
- Interested customers export: listing title, type, location, enquiry date, status
- Format: CSV streamed from D1 query via `csv-stringify` TransformStream

### FR-09 Admin Reports
- D1 aggregate counts: listings, vendors, customers, enquiries
- All counts filterable by date range
- Breakdown by listing type and vendor type

---

## Non-Functional Requirements

| Concern | Requirement |
|---------|------------|
| Responsiveness | Mobile-first; works from 320 px viewport up |
| OTP delivery | < 10 s p95 to UAE and India numbers |
| Listing search | < 500 ms p95 — covered by D1 composite index on `(status, type, location_slug, price)` |
| Worker CPU budget | All request-path code must complete within 10 ms CPU; heavy work via `waitUntil` |
| D1 read budget | Index all hot query paths; avoid N+1 patterns; stay well under 5 M reads/day |
| KV write budget | OTP + rate-limit keys only; stay under 1,000 writes/day |
| File sizes | Photos max 10 MB; documents max 5 MB; enforced at presign via R2 `contentLengthRange` |
| Accessibility | WCAG 2.1 AA for public-facing pages |

---

## Cloudflare Free-Tier Design Constraints

| Service | Free Limit | Design Constraint |
|---------|-----------|------------------|
| Workers | 100,000 req/day, 10 ms CPU | Keep handlers thin; offload async to `waitUntil` |
| D1 | 5 GB, 5 M reads/day, 100,000 writes/day | Composite indexes on all filtered columns; batch writes |
| KV | 100,000 reads/day, 1,000 writes/day | OTP rate-limit and config only; no primary data |
| R2 | 10 GB/month, free egress | Enforce file-size limits; private bucket only |
| Workers AI | 10,000 Neurons/day | Reserved for listing embeddings (v2); cache results |
| Vectorize | Free | Semantic search v2; skip in v1 |

No paid database, no external hosting, no Vercel, no Neon, no Supabase. Stack runs on Cloudflare free tier + MSG91 (SMS, client pays) + Resend (email, free 100/day) + Amazon Bedrock (v2, pay-per-use).

---

## Out of Scope (v1)

- Native iOS / Android apps
- In-platform payments or escrow
- Arabic / RTL language support
- Semantic / AI-powered listing search (Vectorize — v2)
- AI-assisted listing moderation (Bedrock — v2)
- Vendor subscription tiers or premium listings
- Public vendor profiles or customer reviews
