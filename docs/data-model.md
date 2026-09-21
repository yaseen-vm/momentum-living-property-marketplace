# Data Model

> Target schema for the client build spec. Tables/columns marked **(new)** are not yet migrated; **(legacy)** are from the original marketplace scope and pending removal. Build status: [`implementation-status.md`](./implementation-status.md).

All relational data lives in **Cloudflare D1** (SQLite). Binary/document storage uses **Cloudflare R2**. Vector embeddings (v2) live in **Cloudflare Vectorize**.

All primary keys are **UUIDs** (TEXT) generated with `crypto.randomUUID()`. Timestamps are **Unix milliseconds** (INTEGER). JSON is stored in `TEXT` columns.

---

## Entity Overview

```
users ─┬─< enquiries (= leads) ─┬─< lead_matches >── listings (properties & opportunities) ─< listing_photos
       │                        ├─< lead_requests >──┘                 │
       │                        └─< lead_notes                         └── agents (assigned_agent_id)
       └─< otp_tokens                     enquiries.assigned_agent_id ──> agents
site_content (key/value CMS)   admin_notifications   agent_runs
```

---

## D1 Tables

### `users`
Anyone who has verified a mobile number — enquirers and admins.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL DEFAULT '' | Filled from the enquiry details |
| `mobile` | TEXT UNIQUE NOT NULL | E.164 |
| `mobile_verified_at` | INTEGER | Unix ms; NULL until OTP verified |
| `role` | TEXT NOT NULL DEFAULT `customer` | `customer` (= availability enquirer) \| `admin` \| `vendor` *(legacy)* |
| `last_login_at` | INTEGER | Updated on every successful OTP verify |
| `created_at` / `updated_at` | INTEGER NOT NULL | |

Indexes: `(mobile)`, `(created_at)`, `(last_login_at)`.

---

### `otp_tokens`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `mobile` | TEXT NOT NULL | |
| `user_id` | TEXT FK → users | NULL until user row exists |
| `code_hash` | TEXT NOT NULL | HMAC-SHA256(OTP, `JWT_SECRET`), hex |
| `expires_at` | INTEGER NOT NULL | 5-minute TTL |
| `attempts` | INTEGER NOT NULL DEFAULT 0 | Incremented on wrong guess |
| `used_at` | INTEGER | NULL until consumed |
| `created_at` | INTEGER NOT NULL | |

Index: `(mobile)`.

---

### `enquiries` **(migration 0005)** — the lead
One row per availability journey. Created at OTP-verify time (step 2 data), completed at step 3.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `reference_no` | TEXT UNIQUE NOT NULL | Human reference `LD-{year}-{seq:06}`, e.g. `LD-2026-000123`; the sequence is global (next = max + 1, computed in the INSERT) |
| `user_id` | TEXT NOT NULL FK → users | Owner of the enquiry (from JWT) |
| `user_type` | TEXT NOT NULL | `tenant` \| `landlord` \| `management_company` \| `buyer` \| `seller` |
| `contact_kind` | TEXT NOT NULL | `individual` \| `company` \| `landlord` |
| `full_name` | TEXT NOT NULL | Individual name or contact person |
| `company_name` | TEXT | |
| `position` | TEXT | Job title |
| `email` | TEXT NOT NULL | |
| `mobile` | TEXT NOT NULL | Verified E.164 (copied from users) |
| `nationality` | TEXT | Optional / configurable |
| `company_website` | TEXT | |
| `business_type` | TEXT | Company form |
| `ownership_status` | TEXT | Landlord form: `owner` \| `representative` \| `agent` \| `other` |
| `requirements` | TEXT | JSON — see *Requirements JSON* below; NULL until step 3 |
| `stage` | TEXT NOT NULL DEFAULT `verified` | `verified` (details saved) \| `completed` (requirements submitted) |
| `lead_status` | TEXT NOT NULL DEFAULT `new` | `new` \| `contacted` \| `qualified` \| `matching` \| `viewing_requested` \| `negotiation` \| `closed` \| `not_proceeding` |
| `assigned_agent_id` | TEXT FK → agents | Set by admin |
| `match_count` | INTEGER NOT NULL DEFAULT 0 | Denormalised for list views |
| `consent_at` | INTEGER NOT NULL | When the contact/privacy consent box was ticked |
| `completed_at` | INTEGER | When step 3 was submitted |
| `created_at` / `updated_at` | INTEGER NOT NULL | |

Indexes:
- `(user_id, created_at)` — enquirer resumes own enquiries
- `(stage, lead_status, created_at)` — admin lead list default view
- `(user_type, created_at)` — admin filter by tenant / landlord / management company
- `(assigned_agent_id, lead_status)` — per-agent workload

**Requirements JSON** (`requirements` column; `schema_version` for forward compatibility):
```json
{
  "schema_version": 1,
  "location_slugs": ["dubai-jebel-ali", "dubai-al-quoz"],
  "preferred_area": "Near Jebel Ali Free Zone",
  "occupants": 250,
  "beds": 250,
  "rooms": 40,
  "capacity_min": 250,
  "move_in_date": 1790000000000,
  "contract_months": 12,
  "budget_min": 0,
  "budget_max": 450000,
  "budget_period": "year",
  "property_type": "labour_camp",
  "facilities": ["kitchen", "laundry", "ac", "security"],
  "parking": "bus_parking",
  "transport": "required",
  "preference": "lease",
  "other": "Free text"
}
```
Field set varies by `user_type` (see `requirements.md` FR-11 Step 3); unknown keys are stripped by the Zod schema per type (`REQUIREMENTS_SCHEMAS` in `packages/shared/src/availability.ts`). Keys per type:

| `user_type` | Keys (all optional unless marked *) |
|-------------|-------------------------------------|
| `tenant` | `emirates`, `location_slugs`, `preferred_area`, `occupants`*, `rooms`, `beds`, `move_in_date`, `contract_months`, `budget_min`, `budget_max`, `budget_period` (`year`\|`month`), `property_type`, `facilities`, `parking` (`none`\|`car`\|`bus`\|`car_and_bus`), `transport` (`required`\|`not_required`), `other` |
| `landlord` | `emirates`, `location_slugs`, `property_type`*, `capacity`*, `rooms`, `current_occupancy`, `availability_date`, `asking_price`, `price_period` (`year`\|`month`\|`total`), `preference`* (`lease`\|`sale`\|`management`), `contract_preference`, `property_condition` (`new`\|`good`\|`fair`\|`needs_renovation`), `facilities`, `other` |
| `management_company` | `emirates`, `location_slugs`, `company_name`, `managed_capacity`, `capacity_min`, `management_requirements`, `operational_requirements`, `contract_requirements`, `other` |
| `buyer` | `emirates`, `location_slugs`, `property_type`, `capacity_min`, `capacity_max`, `budget_min`, `budget_max`, `timeline`, `other` |
| `seller` | `emirates`, `location_slugs`, `property_type`*, `capacity`, `asking_price`, `timeline`, `facilities`, `other` |

- `emirates`: emirate slugs (`dubai`, `abu-dhabi`, `sharjah`, `ajman`, `umm-al-quwain`, `ras-al-khaimah`, `fujairah`). `location_slugs`: area slugs `{emirate}-{area}` from the shared `LOCATIONS` catalogue (e.g. `dubai-jebel-ali`, `abu-dhabi-mussafah`, `sharjah-other-area`). Empty = anywhere.
- `facilities`: slugs from the shared `FACILITIES` list (`ac`, `kitchen`, `canteen`, `laundry`, `wifi`, `cctv`, `24-7-security`, `prayer-room`, `gym`, `separate-toilets`, `first-aid`, `parking`); compared with listing `amenities` labels after the same slugify.
- `timeline`: `immediate` \| `3_months` \| `6_months` \| `12_months` \| `flexible`. Dates are Unix ms; money is AED.

---

### `lead_matches` **(migration 0005)**
Snapshot of opportunities matched when the enquiry was completed. Also the **access-control list** for opportunity details.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `enquiry_id` | TEXT NOT NULL FK → enquiries | `ON DELETE CASCADE` |
| `listing_id` | TEXT NOT NULL FK → listings | |
| `score` | REAL NOT NULL | Match score 0–100 |
| `created_at` | INTEGER NOT NULL | |

Indexes: `(enquiry_id, listing_id)` UNIQUE, `(listing_id)`.

---

### `lead_requests` **(migration 0006)**
"Request Information" / "Request Viewing" actions from results and detail pages.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `enquiry_id` | TEXT NOT NULL FK → enquiries | `ON DELETE CASCADE` |
| `listing_id` | TEXT NOT NULL FK → listings | Must exist in `lead_matches` for the enquiry |
| `kind` | TEXT NOT NULL | `info` \| `viewing` |
| `message` | TEXT | Optional, ≤ 1,000 chars |
| `preferred_date` | INTEGER | Viewing only |
| `created_at` | INTEGER NOT NULL | |

Indexes: `(enquiry_id, created_at)`, `(enquiry_id, listing_id, kind)` UNIQUE (no duplicate requests).

---

### `lead_notes` **(new)** — replaces `booking_notes`
Immutable admin note timeline per lead.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `enquiry_id` | TEXT NOT NULL FK → enquiries | |
| `author_id` | TEXT NOT NULL FK → users | Admin |
| `body` | TEXT NOT NULL | |
| `status_change` | TEXT | e.g. `new→contacted` when the note accompanied a status change |
| `created_at` | INTEGER NOT NULL | |

Index: `(enquiry_id, created_at)`.

---

### `agents` **(migration 0004)**
Public agent profiles, managed by admin. Agents do not log in (v1). Seeded with three `[AGENT NAME]` placeholder profiles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Placeholder `[AGENT NAME]` until supplied |
| `position` | TEXT NOT NULL | e.g. *Labour Accommodation Specialist*; seed `[AGENT POSITION]` |
| `specialization` | TEXT | Area / property type |
| `languages` | TEXT NOT NULL DEFAULT `'[]'` | JSON array |
| `phone` | TEXT | E.164 |
| `email` | TEXT | |
| `whatsapp` | TEXT | E.164, used for `wa.me` links |
| `photo_r2_key` | TEXT | `public-media/agents/...` |
| `bio` | TEXT | Short |
| `display_order` | INTEGER NOT NULL DEFAULT 0 | |
| `is_active` | INTEGER NOT NULL DEFAULT 1 | Inactive agents hidden publicly, kept for lead history |
| `created_at` / `updated_at` | INTEGER NOT NULL | |

Index: `idx_agents_active_order (is_active, display_order)`, covering `GET /agents`.

---

### `site_content` **(migration 0004)**
Admin-editable corporate content (CMS). One row per content block; value is JSON. The TypeScript shapes and placeholder seed live in `packages/shared/src/content.ts` (`SiteContent`, `DEFAULT_SITE_CONTENT`); the migration seed is generated from them, and the web app falls back to them per field when a value is missing or the API is unreachable.

| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT PK | See keys below |
| `value` | TEXT NOT NULL | JSON |
| `updated_by` | TEXT FK → users | |
| `updated_at` | INTEGER NOT NULL | |

| Key | JSON shape (abridged) |
|-----|----------------------|
| `home` | `{ about_intro, audiences[] }` (hero headline and text are fixed by the spec, not CMS fields) |
| `about` | `{ who_we_are, what_we_do[{title, text}], who_we_work_with[{title, text}], why_us, approach_steps[{title, text}] }` |
| `why_choose_us` | `{ intro, features[{title, summary, text, icon}] }`: `summary` on Home cards, `text` on the Why Choose Us page; `icon` is one of `compass, network, users, zap, line-chart, handshake, shield, headset` |
| `md_profile` | `{ name, title, photo_key, biography, experience, philosophy, vision, commitment_clients, commitment_standards, market_vision }` |
| `md_note` | `{ heading, body, signature_name }` (`body` paragraphs separated by blank lines) |
| `company` | `{ phone, whatsapp, email, general_email, sales_email, management_email, address, working_hours, socials{linkedin, instagram, other[]} }` |
| `legal_privacy` / `legal_terms` | `{ body_markdown, updated_on }`: `body_markdown` supports `## heading`, `- item` lists and paragraphs, rendered as text (never as HTML) |
| `availability_config` | `{ enable_buyer, enable_seller, nationality_field: "hidden"\|"optional"\|"required" }` |

Seeded by migration 0004 with `[PLACEHOLDER]` values (never invented data). The descriptive corporate copy in `home`, `about` and `why_choose_us` is neutral draft wording for the client to approve; it contains no facts, figures or claims.

---

### `listings` — properties & opportunities
**Rework:** listings become **admin-managed** records representing either a property or an opportunity. The `vendor_id NOT NULL` constraint must be relaxed (table rebuild migration — SQLite cannot drop NOT NULL in place). Migrations 0005 and 0006 added the columns marked **(0005)** / **(0006)**; the others marked **(new)** come with the admin properties rebuild (Stage 5). `location_slug` should come from the shared `LOCATIONS` catalogue so location filters can match it.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `reference_no` | TEXT UNIQUE **(0005)** | Internal/public reference, e.g. `ML-LC-0042` |
| `opportunity_kind` | TEXT NOT NULL DEFAULT `accommodation_lease` **(0005)** | `accommodation_lease` \| `accommodation_sale` \| `tenant_demand` \| `management` \| `investor_demand` |
| `vendor_id` | TEXT FK → vendor_profiles | *(legacy)* — **nullable** after rebuild; NULL for admin-created rows |
| `created_by` | TEXT FK → users **(new)** | Admin who created it |
| `assigned_agent_id` | TEXT FK → agents **(0005)** | Shown on card/detail as contact |
| `source_name` / `source_listing_id` | TEXT | Ingestion dedup (v2) |
| `type` | TEXT NOT NULL | Property type: `labour_camp` \| `warehouse` \| `land` (shared type literal must be updated from `property\|plot\|room`) |
| `status` | TEXT NOT NULL DEFAULT `draft` | `draft` \| `approved` (= published) \| `archived` **(new)**; legacy vendor values `pending` \| `rejected` \| `rented_sold` \| `withdrawn` |
| `is_available` | INTEGER NOT NULL DEFAULT 1 **(0005)** | Admin toggle; unavailable rows never match |
| `title` | TEXT NOT NULL | Public name/reference |
| `summary` | TEXT **(0005)** | Short card description |
| `description` | TEXT | Detail page |
| `price` | REAL | Rent/sale price (nullable for demand/management kinds) |
| `price_period` | TEXT **(0005)** | `year` \| `month` \| `total` |
| `currency` | TEXT NOT NULL DEFAULT `AED` | |
| `show_price` | INTEGER NOT NULL DEFAULT 1 **(0005)** | Hide price → "on request" |
| `location_slug` | TEXT NOT NULL | Normalised area slug, e.g. `dubai-jebel-ali` |
| `location_text` | TEXT NOT NULL | **General area only** (shown to enquirers) |
| `latitude` / `longitude` | REAL | Admin-only unless `show_map = 1` |
| `show_map` | INTEGER NOT NULL DEFAULT 0 **(0006)** | Show the location map on the opportunity detail page |
| `availability_date` | INTEGER **(0005)** | Unix ms |
| `size_sqft`, `bedrooms`, `bathrooms` | INTEGER | |
| `num_rooms`, `persons_per_room`, `room_size_sqft`, `total_capacity` | | Labour camp fields (migration 0002) |
| `mohre_certified`, `ejari_registered` | INTEGER | Labour camp flags |
| `num_loading_bays`, `year_built`, `freehold` | | Warehouse / land fields |
| `security_deposit_pct`, `commission_pct`, `ejari_fee`, `admin_fee` | REAL | Commercial terms |
| `terms` | TEXT **(0006)** | Free-text commercial terms for detail page |
| `amenities` | TEXT | JSON array — "facilities" |
| `owner_name`, `owner_contact` | TEXT **(new)** | **Confidential** — admin API only, never returned to enquirers |
| `internal_notes` | TEXT **(new)** | Admin only |
| `admin_note`, `reviewed_at` | | Legacy approval fields |
| `published_at` | INTEGER | Set when status → approved |
| `archived_at` | INTEGER **(new)** | |
| `created_at` / `updated_at` | INTEGER NOT NULL | |

Indexes:
- `(status, is_available, opportunity_kind, location_slug, total_capacity)` **(0005)** `idx_listings_matching` — matching engine candidate query
- `(opportunity_kind, status, updated_at)` **(new)** — admin list
- `(reference_no)` UNIQUE WHERE reference_no IS NOT NULL **(0005)**
- `(source_name, source_listing_id)` UNIQUE WHERE source_listing_id IS NOT NULL
- `(status, type, location_slug, price)` *(legacy browse index — drop with browse page)*
- `(vendor_id)` *(legacy)*

**Matching kinds by user type:**

| `enquiries.user_type` | Matches `listings.opportunity_kind` |
|----------------------|-------------------------------------|
| `tenant` | `accommodation_lease` |
| `buyer` | `accommodation_sale` |
| `landlord` | `tenant_demand`, `management` |
| `management_company` | `accommodation_lease`, `management` |
| `seller` | `investor_demand` |

`tenant_demand` / `investor_demand` rows are created by admin and must be anonymised (no enquirer identity).

---

### `listing_photos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `listing_id` | TEXT NOT NULL FK → listings | |
| `r2_key` | TEXT NOT NULL | `listing-photos/{listing_id}/{uuid}.{ext}` |
| `alt_text` | TEXT **(new)** | SEO/accessibility |
| `display_order` | INTEGER NOT NULL DEFAULT 0 | |
| `created_at` | INTEGER NOT NULL | |

Index: `(listing_id, display_order)`.

---

### `admin_notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `type` | TEXT NOT NULL | `new_lead` \| `lead_request`; legacy `new_booking` \| `vendor_pending` \| `listing_pending` |
| `payload` | TEXT NOT NULL | JSON, e.g. `{ enquiry_id, reference_no, user_type }` |
| `read_at` | INTEGER | NULL = unread |
| `created_at` | INTEGER NOT NULL | |

Indexes: `(read_at)`, `(created_at)`.

---

### `agent_runs`
Audit trail for async tasks (unchanged).

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID |
| `user_id` | TEXT FK → users | NULL for system runs |
| `agent_type` | TEXT NOT NULL | `otp_send` \| `notification` \| `csv_export` \| `embedding` \| `moderation` *(legacy)* |
| `status` | TEXT NOT NULL | `pending` \| `running` \| `completed` \| `failed` |
| `input`, `output`, `tool_calls`, `error` | TEXT | JSON / text |
| `started_at` | INTEGER NOT NULL | |
| `completed_at` | INTEGER | |

Indexes: `(agent_type)`, `(started_at)`.

---

### Legacy tables (original marketplace scope — pending removal)

Kept in the database until the client confirms the vendor portal is dropped; not used by the v1 UI.

| Table | Replaced by |
|-------|------------|
| `vendor_profiles` (incl. migration 0002 columns `trade_licence_no`, `vat_no`, `authorized_signatory`, `whatsapp_no`) | Admin-managed `listings` + landlord enquiries |
| `vendor_documents` | Optional landlord supporting documents in `enquiries.requirements.documents[]` (R2 keys) |
| `bookings` (incl. migration 0003 contact columns) | `enquiries` + `lead_requests` |
| `booking_notes` | `lead_notes` |
| `shortlists` | — (not in spec) |

---

## R2 Objects

| Key pattern | Content | Who can read |
|------------|---------|--------------|
| `public-media/{area}/{uuid}.{ext}` **(new)** | Agent photos, MD portrait, corporate imagery | Public (served by Worker with long cache) |
| `listing-photos/{listing_id}/{uuid}.{ext}` | Property/opportunity photos | Admin, or enquirer via signed URL when listing is in their matches |
| `enquiry-docs/{enquiry_id}/{uuid}.{ext}` **(new)** | Landlord supporting documents | Admin only (signed URL) |
| `vendor-docs/{vendor_id}/{uuid}.{ext}` *(legacy)* | Vendor documents | Admin only |

The bucket is **private**. Files are uploaded through the API Worker (`POST /upload/file`) and delivered via `GET /upload/files/:key` which requires a valid HMAC signature + expiry (1-hour TTL) for every prefix except `public-media/`.

---

## Cloudflare KV

| Key pattern | Value | TTL |
|------------|-------|-----|
| `otp:rate:{mobile}` | send count | 600 s |
| `otp:lock:{mobile}` | `"1"` | 900 s |
| `rl:enquiry:{user_id}` | enquiries created this hour | 3,600 s |
| `rl:request:{user_id}` | info/viewing requests this hour (limit 10) | 3,600 s |
| `rl:export:{user_id}` | exports this hour | 3,600 s |
| `config:*` | Platform config | none |

KV is for rate-limit counters and config only — never primary data.

---

## Cloudflare Vectorize (v2)

| Index | Dimensions | Model | Content |
|-------|-----------|-------|---------|
| `listing-embeddings` | 768 | `@cf/baai/bge-base-en-v1.5` | Opportunity type + title + description |

v2 only: semantic re-ranking of matches using the enquirer's free-text requirements.
