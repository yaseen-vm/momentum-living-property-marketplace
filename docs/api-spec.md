# REST API Specification

**Base URL:** `https://api.property-marketplace.workers.dev`

All endpoints require `Authorization: Bearer <jwt>` unless marked **public**. All request and response bodies are JSON. Timestamps are Unix milliseconds.

**Error format** (all errors):
```json
{ "error": { "code": "NOT_FOUND", "message": "Listing not found" } }
```
Common codes: `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_ERROR` · `RATE_LIMITED` · `CONFLICT` · `INTERNAL_ERROR`

---

## Auth

### `POST /auth/otp/send` — public
Send an OTP to the given mobile number.

**Request**
```json
{ "mobile": "+971501234567" }
```
**Response `200`**
```json
{ "expires_in": 300 }
```
**Errors:** `429 RATE_LIMITED` (3 resends/10 min), `422 VALIDATION_ERROR` (invalid E.164)

---

### `POST /auth/otp/verify` — public
Verify OTP and receive a JWT.

**Request**
```json
{ "mobile": "+971501234567", "code": "482931" }
```
**Response `200`**
```json
{ "token": "<jwt>", "user": { "id": "...", "role": "customer", "mobile_verified": true } }
```
**Errors:** `400 INVALID_CODE`, `400 EXPIRED`, `423 LOCKED` (15-min lockout after 5 failures)

---

### `POST /auth/signout`
Invalidate the current JWT (client-side discard; token is stateless — no server-side revocation in v1).

**Response `200`** `{ "ok": true }`

---

## Listings (Public)

### `GET /listings` — public
Search approved listings.

**Query params**
| Param | Type | Example |
|-------|------|---------|
| `type` | `property\|plot\|room` | `type=property` |
| `location` | slug string | `location=dubai-marina` |
| `min_price` | number | `min_price=50000` |
| `max_price` | number | `max_price=200000` |
| `min_size` | number (sqft) | `min_size=500` |
| `amenities` | comma-separated | `amenities=pool,gym` |
| `sort` | `price_asc\|price_desc\|newest` | `sort=price_asc` |
| `limit` | number (default 20, max 50) | `limit=20` |
| `offset` | number | `offset=40` |

**Response `200`**
```json
{
  "listings": [
    {
      "id": "a1b2c3d4...",
      "type": "property",
      "title": "2-Bed Apartment in Marina",
      "price": 85000,
      "currency": "AED",
      "location_text": "Dubai Marina, Dubai",
      "size_sqft": 1100,
      "bedrooms": 2,
      "bathrooms": 2,
      "cover_photo_url": "https://pub-xxx.r2.dev/...",
      "published_at": 1722499200000
    }
  ],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

---

### `GET /listings/:id` — public
Full listing detail.

**Response `200`**
```json
{
  "id": "a1b2c3d4...",
  "type": "property",
  "title": "...",
  "description": "...",
  "price": 85000,
  "currency": "AED",
  "location_text": "Dubai Marina, Dubai",
  "latitude": 25.078,
  "longitude": 55.1336,
  "size_sqft": 1100,
  "bedrooms": 2,
  "bathrooms": 2,
  "amenities": ["pool", "gym", "parking"],
  "photos": [
    { "url": "https://pub-xxx.r2.dev/...", "display_order": 0 }
  ],
  "published_at": 1722499200000
}
```

---

## Customer

### `GET /customer/profile`
**Auth:** role=customer

**Response `200`**
```json
{
  "id": "a1b2c3d4...",
  "name": "Ahmed Al Mansoori",
  "mobile": "+971501234567",
  "mobile_verified_at": 1722499200000
}
```

---

### `GET /customer/shortlist`
**Auth:** role=customer — returns shortlisted listing summaries.

---

### `POST /customer/shortlist`
**Auth:** role=customer

**Request** `{ "listing_id": "a1b2c3d4..." }`
**Response `201`** `{ "ok": true }`
**`409 CONFLICT`** if already shortlisted.

---

### `DELETE /customer/shortlist/:listing_id`
**Auth:** role=customer

**Response `200`** `{ "ok": true }`

---

### `POST /bookingies`
Register interest in a listing.
**Auth:** role=customer

**Request** `{ "listing_id": "a1b2c3d4..." }`
**Response `201`** `{ "bookingy_id": "a1b2c3d4-..." }`
**`409 CONFLICT`** `ALREADY_ENQUIRED`
**`403 FORBIDDEN`** `LISTING_NOT_AVAILABLE` if listing is not `approved`

---

### `GET /customer/bookingies`
**Auth:** role=customer — returns bookingy history with listing summaries and current status.

---

## Vendor

### `POST /vendor/register`
Submit vendor registration (after OTP verification, before document upload).
**Auth:** role=vendor (auto-assigned on first OTP verify with `?intent=vendor`)

**Request**
```json
{
  "vendor_type": "agent",
  "company_name": "Prime Properties LLC",
  "licence_no": "DLD-12345"
}
```
**Response `201`** `{ "vendor_id": "a1b2c3d4-...", "status": "pending" }`

---

### `POST /vendor/documents`
Record an R2 key after a direct upload completes.
**Auth:** role=vendor (any status)

**Request** `{ "label": "Agency Licence", "r2_key": "vendor-docs/a1b2c3d4-.../a1b2c3d4-....pdf" }`
**Response `201`** `{ "document_id": "a1b2c3d4-..." }`

---

### `GET /vendor/listings`
**Auth:** role=vendor, status=approved — returns vendor's own listings.

---

### `POST /vendor/listings`
Create a new listing (starts as `draft`).
**Auth:** role=vendor, status=approved

**Request**
```json
{
  "type": "property",
  "title": "...",
  "description": "...",
  "price": 85000,
  "currency": "AED",
  "location_slug": "dubai-marina",
  "location_text": "Dubai Marina, Dubai",
  "latitude": 25.078,
  "longitude": 55.1336,
  "size_sqft": 1100,
  "bedrooms": 2,
  "bathrooms": 2,
  "amenities": ["pool", "gym"],
  "photo_keys": ["listing-photos/a1b2c3d4-.../a1b2c3d4-....jpg"]
}
```
**Response `201`** `{ "listing_id": "a1b2c3d4...", "status": "draft" }`

---

### `PATCH /vendor/listings/:id`
Edit a `draft` or `rejected` listing.
**Auth:** role=vendor, owns listing

**Request** — partial listing fields.
**Response `200`** `{ "ok": true }`
**`403 FORBIDDEN`** if listing is not in `draft` or `rejected` state.

---

### `POST /vendor/listings/:id/submit`
Move listing from `draft` → `pending`.
**Auth:** role=vendor, owns listing

**Response `200`** `{ "status": "pending" }`

---

### `POST /vendor/listings/:id/withdraw`
Set status to `withdrawn`.
**Auth:** role=vendor, owns listing

**Response `200`** `{ "status": "withdrawn" }`

---

## Upload

### `POST /upload/presign`
Get a presigned R2 PUT URL for direct browser upload.
**Auth:** role=vendor or admin

**Request**
```json
{ "filename": "photo.jpg", "content_type": "image/jpeg", "context": "listing_photo" }
```
**Response `200`**
```json
{ "key": "listing-photos/a1b2c3d4-.../a1b2c3d4-....jpg", "upload_url": "https://..." }
```
Allowed `content_type` values: `image/jpeg`, `image/png`, `image/webp` (listing photos); `image/jpeg`, `image/png`, `application/pdf` (vendor docs).
Upload URL TTL: 5 minutes. Max size enforced via R2 presign `contentLengthRange`: photos 10 MB, docs 5 MB.

---

## Admin

All admin endpoints require `role = admin` — checked on every request from the JWT.

### `GET /admin/vendors?status=pending`
Vendor verification queue with document R2 keys.

### `POST /admin/vendors/:id/approve`
**Response `200`** `{ "ok": true }`

### `POST /admin/vendors/:id/reject`
**Request** `{ "reason": "Document unclear" }`
**Response `200`** `{ "ok": true }`

---

### `GET /admin/listings?status=pending`
Listing approval queue.

### `POST /admin/listings/:id/approve`
**Response `200`** `{ "ok": true }`

### `POST /admin/listings/:id/request-changes`
**Request** `{ "note": "Please add clearer photos" }`
**Response `200`** `{ "ok": true }`

### `POST /admin/listings/:id/reject`
**Request** `{ "reason": "..." }`
**Response `200`** `{ "ok": true }`

---

### `GET /admin/bookingies`
All bookingies. Query params: `status`, `from` (Unix ms), `to` (Unix ms).

### `PATCH /admin/bookingies/:id`
**Request** `{ "status": "owner_confirmed", "note": "Owner confirmed available" }`
**Response `200`** — updated bookingy object.

---

### `GET /admin/export`
Generate and stream CSV.

**Query params**
| Param | Values |
|-------|--------|
| `type` | `customers` \| `owners` |
| `date_field` | `signup` \| `last_login` — which date column to filter on |
| `period` | `24h` \| `2d` \| `7d` \| `30d` \| `custom` |
| `from` | Unix ms (required when `period=custom`) |
| `to` | Unix ms (required when `period=custom`) |
| `owner_status` | `pending` \| `approved` \| `rejected` \| `all` (owners export only) |

**Column sets**

`customers`: `name, mobile, mobile_verified_at, signup_date, last_login_at`

`owners`: `name, mobile, mobile_verified_at, vendor_type, status, company_name, licence_no, signup_date, last_login_at`

**Response `200`** — `Content-Type: text/csv`, `Content-Disposition: attachment; filename="..."`

---

### `GET /admin/reports`
Summary metrics with date-range filter.
**Query params:** `from`, `to` (Unix ms)

**Response `200`**
```json
{
  "listings": { "total": 340, "approved": 280, "pending": 42, "rejected": 18 },
  "vendors": { "total": 85, "approved": 70, "pending": 12, "rejected": 3 },
  "customers": { "total": 1240, "verified": 1180 },
  "bookingies": { "total": 430, "closed": 310, "pending": 120 }
}
```

---

### `GET /admin/notifications?unread=true`
In-dashboard notification feed.

**Response `200`**
```json
{
  "count": 5,
  "items": [
    { "id": "a1b2c3d4...", "type": "new_bookingy", "payload": { "bookingy_id": "..." }, "created_at": 1722499200000 }
  ]
}
```

### `POST /admin/notifications/:id/read`
Mark notification as read. **Response `200`** `{ "ok": true }`

---

## Utility

### `GET /health` — public
**Response `200`** `{ "status": "ok" }`
