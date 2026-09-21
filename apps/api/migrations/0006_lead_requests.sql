-- Stage 4: Details & contact.
-- lead_requests records "Request Information" / "Request Viewing" from the results and
-- detail pages. The listing columns are what the opportunity detail page reads; the
-- confidential owner fields and archive columns stay with the admin properties stage.

-- ─── lead_requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_requests (
  id             TEXT PRIMARY KEY,
  enquiry_id     TEXT NOT NULL REFERENCES enquiries (id) ON DELETE CASCADE,
  listing_id     TEXT NOT NULL REFERENCES listings (id),
  kind           TEXT NOT NULL,
  message        TEXT,
  preferred_date INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_requests_enquiry_created
  ON lead_requests (enquiry_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_requests_enquiry_listing_kind
  ON lead_requests (enquiry_id, listing_id, kind);

-- ─── listings additions ──────────────────────────────────────────────────────
ALTER TABLE listings ADD COLUMN terms    TEXT;
ALTER TABLE listings ADD COLUMN show_map INTEGER NOT NULL DEFAULT 0;
