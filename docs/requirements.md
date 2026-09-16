# Product Requirements

## Overview

A property marketplace platform for properties, plots and rooms. Owners list properties after admin verification. Customers browse and book after phone OTP login. Every step — owner onboarding, listing submission, and booking requests — goes through admin before anything is visible or actioned publicly.

Stack: React + Vite SPA on Cloudflare Pages, Hono on Cloudflare Workers, Cloudflare D1 (SQLite), all on the free tier.

---

## Pages & Portals

| Area | Who sees it | Auth required |
|------|------------|---------------|
| Landing page | Everyone | None |
| Available listings (browse + search) | Verified customers | Phone OTP login |
| Owner signup + details form | New owners | Phone OTP first, then form |
| Owner dashboard | Approved owners | Phone OTP login |
| Admin panel | Admin only | Admin credentials |

---

## FR-01 — Landing Page

A public-facing marketing page that visually communicates what the platform does and what it offers.

**Must include:**
- Hero section: headline, subheadline, primary CTA ("Browse Properties" → OTP login, "List Your Property" → owner signup)
- How it works: step-by-step visual flow (owner lists → admin approves → customers find it → admin connects both)
- Property type showcase: visual cards for Properties, Plots, Rooms with icons or illustrations
- Stats or trust signals (e.g. verified listings, verified owners)
- Footer: contact, about, links

**Design:** Fully responsive (mobile-first). No auth required to view this page.

---

## FR-02 — Customer Phone OTP Login & Browse

Customers must verify their phone number before they can view available listings or search.

**Flow:**
1. Customer clicks "Browse Properties" on the landing page
2. Prompted to enter mobile number
3. SMS OTP sent (6-digit, 5-min expiry, max 3 resends, 5-attempt lockout)
4. OTP verified → JWT issued → customer lands on the listings page
5. Customer can now browse, filter, search, and view listing details

**Returning customers:** same OTP flow on each session (passwordless).

---

## FR-03 — Owner Signup Flow

Owners must verify their phone number first, then fill in their profile details. The details form is not accessible without a verified OTP.

**Flow:**
1. Owner clicks "List Your Property" on the landing page
2. Enters mobile number → SMS OTP sent
3. OTP verified → owner account created (status: `unregistered`)
4. Redirected to the **Owner Details Form** (only accessible after OTP verification)
5. Owner fills in:
   - Full name
   - Vendor type: Landlord / Company / Agent / Broker
   - Company name (if applicable)
   - Licence / registration number (if applicable)
   - Document uploads (type-specific — see below)
6. Form submitted → account status changes to `pending`
7. Owner sees a "Pending verification" screen and cannot access the dashboard yet

**Documents required per type:**
| Vendor Type | Documents |
|------------|-----------|
| Landlord | Ownership proof + National ID |
| Company | Trade licence + Authorised signatory ID |
| Agent | Agency licence + Personal ID |
| Broker | Brokerage certificate + Personal ID |

---

## FR-04 — Admin: Owner Verification

Admin sees a queue of all owners who submitted their details form.

**Admin flow:**
1. Admin opens the Owner Verification queue
2. Reviews submitted details and uploaded documents
3. Actions:
   - **Approve** — owner status changes to `approved`; owner receives SMS/email notification; owner dashboard is unlocked
   - **Reject** — admin enters a reason; owner is notified; owner can resubmit corrected documents
4. Only `approved` owners can access the listing dashboard

---

## FR-05 — Owner Dashboard & Listing Submission

Available only to `approved` owners.

**Owner can:**
- Create a listing: type (Property / Plot / Room), title, description, price, currency, location, size, bedrooms/bathrooms, amenities, up to 20 photos
- Save as draft or submit for admin review
- View listing status: `Draft` | `Pending` | `Approved` | `Rejected` | `Rented/Sold` | `Withdrawn`
- Edit `Draft` or `Rejected` listings
- See admin remarks on rejected listings
- Mark a listing as Rented/Sold or Withdrawn

---

## FR-06 — Admin: Listing Approval

Admin sees a queue of all listings submitted by approved owners.

**Admin flow:**
1. Admin opens the Listing Approval queue
2. Reviews listing content, photos, location, price
3. Actions:
   - **Approve** — listing becomes publicly visible on the browse/search pages
   - **Request Changes** — admin adds remarks; owner is notified; listing returns to owner for editing
   - **Reject** — admin adds reason; owner is notified

Only `approved` listings appear on the public browse and search pages.

---

## FR-07 — Customer Browse & Search

After OTP login, customers can:
- Browse all approved listings with photo thumbnails, price, type, location
- Filter by: type (Property / Plot / Room), location, price range, size, amenities
- Sort by: price (low–high, high–low), newest first
- View full listing detail: photo gallery, map pin, full description, specs

---

## FR-08 — Customer Booking Request

When a customer is interested in a listing they press a **"Book" / "Request to Book"** button on the listing detail page.

**Flow:**
1. Customer taps "Book" on a listing
2. A booking request is created in D1 (status: `pending`)
3. Admin is notified immediately:
   - In-dashboard alert with badge count
   - Email containing:
     - Customer name + mobile
     - Listing title, type, location
     - Owner name + mobile
4. Admin reviews the request in the Booking Requests panel and handles the deal manually (calls owner, calls customer, collects payment offline)
5. Admin updates the booking status: `Pending` → `Owner Confirmed` → `Customer Contacted` → `Closed`
6. Admin can add internal notes to each booking for deal tracking

**One booking per customer per listing** (duplicates blocked).

---

## FR-09 — Admin: Booking Requests Panel

Central view of all booking requests with:
- Customer details (name, mobile)
- Listing details (title, type, location, owner name + mobile)
- Current status and status history
- Internal notes per booking
- Filters: status, date range

---

## FR-10 — Admin: Data Export (Users & Owners)

Admin can export data to CSV with date-range filtering.

### Export Types

**Verified Customers Export**
- Filter by: signup date range, last login date range
- Columns: `name, mobile, mobile_verified_at, signup_date, last_login_at`

**Owners Export**
- Filter by: signup date range, last login date range, owner status (pending / approved / rejected)
- Columns: `name, mobile, mobile_verified_at, vendor_type, status, signup_date, last_login_at, company_name, licence_no`

### Date Filter Options
- Last 24 hours
- Last 2 days
- Last 7 days
- Last 30 days
- Custom date range (from / to)

Filter applies to **both** signup date and last login date independently (admin selects which field to filter on).

---

## FR-11 — Admin: Reports Dashboard

Summary metrics with date-range filter:
- Total listings (by status)
- Total owners (by status)
- Total customers (verified)
- Total booking requests (by status)
- Breakdown by listing type (Property / Plot / Room)

---

## User Flow Summary

```
OWNER:
Landing page
  → "List Your Property"
  → Enter mobile → OTP verify
  → Fill owner details + upload documents
  → Pending screen (awaiting admin approval)
  → [Admin approves]
  → Owner dashboard unlocked
  → Create listing → submit for review
  → [Admin approves listing]
  → Listing appears publicly

CUSTOMER:
Landing page
  → "Browse Properties"
  → Enter mobile → OTP verify
  → Browse / search approved listings
  → Open listing detail
  → Click "Book" / "Request to Book"
  → [Admin notified with both contacts]
  → Admin handles deal offline

ADMIN:
  → Owner verification queue (approve / reject)
  → Listing approval queue (approve / request changes / reject)
  → Booking requests panel (track deal status + notes)
  → Export users & owners (CSV with date filters)
  → Reports dashboard
```

---

## Non-Functional Requirements

| Concern | Requirement |
|---------|------------|
| Responsiveness | Mobile-first; works from 320 px viewport |
| OTP delivery | < 10 s p95 to UAE and India numbers |
| Listing search | < 500 ms p95 — D1 composite index on `(status, type, location_slug, price)` |
| Worker CPU budget | All request handlers ≤ 10 ms CPU; async work via `waitUntil` |
| D1 reads | Index all hot query paths; stay under 5 M reads/day |
| KV writes | OTP rate-limit keys only; stay under 1,000 writes/day |
| File sizes | Photos max 10 MB; documents max 5 MB (enforced at R2 presign) |

---

## Cloudflare Free-Tier Design Constraints

| Service | Free Limit | Constraint |
|---------|-----------|-----------|
| Workers | 100,000 req/day, 10 ms CPU | Thin handlers; heavy work via `waitUntil` |
| D1 | 5 GB, 5 M reads/day, 100,000 writes/day | Composite indexes; batch writes |
| KV | 100,000 reads/day, 1,000 writes/day | OTP rate-limit and config only |
| R2 | 10 GB/month, free egress | Private bucket; enforce file-size limits |
| Workers AI | 10,000 Neurons/day | Reserved for v2 embeddings |
| Vectorize | Free | Semantic search — v2 only |

---

## Out of Scope (v1)

- Native iOS / Android apps
- In-platform payments or escrow
- Arabic / RTL language support
- Semantic / AI-powered listing search (v2)
- AI-assisted listing moderation (v2)
- Vendor subscription tiers or featured listings
- Public vendor profiles or customer reviews
