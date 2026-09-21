-- Stage 5: Admin.
-- Rebuilds `listings` as admin-managed properties/opportunities: vendor_id and price become
-- nullable (SQLite cannot drop NOT NULL in place) and the confidential owner, created_by and
-- archive columns are added. Also adds photo alt text and the lead notes timeline.

-- lead_matches, lead_requests, listing_photos, bookings and shortlists reference listings(id).
-- Order matters: back up the rows, drop the table (its implicit DELETE leaves deferred FK
-- violations), recreate it under the same name, then re-insert the rows, which resolves
-- them. A drop + rename would not: SQLite does not re-check deferred violations on rename.
PRAGMA defer_foreign_keys = true;

-- ─── listings rebuild ────────────────────────────────────────────────────────
CREATE TABLE listings_backup AS SELECT * FROM listings;

DROP TABLE listings;

CREATE TABLE listings (
  id                   TEXT PRIMARY KEY,
  reference_no         TEXT,
  opportunity_kind     TEXT NOT NULL DEFAULT 'accommodation_lease',
  vendor_id            TEXT REFERENCES vendor_profiles (id),
  created_by           TEXT REFERENCES users (id),
  assigned_agent_id    TEXT REFERENCES agents (id),
  source_name          TEXT NOT NULL DEFAULT 'platform',
  source_listing_id    TEXT,
  type                 TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'draft',
  is_available         INTEGER NOT NULL DEFAULT 1,
  title                TEXT NOT NULL,
  summary              TEXT,
  description          TEXT,
  terms                TEXT,
  price                REAL,
  price_period         TEXT,
  currency             TEXT NOT NULL DEFAULT 'AED',
  show_price           INTEGER NOT NULL DEFAULT 1,
  location_slug        TEXT NOT NULL,
  location_text        TEXT NOT NULL,
  latitude             REAL,
  longitude            REAL,
  show_map             INTEGER NOT NULL DEFAULT 0,
  availability_date    INTEGER,
  size_sqft            INTEGER,
  bedrooms             INTEGER,
  bathrooms            INTEGER,
  num_rooms            INTEGER,
  persons_per_room     INTEGER,
  room_size_sqft       REAL,
  total_capacity       INTEGER,
  mohre_certified      INTEGER NOT NULL DEFAULT 0,
  ejari_registered     INTEGER NOT NULL DEFAULT 0,
  num_loading_bays     INTEGER,
  year_built           INTEGER,
  freehold             INTEGER NOT NULL DEFAULT 0,
  security_deposit_pct REAL,
  commission_pct       REAL,
  ejari_fee            REAL,
  admin_fee            REAL,
  amenities            TEXT,
  owner_name           TEXT,
  owner_contact        TEXT,
  internal_notes       TEXT,
  admin_note           TEXT,
  reviewed_at          INTEGER,
  published_at         INTEGER,
  archived_at          INTEGER,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

INSERT INTO listings (
  id, reference_no, opportunity_kind, vendor_id, assigned_agent_id, source_name, source_listing_id,
  type, status, is_available, title, summary, description, terms, price, price_period, currency,
  show_price, location_slug, location_text, latitude, longitude, show_map, availability_date,
  size_sqft, bedrooms, bathrooms, num_rooms, persons_per_room, room_size_sqft, total_capacity,
  mohre_certified, ejari_registered, num_loading_bays, year_built, freehold,
  security_deposit_pct, commission_pct, ejari_fee, admin_fee, amenities,
  admin_note, reviewed_at, published_at, created_at, updated_at
)
SELECT
  id, reference_no, opportunity_kind, vendor_id, assigned_agent_id, source_name, source_listing_id,
  type, status, is_available, title, summary, description, terms, price, price_period, currency,
  show_price, location_slug, location_text, latitude, longitude, show_map, availability_date,
  size_sqft, bedrooms, bathrooms, num_rooms, persons_per_room, room_size_sqft, total_capacity,
  mohre_certified, ejari_registered, num_loading_bays, year_built, freehold,
  security_deposit_pct, commission_pct, ejari_fee, admin_fee, amenities,
  admin_note, reviewed_at, published_at, created_at, updated_at
FROM listings_backup;

DROP TABLE listings_backup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_reference_no
  ON listings (reference_no)
  WHERE reference_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_matching
  ON listings (status, is_available, opportunity_kind, location_slug, total_capacity);
CREATE INDEX IF NOT EXISTS idx_listings_admin
  ON listings (opportunity_kind, status, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_source_dedup
  ON listings (source_name, source_listing_id)
  WHERE source_listing_id IS NOT NULL;
-- Legacy: public browse and vendor portal (removed with them).
CREATE INDEX IF NOT EXISTS idx_listings_search
  ON listings (status, type, location_slug, price);
CREATE INDEX IF NOT EXISTS idx_listings_vendor_id
  ON listings (vendor_id);

-- ─── listing_photos additions ────────────────────────────────────────────────
ALTER TABLE listing_photos ADD COLUMN alt_text TEXT;

-- ─── lead_notes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_notes (
  id            TEXT PRIMARY KEY,
  enquiry_id    TEXT NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  author_id     TEXT NOT NULL REFERENCES users (id),
  body          TEXT NOT NULL,
  status_change TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_enquiry_created
  ON lead_notes (enquiry_id, created_at);
