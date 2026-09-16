# Data Model

All relational data lives in **Cloudflare D1** (SQLite). Binary/document storage uses **Cloudflare R2**. Vector embeddings (v2) live in **Cloudflare Vectorize**.

All primary keys are **UUIDs** (TEXT) generated with `crypto.randomUUID()` — available built-in on the Cloudflare Workers runtime, no library required. Timestamps are **Unix milliseconds** (INTEGER).

---

## D1 Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | |
| `mobile` | TEXT UNIQUE NOT NULL | E.164 format |
| `mobile_verified_at` | INTEGER | Unix ms; NULL until OTP verified |
| `role` | TEXT NOT NULL | `customer` \| `vendor` \| `admin` |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Index: `(mobile)` — OTP lookup and uniqueness check.

---

### `otp_tokens`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `mobile` | TEXT NOT NULL | |
| `user_id` | TEXT FK → users | NULL until user row exists |
| `code_hash` | TEXT NOT NULL | bcrypt hash of the 6-digit OTP |
| `expires_at` | INTEGER NOT NULL | Unix ms; 5-minute TTL |
| `attempts` | INTEGER NOT NULL DEFAULT 0 | Incremented on wrong guess |
| `used_at` | INTEGER | Unix ms; NULL until consumed |
| `created_at` | INTEGER NOT NULL | Unix ms |

Index: `(mobile)` — token lookup at verification time.

---

### `vendor_profiles`
One row per vendor user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT UNIQUE NOT NULL FK → users | |
| `vendor_type` | TEXT NOT NULL | `landlord` \| `company` \| `agent` \| `broker` |
| `status` | TEXT NOT NULL DEFAULT `pending` | `pending` \| `approved` \| `rejected` |
| `company_name` | TEXT | |
| `licence_no` | TEXT | |
| `admin_note` | TEXT | Rejection reason or remarks |
| `reviewed_at` | INTEGER | Unix ms |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Index: `(status)` — admin verification queue.

---

### `vendor_documents`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `vendor_id` | TEXT NOT NULL FK → vendor_profiles | |
| `label` | TEXT NOT NULL | e.g. `Trade Licence`, `National ID` |
| `r2_key` | TEXT NOT NULL | Cloudflare R2 object key |
| `uploaded_at` | INTEGER NOT NULL | Unix ms |

---

### `listings`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `vendor_id` | TEXT NOT NULL FK → vendor_profiles | |
| `source_name` | TEXT NOT NULL DEFAULT `platform` | `platform` \| adapter ID for ingest listings |
| `source_listing_id` | TEXT | Provider's own ID; used for deduplication |
| `type` | TEXT NOT NULL | `property` \| `plot` \| `room` |
| `status` | TEXT NOT NULL DEFAULT `draft` | `draft` \| `pending` \| `approved` \| `rejected` \| `rented_sold` \| `withdrawn` |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `price` | REAL NOT NULL | |
| `currency` | TEXT NOT NULL DEFAULT `AED` | ISO 4217 |
| `location_slug` | TEXT NOT NULL | Normalised slug for indexed filtering |
| `location_text` | TEXT NOT NULL | Human-readable address |
| `latitude` | REAL | |
| `longitude` | REAL | |
| `size_sqft` | INTEGER | |
| `bedrooms` | INTEGER | |
| `bathrooms` | INTEGER | |
| `amenities` | TEXT | JSON array of strings |
| `admin_note` | TEXT | Rejection/change-request remarks |
| `reviewed_at` | INTEGER | Unix ms |
| `published_at` | INTEGER | Unix ms; set when status → approved |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Indexes:
- `(status, type, location_slug, price)` — covers all public search filter combinations
- `(vendor_id)` — vendor dashboard listing queries
- `(source_name, source_listing_id)` UNIQUE — deduplication for ingested listings

---

### `listing_photos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `listing_id` | TEXT NOT NULL FK → listings | |
| `r2_key` | TEXT NOT NULL | Cloudflare R2 object key |
| `display_order` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` | INTEGER NOT NULL | Unix ms |

Index: `(listing_id, display_order)`.

---

### `enquiries`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `customer_id` | TEXT NOT NULL FK → users | |
| `listing_id` | TEXT NOT NULL FK → listings | |
| `status` | TEXT NOT NULL DEFAULT `pending` | `pending` \| `owner_confirmed` \| `customer_contacted` \| `closed` |
| `admin_note` | TEXT | Internal deal-tracking note |
| `created_at` | INTEGER NOT NULL | Unix ms |
| `updated_at` | INTEGER NOT NULL | Unix ms |

Indexes:
- `(customer_id, listing_id)` UNIQUE — one enquiry per customer-listing pair
- `(status)` — admin queue filters
- `(created_at)` — date-range CSV export queries

---

### `enquiry_notes`
Immutable timeline of admin notes per enquiry.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `enquiry_id` | TEXT NOT NULL FK → enquiries | |
| `body` | TEXT NOT NULL | |
| `created_at` | INTEGER NOT NULL | Unix ms |

---

### `admin_notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `type` | TEXT NOT NULL | `new_enquiry` \| `vendor_pending` \| `listing_pending` |
| `payload` | TEXT NOT NULL | JSON |
| `read_at` | INTEGER | Unix ms; NULL = unread |
| `created_at` | INTEGER NOT NULL | Unix ms |

Indexes: `(read_at)` — unread badge count, `(created_at)`.

---

### `shortlists`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT NOT NULL FK → users | |
| `listing_id` | TEXT NOT NULL FK → listings | |
| `created_at` | INTEGER NOT NULL | Unix ms |

Index: `(user_id, listing_id)` UNIQUE.

---

### `agent_runs`
Audit trail for every async agent task invocation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | NULL for system-triggered runs |
| `agent_type` | TEXT NOT NULL | `otp_send` \| `notification` \| `moderation` \| `csv_export` \| `embedding` |
| `status` | TEXT NOT NULL | `pending` \| `running` \| `completed` \| `failed` |
| `input` | TEXT | JSON |
| `output` | TEXT | JSON |
| `tool_calls` | TEXT | JSON array of `{tool, input, output}` |
| `error` | TEXT | NULL on success |
| `started_at` | INTEGER NOT NULL | Unix ms |
| `completed_at` | INTEGER | Unix ms |

---

## R2 Objects

| Key pattern | Content |
|------------|---------|
| `vendor-docs/{vendor_id}/{uuid}.{ext}` | Vendor uploaded documents (PDF, JPG, PNG) |
| `listing-photos/{listing_id}/{uuid}.{ext}` | Listing photos (JPG, PNG, WebP) |

All R2 objects are in a **private bucket**. Served through authenticated API Worker endpoints or short-lived (1-hour) presigned GET URLs. Never publicly accessible by key.

---

## Cloudflare KV

| Key pattern | Value | TTL |
|------------|-------|-----|
| `otp:rate:{mobile}` | resend count (integer string) | 600 s (10 min) |
| `otp:lock:{mobile}` | `"1"` | 900 s (15 min lockout) |
| `config:*` | Platform config values | No TTL |

KV is used for rate-limit counters and config only — not for primary application data.

---

## Cloudflare Vectorize (v2)

| Index | Dimensions | Model | Content |
|-------|-----------|-------|---------|
| `listing-embeddings` | 768 | `@cf/baai/bge-base-en-v1.5` | Listing type + title + description embedding |

Metadata stored alongside each vector:
```json
{ "listing_id": "...", "type": "property", "location_slug": "dubai-marina", "price": 85000, "status": "approved" }
```

Write path: when a listing transitions to `approved`, a `waitUntil` task embeds `"{type}: {title}\n{description}"` (truncated to 512 tokens) via Workers AI and upserts to Vectorize.

Query path: user's natural-language search string is embedded server-side, Vectorize returns nearest-neighbour listing IDs, merged with a D1 filter query for final results.
