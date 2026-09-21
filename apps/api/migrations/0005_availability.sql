-- Stage 3: Availability journey.
-- Enquiries (= leads), the lead_matches snapshot that also gates opportunity access,
-- and the listing columns the matching engine and opportunity cards read.
-- The listings rebuild that relaxes vendor_id NOT NULL is left to the admin
-- properties stage; every column below is additive.

-- ─── enquiries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
  id                TEXT PRIMARY KEY,
  reference_no      TEXT UNIQUE NOT NULL,
  user_id           TEXT NOT NULL REFERENCES users (id),
  user_type         TEXT NOT NULL,
  contact_kind      TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  company_name      TEXT,
  position          TEXT,
  email             TEXT NOT NULL,
  mobile            TEXT NOT NULL,
  nationality       TEXT,
  company_website   TEXT,
  business_type     TEXT,
  ownership_status  TEXT,
  requirements      TEXT,
  stage             TEXT NOT NULL DEFAULT 'verified',
  lead_status       TEXT NOT NULL DEFAULT 'new',
  assigned_agent_id TEXT REFERENCES agents (id),
  match_count       INTEGER NOT NULL DEFAULT 0,
  consent_at        INTEGER NOT NULL,
  completed_at      INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_user_created
  ON enquiries (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_stage_status_created
  ON enquiries (stage, lead_status, created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_user_type_created
  ON enquiries (user_type, created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_agent_status
  ON enquiries (assigned_agent_id, lead_status);

-- ─── lead_matches ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_matches (
  id         TEXT PRIMARY KEY,
  enquiry_id TEXT NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings (id),
  score      REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_matches_enquiry_listing
  ON lead_matches (enquiry_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_lead_matches_listing
  ON lead_matches (listing_id);

-- ─── listings additions ──────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN reference_no      TEXT;
ALTER TABLE listings ADD COLUMN opportunity_kind  TEXT NOT NULL DEFAULT 'accommodation_lease';
ALTER TABLE listings ADD COLUMN is_available      INTEGER NOT NULL DEFAULT 1;
ALTER TABLE listings ADD COLUMN assigned_agent_id TEXT REFERENCES agents (id);
ALTER TABLE listings ADD COLUMN summary           TEXT;
ALTER TABLE listings ADD COLUMN price_period      TEXT;
ALTER TABLE listings ADD COLUMN show_price        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE listings ADD COLUMN availability_date INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_reference_no
  ON listings (reference_no)
  WHERE reference_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_matching
  ON listings (status, is_available, opportunity_kind, location_slug, total_capacity);
