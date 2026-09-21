# REST API Specification

> Target API for the client build spec. Endpoints are tagged **[built]**, **[rework]** (exists, must change), **[new]** or **[legacy]** (original marketplace scope, pending removal). Build status: [`implementation-status.md`](./implementation-status.md).

**Base URL:** `https://api.momentum-living.workers.dev` (custom domain TBD — `api.labourcamps.com`)

All endpoints require `Authorization: Bearer <jwt>` unless marked **public**. Bodies are JSON (except uploads). Timestamps are Unix ms. All request bodies are validated with Zod; unknown fields are stripped.

**Error format:**
```json
{ "error": { "code": "NOT_FOUND", "message": "Enquiry not found" } }
```
Codes: `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED` · `CONFLICT` · `NOT_QUALIFIED` · `SERVICE_UNAVAILABLE` · `INTERNAL_ERROR`

`VALIDATION_ERROR` messages are prefixed with the failing field, e.g. `"occupants: Must be at least 1"`.

---

## Auth

### `POST /auth/otp/send` — public **[built]**
**Request** `{ "mobile": "+971501234567" }`
**Response `200`** `{ "expires_in": 300, "resend_after": 60 }`
**Errors:** `422 VALIDATION_ERROR` (invalid E.164), `429 RATE_LIMITED` (3 sends / 10 min, or locked), `503 SERVICE_UNAVAILABLE` (SMS provider not configured outside development)

The OTP is **never** included in any response. The fixed development OTP is only used when `ENVIRONMENT = "development"` and `MSG91_AUTH_KEY` is unset/placeholder.

### `POST /auth/otp/verify` — public **[built]**
**Request** `{ "mobile": "+971501234567", "code": "482931" }`
**Response `200`**
```json
{ "token": "<jwt>", "user": { "id": "...", "role": "customer", "mobile_verified": true } }
```
**Errors:** `400 INVALID_CODE`, `400 EXPIRED`, `423 LOCKED` (15-min lock after 5 failures)

**[rework]** remove the `intent: "vendor"` role upgrade (legacy). New users get role `customer` (= enquirer). Admin role is only ever set directly in D1.

### `POST /auth/signout` **[built]**
Client-side discard. **Response `200`** `{ "ok": true }`

---

## Public Content **[built]**

Routes: `apps/api/src/routes/content.ts`, `apps/api/src/routes/agents.ts`. Response types: `ContentItemResponse`, `ContentAllResponse`, `AgentsResponse` in `@momentum/shared`.

### `GET /content/:key` — public
Keys: `home`, `about`, `why_choose_us`, `md_profile`, `md_note`, `company`, `legal_privacy`, `legal_terms`, `availability_config`.
**Response `200`** `{ "key": "md_profile", "value": { ... }, "updated_at": 1790000000000 }`
**Errors:** `404 NOT_FOUND` for an unknown key or a missing row.
Cached at the edge (`Cache-Control: public, max-age=300`).

### `GET /content` — public
All public keys in one response (used on first page load): `{ "items": { "home": {...}, "company": {...}, ... } }`. Same `Cache-Control`.

### `GET /agents` — public
Active agents ordered by `display_order`. `photo_url` is `null` unless `photo_r2_key` is under `public-media/`. Same `Cache-Control`.
```json
{
  "agents": [
    {
      "id": "...", "name": "[AGENT NAME]", "position": "Labour Accommodation Specialist",
      "specialization": "[Area / Property Type]", "languages": ["English", "Arabic"],
      "phone": null, "email": null, "whatsapp": null,
      "photo_url": "https://api.../upload/files/public-media/agents/....jpg"
    }
  ]
}
```

---

## Availability Journey **[built]**

Route: `apps/api/src/routes/availability.ts`. Request schemas and response types: `packages/shared/src/availability.ts`.

All endpoints require a JWT with `role = customer` and `mobile_verified = true` (obtained at the OTP step); other roles get `403 FORBIDDEN`. Every handler scopes by `user_id = jwt.sub`.

### `POST /availability/enquiries`
Called right after OTP verification with the Step 1 + Step 2 data.

**Request**
```json
{
  "user_type": "tenant",
  "contact_kind": "company",
  "full_name": "Contact Person",
  "company_name": "Example Contracting LLC",
  "position": "Procurement Manager",
  "email": "person@example.com",
  "nationality": null,
  "company_website": null,
  "business_type": "Construction",
  "ownership_status": null,
  "consent": true
}
```
Validation: `contact_kind` selects the schema — `individual` (user_type `tenant`\|`buyer`), `company` (`tenant`\|`buyer`\|`management_company`), `landlord` (`landlord`\|`seller`); see `requirements.md` FR-11 Step 2. `consent` must be `true`. `buyer` / `seller` are rejected unless enabled in `availability_config`; `nationality` is required when `availability_config.nationality_field = "required"`. `mobile` is taken from the verified user — never from the body. Sets `users.name` if it is empty.

**Response `201`** `{ "enquiry_id": "...", "reference_no": "LD-2026-000123", "stage": "verified" }`
**Errors:** `422 VALIDATION_ERROR`, `429 RATE_LIMITED` (5 / user / hour)

### `GET /availability/enquiries`
Caller's own enquiries (resume journey). `{ "enquiries": [{ id, reference_no, user_type, stage, created_at }] }`

### `GET /availability/enquiries/:id`
Caller's own enquiry with details and requirements. `404` if not owned.

### `PUT /availability/enquiries/:id/requirements`
Step 3. Validated with the Zod schema for the enquiry's `user_type` (keys per type: `data-model.md` → Requirements JSON).

**Request** — the requirements object (see `data-model.md` → Requirements JSON).

**Effects (single request):**
1. Save `requirements`, set `stage = completed`, `completed_at`.
2. Run matching (indexed D1 candidate query → in-Worker scoring → top 20) and insert `lead_matches`.
3. Set `lead_status = new`, `match_count`.
4. `waitUntil`: notification agent → `admin_notifications` (`new_lead`) + admin email.

**Response `200`** `{ "enquiry_id": "...", "stage": "completed", "match_count": 7 }`
**Errors:** `404`, `422 VALIDATION_ERROR`, `409 CONFLICT` (already completed — requirements are immutable after completion; start a new enquiry)

### `GET /availability/enquiries/:id/matches`
Step 4 results. **Only** when the enquiry is owned by the caller **and** `stage = completed`; otherwise `403 NOT_QUALIFIED`. Matches whose listing has since been unpublished or marked unavailable are omitted. `price` / `price_period` are `null` when `show_price = false`; `agent` is `null` when no active agent is assigned. `cover_photo_url` is currently an unsigned `/upload/files/` URL (signed URLs arrive with Stage 6). `requests` lists the request kinds (`info`, `viewing`) the enquirer has already sent for that opportunity.

```json
{
  "enquiry": { "id": "...", "reference_no": "LD-2026-000123", "user_type": "tenant" },
  "matches": [
    {
      "id": "...", "reference_no": "ML-LC-0042", "opportunity_kind": "accommodation_lease",
      "title": "Labour Accommodation — Jebel Ali", "type": "labour_camp",
      "location_text": "Jebel Ali, Dubai", "total_capacity": 400, "num_rooms": 50,
      "persons_per_room": 8, "amenities": ["kitchen", "laundry"],
      "availability_date": 1790000000000,
      "price": 480000, "price_period": "year", "currency": "AED", "show_price": true,
      "summary": "...", "cover_photo_url": "<signed url, 1 h>", "score": 86,
      "agent": { "id": "...", "name": "...", "whatsapp": "...", "phone": "...", "email": "..." },
      "requests": ["info"]
    }
  ]
}
```
Never includes `owner_name`, `owner_contact`, `internal_notes`, exact coordinates (unless `show_map`), or other enquirers' data.

### `GET /availability/opportunities/:id?enquiry_id=...`
Opportunity detail. Allowed only if `(enquiry_id, listing_id)` exists in `lead_matches` and the enquiry is owned by the caller and completed; else `403 NOT_QUALIFIED`. A matched listing that has since been unpublished or marked unavailable returns `404 NOT_FOUND`. Returns the card fields (without `cover_photo_url` / `score`) plus `description`, `terms`, commercial fields, all photos, labour-camp/warehouse/land specs, and `latitude` / `longitude` only if `show_map` (otherwise `null`). Photo URLs are unsigned until Stage 6, like `cover_photo_url`.

```json
{
  "enquiry": { "id": "...", "reference_no": "LD-2026-000123", "user_type": "tenant" },
  "opportunity": {
    "id": "...", "reference_no": "ML-LC-0042", "title": "...", "...card fields": "...",
    "requests": [],
    "description": "...", "terms": "...",
    "photos": [{ "id": "...", "url": "<signed url, 1 h>" }],
    "size_sqft": null, "room_size_sqft": 180, "mohre_certified": true, "ejari_registered": true,
    "num_loading_bays": null, "year_built": null, "freehold": false,
    "security_deposit_pct": 5, "commission_pct": 2, "ejari_fee": 220, "admin_fee": null,
    "latitude": null, "longitude": null
  }
}
```
Never includes `owner_name`, `owner_contact` or `internal_notes`.

### `POST /availability/enquiries/:id/requests`
Request information or a viewing. Validated with `leadRequestSchema` (`packages/shared/src/availability.ts`): `kind` = `info` | `viewing`, `message` ≤ 1,000 chars (optional), `preferred_date` Unix ms (optional, kept for `viewing` only).

**Request** `{ "listing_id": "...", "kind": "viewing", "message": "Can we visit next week?", "preferred_date": 1790500000000 }`
**Effects:** insert `lead_requests`; for `viewing`, move `lead_status` to `viewing_requested` if currently `new|contacted|qualified|matching`; `waitUntil` admin notification (`lead_request`) + email.
**Response `201`** `{ "request_id": "..." }`
**Errors:** `422 VALIDATION_ERROR`, `403 NOT_QUALIFIED` (enquiry not owned/completed, or listing not in matches or no longer available), `409 CONFLICT` (duplicate kind for that listing), `429 RATE_LIMITED` (10 / user / hour, `rl:request:{user_id}`)

---

## Upload **[built]**

### `POST /upload/file` **[built]**
Multipart upload through the Worker to R2. **Auth:** admin for `listing_photo` and `public_media`; enquirer for `enquiry_doc`.

Form fields: `context` = `listing_photo` | `public_media` | `enquiry_doc` (+ legacy `vendor_doc`), `file`, and optional `area` for `public_media` (`agents` | `md` | `site`), `listing_id` / `enquiry_id` where relevant.
Types: images `image/jpeg|png|webp` (≤ 10 MB); docs add `application/pdf` (≤ 5 MB). `public_media` objects get 24-hour cache; others 1-hour.
**Response `201`** `{ "key": "listing-photos/.../....jpg" }`

### `GET /upload/files/:key` **[built → rework]**
Currently **unauthenticated for non-public keys — must be fixed.** `public-media/*` is served publicly with long cache. Target for other prefixes:
- `public-media/*` — public, `Cache-Control: public, max-age=86400`.
- All other prefixes — require `?exp=<unix ms>&sig=<hex>` where `sig = HMAC-SHA256(key + exp, JWT_SECRET)` and `exp` is in the future (URLs minted with 1-hour TTL by the API when it returns photo/doc URLs). Otherwise `403`.

---

## Admin

All `/admin/*` endpoints require `role = admin`, checked on every handler.

### Leads **[built]** (replaces `/admin/bookings`)

#### `GET /admin/leads`
Query: `user_type`, `lead_status`, `assigned_agent_id`, `stage` (default `completed`), `from`, `to`, `q` (name / company / mobile / reference), `limit`, `offset`.
```json
{
  "leads": [
    { "id": "...", "reference_no": "LD-2026-000123", "user_type": "tenant",
      "full_name": "...", "company_name": "...", "mobile": "+9715...", "email": "...",
      "lead_status": "new", "assigned_agent": { "id": "...", "name": "..." },
      "match_count": 7, "request_count": 1, "created_at": 1790000000000 }
  ],
  "total": 58
}
```

#### `GET /admin/leads/:id`
Full lead: details, requirements, matches (with listing refs), requests, notes timeline.

#### `PATCH /admin/leads/:id`
**Request** `{ "lead_status": "contacted", "assigned_agent_id": "...", "note": "Called, sending options" }` (all optional). A status change with a note writes a `lead_notes` row with `status_change`.
**Response `200`** — updated lead.

#### `POST /admin/leads/:id/notes`
**Request** `{ "body": "..." }` → **`201`** `{ "note_id": "..." }`

#### `POST /admin/leads/:id/rematch`
Re-run matching against current inventory (e.g. after adding properties); replaces `lead_matches`. **`200`** `{ "match_count": 9 }`

### Properties / Opportunities **[built]** (replaces listing approval queue)

#### `GET /admin/properties`
Query: `opportunity_kind`, `type`, `status`, `is_available`, `location`, `q`, `limit`, `offset`. Includes confidential fields.

#### `GET /admin/properties/:id`
#### `POST /admin/properties`
Create. Body: all `listings` columns from `data-model.md` (admin-writable), `photo_keys[]` with optional `alt_text`. `reference_no` auto-generated if omitted. **`201`** `{ "id": "...", "reference_no": "ML-LC-0042" }`
#### `PATCH /admin/properties/:id`
Partial update, including `status` (`draft` | `approved` | `archived`) and `photo_keys` reorder.
#### `POST /admin/properties/:id/availability`
`{ "is_available": false }`
#### `POST /admin/properties/:id/archive`
Soft delete (`status = archived`, `archived_at`). Archived rows never match; existing `lead_matches` history kept.

### Agents **[built]**
- `GET /admin/agents` — all, including inactive
- `POST /admin/agents` — `{ name, position, specialization, languages[], phone, email, whatsapp, photo_key, bio, display_order }` → `201`
- `PATCH /admin/agents/:id` — partial, incl. `is_active`
- `DELETE /admin/agents/:id` — hard delete only if no leads/properties reference it; else `409` (deactivate instead)

### Corporate Content **[built]**
- `GET /admin/content` — all keys
- `PUT /admin/content/:key` — `{ "value": { ... } }` validated per key schema → `200`

### Export **[built]**
#### `GET /admin/export`
| Param | Values |
|-------|--------|
| `type` | `leads` \| `enquirers` (legacy `customers` \| `owners` removed) |
| `date_field` | `created` \| `last_login` (enquirers) |
| `period` | `24h` \| `2d` \| `7d` \| `30d` \| `custom` |
| `from` / `to` | Unix ms (custom) |
| `user_type` / `lead_status` | optional filters (leads) |

Columns — `leads`: `reference_no, created_at, user_type, full_name, company_name, position, email, mobile, lead_status, assigned_agent, match_count, request_count, requirements_summary`; `enquirers`: `name, mobile, mobile_verified_at, signup_date, last_login_at`.
**`200`** `text/csv` attachment. Rate limit 5 / admin / hour. Range ≤ 366 days.

### Reports **[built]**
#### `GET /admin/reports?from=&to=`
```json
{
  "leads": { "total": 58, "by_status": { "new": 12, "contacted": 9, "...": 0 },
             "by_user_type": { "tenant": 30, "landlord": 14, "management_company": 8, "buyer": 4, "seller": 2 } },
  "requests": { "info": 21, "viewing": 9 },
  "properties": { "total": 40, "available": 31, "by_kind": { "accommodation_lease": 25, "...": 0 } },
  "enquirers": { "verified": 140 }
}
```

### Notifications **[built]**
- `GET /admin/notifications?unread=true` → `{ count, items[{ id, type: "new_lead"|"lead_request", payload, created_at }] }`
- `POST /admin/notifications/:id/read` → `{ ok: true }`
- `POST /admin/notifications/read-all` → `{ ok: true }`

---

## Legacy endpoints (original marketplace scope — pending removal)

These exist in `apps/api/src/routes/` today but are **not part of the client spec**. They must not be reachable from the v1 UI; remove once the client confirms.

| Endpoint(s) | Status | Notes |
|-------------|--------|-------|
| `GET /listings`, `GET /listings/:id` | **[legacy — security issue]** | Currently **public/unauthenticated** — exposes all approved inventory, violating the no-listing / access-control rule. Remove (replaced by `/availability/*`). |
| `POST /vendor/register`, `POST /vendor/documents`, `GET/PUT /vendor/profile` | [legacy] | Vendor self-onboarding |
| `GET/POST /vendor/listings`, `GET/PATCH/PUT/DELETE /vendor/listings/:id`, `POST /vendor/listings/:id/submit\|withdraw` | [legacy] | Vendor listing management |
| `GET/PUT /customer/profile` | [legacy] | Replaced by enquiry details |
| `GET/POST /customer/bookings` | [legacy] | Replaced by `/availability/enquiries/:id/requests` |
| `GET/POST/DELETE /customer/shortlist` | [legacy] | Not in spec |
| `GET /admin/vendors`, `GET /admin/vendors/:id`, `POST /admin/vendors/:id/approve\|reject` | [legacy] | Vendor verification queue |
| `GET /admin/listings`, `POST /admin/listings/:id/approve\|request-changes\|reject` | [legacy] | Replaced by `/admin/properties` |
| `GET /admin/bookings`, `PATCH /admin/bookings/:id`, `POST /admin/bookings/:id/notes` | [legacy] | Replaced by `/admin/leads` |

---

## Utility

### `GET /health` — public **[built]**
`{ "status": "ok" }`
