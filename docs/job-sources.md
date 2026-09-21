# Listing Provider Adapter Contract

Defines the interface that any external listing data source must implement to feed listings into the platform. In v1 all properties and opportunities are created by the **admin** in the dashboard (`/admin/properties`). This document specifies the adapter contract for future (Phase 2) integrations — partner feeds, CRM exports, bulk CSV imports.

> Build status: the Ingestion Worker is a stub (`apps/ingestion/src/index.ts`). See [`implementation-status.md`](./implementation-status.md).

---

## Why an Adapter Layer

Third-party sources vary in format (REST API, CSV, XML feed, webhook push). The adapter layer normalises them to a single `RawListing` shape before the platform validates, deduplicates (by `source_name + source_listing_id` in D1), and saves them as **draft** admin-managed listings for review.

Provider failures are isolated — one broken adapter does not affect others or corrupt D1 state.

---

## Provider Adapter Interface (TypeScript)

```typescript
interface ListingProviderAdapter {
  /** Unique slug written to listings.source_name */
  readonly id: string

  /** Human-readable name shown in the admin ingestion log */
  readonly name: string

  /**
   * Pull listings from the source.
   * Called by the Ingestion Worker cron or POST /admin/ingest.
   * Must be idempotent — safe to call repeatedly.
   */
  fetchListings(options: FetchOptions, env: Env): Promise<RawListing[]>

  /**
   * Normalise a RawListing to the platform's canonical shape.
   * Called per record after fetchListings returns.
   */
  transform(raw: RawListing): TransformedListing

  /**
   * Optional: provider-specific validation before transform.
   * Return null to skip the record silently.
   */
  validate?(raw: RawListing): RawListing | null
}
```

---

## Input Types

```typescript
interface FetchOptions {
  /** Only fetch listings modified or created after this timestamp (Unix ms) */
  since?: number

  /** Maximum records to return in one call */
  limit?: number

  /** Pagination cursor (provider-defined format) */
  cursor?: string
}

interface RawListing {
  /** Provider-side unique identifier for deduplication */
  external_id: string

  /** ISO 8601 */
  listed_at: string
  updated_at?: string

  /** Provider may use its own labels — adapter maps to canonical type */
  type: string

  title: string
  description?: string

  price: number
  currency: string             // ISO 4217

  location: {
    text: string
    city?: string
    area?: string
    lat?: number
    lng?: number
  }

  size?: number
  size_unit?: 'sqft' | 'sqm'
  bedrooms?: number
  bathrooms?: number
  amenities?: string[]

  /** Public URLs — adapter is responsible for reachability */
  photos?: string[]

  /** Owner details — stored only in confidential admin fields (owner_name / owner_contact) */
  owner_ref?: {
    external_id: string
    name?: string
    mobile?: string
    email?: string
  }

  /** Raw provider payload preserved in agent_runs for audit */
  _raw: Record<string, unknown>
}
```

---

## Output Type

```typescript
interface TransformedListing {
  /** Written to listings.source_name + listings.source_listing_id */
  source_name: string
  source_listing_id: string

  type: 'labour_camp' | 'warehouse' | 'land'
  opportunity_kind: 'accommodation_lease' | 'accommodation_sale' | 'tenant_demand' | 'management' | 'investor_demand'
  total_capacity?: number
  num_rooms?: number
  availability_date?: number
  title: string
  description: string
  price?: number
  currency: string
  location_slug: string    // normalised slug for D1 index
  location_text: string
  latitude?: number
  longitude?: number
  size_sqft?: number       // converted from sqm if necessary
  bedrooms?: number
  bathrooms?: number
  amenities: string[]
  photo_urls: string[]     // validated, accessible URLs
}
```

---

## Ingestion Worker Lifecycle

The Ingestion Worker is a standalone Cloudflare Worker with a daily cron trigger. It runs each registered adapter in sequence (isolated — one failure does not skip others).

```
Cron trigger (daily) OR POST /admin/ingest
  → IngestWorker.run()
      → for each adapter:
          1. adapter.fetchListings({ since: lastRunAt }) → RawListing[]
          2. for each raw:
               a. adapter.validate(raw)  → skip if null
               b. adapter.transform(raw) → TransformedListing
               c. D1 deduplication: SELECT id FROM listings
                  WHERE source_name = ? AND source_listing_id = ?
                  → if new:   INSERT listings (status: 'draft', is_available: 0, source_name: adapter.id)
                  → if seen:  UPDATE if updated_at changed (title/price/description only)
          3. For each newly inserted listing:
               waitUntil: runEmbeddingAgent (v2)
      → UPDATE ingestion_log: last_run_at = now()
```

All ingest-created listings are saved as `draft` + unavailable. An admin reviews and publishes them from `/admin/properties`. They are **never auto-published** and never matched until published.

**Free-tier note:** Keep daily ingestion volume well below D1's 100,000 row writes/day limit. Batch embedding calls; Workers AI allows 10,000 Neurons/day.

---

## Implemented Adapters (v1)

| Adapter ID | Source | Method | Status |
|-----------|--------|--------|--------|
| `platform` | Vendor portal (direct entry via API) | D1 write — no adapter needed | Active |

---

## Planned Adapters (v2+)

| Adapter ID | Source | Method |
|-----------|--------|--------|
| `bayut` | Bayut.com feed | XML pull feed |
| `dubizzle` | Dubizzle listings export | REST API |
| `propertyfinder` | Property Finder feed | REST API |
| `csv_bulk` | One-off bulk import | CSV upload via admin panel |

---

## CSV Bulk Adapter

For one-off admin bulk imports the admin panel accepts a CSV with these column headers:

```
type, title, description, price, currency, location_text, location_city,
location_area, latitude, longitude, size_sqft, bedrooms, bathrooms,
amenities (semicolon-separated), photo_urls (semicolon-separated)
```

Rows failing validation are collected into a rejection report downloadable from the admin UI. Valid rows are created as drafts.

---

## Photo Ingestion

Provider photo URLs are **not** stored directly. The Ingestion Worker:

1. Fetches each photo from the provider URL (within `waitUntil`)
2. Uploads to Cloudflare R2 under `listing-photos/{listing_id}/{index}.{ext}`
3. Stores the R2 key in `listing_photos` table

This ensures photos remain available if the provider removes the original URL and allows consistent delivery through the R2 private-bucket + HMAC-signed URL pattern.
