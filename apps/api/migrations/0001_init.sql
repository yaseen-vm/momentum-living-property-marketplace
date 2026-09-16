-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL DEFAULT '',
  mobile             TEXT UNIQUE NOT NULL,
  mobile_verified_at INTEGER,
  role               TEXT NOT NULL DEFAULT 'customer',
  last_login_at      INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_mobile        ON users (mobile);
CREATE INDEX IF NOT EXISTS idx_users_created_at    ON users (created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users (last_login_at);

-- ─── otp_tokens ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_tokens (
  id          TEXT PRIMARY KEY,
  mobile      TEXT NOT NULL,
  user_id     TEXT REFERENCES users (id),
  code_hash   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_mobile ON otp_tokens (mobile);

-- ─── vendor_profiles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT UNIQUE NOT NULL REFERENCES users (id),
  vendor_type  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  company_name TEXT,
  licence_no   TEXT,
  admin_note   TEXT,
  reviewed_at  INTEGER,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status  ON vendor_profiles (status);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON vendor_profiles (user_id);

-- ─── vendor_documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_documents (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL REFERENCES vendor_profiles (id),
  label       TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor_id ON vendor_documents (vendor_id);

-- ─── listings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                TEXT PRIMARY KEY,
  vendor_id         TEXT NOT NULL REFERENCES vendor_profiles (id),
  source_name       TEXT NOT NULL DEFAULT 'platform',
  source_listing_id TEXT,
  type              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  title             TEXT NOT NULL,
  description       TEXT,
  price             REAL NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'AED',
  location_slug     TEXT NOT NULL,
  location_text     TEXT NOT NULL,
  latitude          REAL,
  longitude         REAL,
  size_sqft         INTEGER,
  bedrooms          INTEGER,
  bathrooms         INTEGER,
  amenities         TEXT,
  admin_note        TEXT,
  reviewed_at       INTEGER,
  published_at      INTEGER,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_search
  ON listings (status, type, location_slug, price);
CREATE INDEX IF NOT EXISTS idx_listings_vendor_id
  ON listings (vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_source_dedup
  ON listings (source_name, source_listing_id)
  WHERE source_listing_id IS NOT NULL;

-- ─── listing_photos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_photos (
  id            TEXT PRIMARY KEY,
  listing_id    TEXT NOT NULL REFERENCES listings (id),
  r2_key        TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_order
  ON listing_photos (listing_id, display_order);

-- ─── bookings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users (id),
  listing_id  TEXT NOT NULL REFERENCES listings (id),
  status      TEXT NOT NULL DEFAULT 'pending',
  admin_note  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_customer_listing
  ON bookings (customer_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at);

-- ─── booking_notes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_notes (
  id         TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings (id),
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_notes_booking_id ON booking_notes (booking_id);

-- ─── admin_notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  payload    TEXT NOT NULL,
  read_at    INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_read_at    ON admin_notifications (read_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications (created_at);

-- ─── shortlists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shortlists (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id),
  listing_id TEXT NOT NULL REFERENCES listings (id),
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shortlists_user_listing
  ON shortlists (user_id, listing_id);

-- ─── agent_runs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users (id),
  agent_type   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  input        TEXT,
  output       TEXT,
  tool_calls   TEXT,
  error        TEXT,
  started_at   INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_type ON agent_runs (agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs (started_at);
