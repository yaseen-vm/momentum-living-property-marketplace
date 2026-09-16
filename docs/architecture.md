# System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                    │
│         React + TypeScript + Vite (SPA)             │
│              Cloudflare Pages                       │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS REST
┌────────────────────▼────────────────────────────────┐
│              API Worker (Hono)                      │
│         Cloudflare Workers — V8 native              │
│  Routes: /auth  /listings  /vendors  /customers     │
│          /enquiries  /admin  /upload                │
└──┬──────────┬──────────┬────────────────────────────┘
   │          │          │
   ▼          ▼          ▼
  D1         KV          R2        Vectorize
(data)   (OTP/cache) (photos/docs) (embeddings v2)

          waitUntil (async)
   ┌──────────────────────┐
   │  Inline Agent Tasks  │
   │ - otp dispatch       │
   │ - admin notification │
   │ - moderation webhook │
   │ - csv export stream  │
   └──────────┬───────────┘
              │
              ▼
     MSG91 (SMS OTP)
     Resend (email)
     Amazon Bedrock (v2 — listing moderation)
```

---

## Components

### Cloudflare Pages (Frontend)
Static SPA built with React + TypeScript + Vite. No SSR runtime. All data fetched from the API Worker via REST. Three logical portals share one codebase — public listing search, vendor dashboard, admin panel — gated by JWT role. Deployed automatically from `main` via GitHub Actions.

### API Worker (Hono)
Single Hono Worker handling all client-facing REST requests. Thin handlers: validate input, authorize via JWT, read/write D1/KV/R2, return response. OTP dispatch, admin email notifications, and moderation webhooks run via `waitUntil` so they do not block the HTTP response. Keep all request-path computation within the Cloudflare Workers 10 ms CPU limit.

**Bindings:** `DB` (D1), `KV`, `R2`, `AI`, `VECTORIZE_LISTINGS` (v2), plus secrets `JWT_SECRET`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `AWS_ACCESS_KEY_ID` (v2), `AWS_SECRET_ACCESS_KEY` (v2), `AWS_REGION` (v2).

### Inline Agent Tasks
All async work (OTP send, admin notifications, vendor/listing moderation emails, CSV generation) runs directly inside `waitUntil` in the relevant route handler — not via Queues. The route returns immediately; work completes asynchronously inside the same Worker invocation.

### OTP Agent (inline — `waitUntil`)
Triggered by `POST /auth/otp/send`. Checks KV for rate-limit state, generates a CSPRNG OTP, stores the hashed token in D1, and calls MSG91 SMS API. No blocking of the HTTP response.

### Notification Agent (inline — `waitUntil`)
Triggered after `POST /enquiries` creates an enquiry record. Inserts an `admin_notifications` row in D1 and calls Resend to email the admin with both parties' contact details.

### Moderation Agent (inline — `waitUntil`)
Triggered after every admin approve/reject action on a vendor or listing. Updates D1 status, inserts a notification record, and emails the vendor with the outcome and any admin remarks.

### Ingestion Worker (v2 — Scheduled Cron)
Standalone Worker triggered by a daily cron. Runs listing provider adapters, normalises records to the canonical schema, deduplicates against D1 by `(source_name, source_listing_id)`, writes new records to D1, generates embeddings via Workers AI, and upserts to Vectorize. Idempotent by design.

---

## Request Flows

### Listing Search
```
Browser → API Worker → D1 (filter query on indexed columns) → ranked list → Browser
```

### Listing Search (semantic — v2)
```
Browser → API Worker → Workers AI (embed query) → Vectorize (nearest-neighbour) →
D1 (fetch listing details for result IDs) → ranked list → Browser
```

### SMS OTP Send & Verify
```
POST /auth/otp/send
  → API Worker returns 200 immediately
  → waitUntil: check KV rate-limit key → generate OTP → hash → D1 insert →
    MSG91 SMS API

POST /auth/otp/verify
  → API Worker fetches D1 OtpToken by mobile
  → Validates hash, expiry, attempts
  → Creates/updates User row in D1
  → Signs JWT → returns { token, role }
```

### Photo Upload (direct-to-R2)
```
POST /upload/presign
  → API Worker verifies JWT (vendor or admin)
  → Generates R2 presigned PUT URL (5-min TTL)
  ← { key, uploadUrl }

Browser → PUT <uploadUrl> directly to R2

POST /vendor/listings  (include R2 key in body)
  → API Worker creates Listing row in D1 with r2Key references
```

### Enquiry & Admin Notification
```
POST /enquiries
  → API Worker inserts Enquiry row (status: PENDING)
  → returns 201 { enquiryId }
  → waitUntil: fetch enquiry + customer + listing + vendor details from D1 →
    insert AdminNotification row → Resend email to admin
```

### Admin Moderation (Vendor / Listing)
```
POST /admin/vendors/:id/approve
  → API Worker updates VendorProfile status in D1
  → returns 200
  → waitUntil: insert AdminNotification → Resend email to vendor
```

### CSV Export
```
GET /admin/export?type=interested&from=...&to=...
  → API Worker validates admin JWT
  → D1 query with date range filter
  → Stream rows through CSV transform
  ← Response: Content-Type: text/csv, streamed to browser
```

---

## Security Boundaries

- **JWT secrets:** Workers Secrets only — never in source control or KV values.
- **R2 objects:** private bucket; served only through authenticated API Worker endpoints or short-lived (1-hour) presigned GET URLs.
- **OTP tokens:** hashed before storage in D1; plain OTP never persisted.
- **Agent tools:** each async task function has explicit D1/KV/R2/Bedrock bindings — agents cannot access infrastructure outside declared parameters.
- **All API routes:** JWT validated at the API Worker before any binding access.
- **Role enforcement:** role is read from the signed JWT on every request; never from query params or request body.
