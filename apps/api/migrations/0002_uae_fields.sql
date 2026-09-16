-- UAE commercial real estate fields

-- ─── vendor_profiles additions ───────────────────────────────────────────────
ALTER TABLE vendor_profiles ADD COLUMN trade_licence_no    TEXT;
ALTER TABLE vendor_profiles ADD COLUMN vat_no              TEXT;
ALTER TABLE vendor_profiles ADD COLUMN authorized_signatory TEXT;
ALTER TABLE vendor_profiles ADD COLUMN whatsapp_no         TEXT;

-- ─── listings additions ───────────────────────────────────────────────────────
-- Labour camp fields
ALTER TABLE listings ADD COLUMN num_rooms         INTEGER;
ALTER TABLE listings ADD COLUMN persons_per_room  INTEGER;
ALTER TABLE listings ADD COLUMN room_size_sqft    REAL;
ALTER TABLE listings ADD COLUMN total_capacity    INTEGER;
ALTER TABLE listings ADD COLUMN mohre_certified   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN ejari_registered  INTEGER NOT NULL DEFAULT 0;

-- Warehouse fields
ALTER TABLE listings ADD COLUMN num_loading_bays  INTEGER;
ALTER TABLE listings ADD COLUMN year_built        INTEGER;

-- Land fields
ALTER TABLE listings ADD COLUMN freehold          INTEGER NOT NULL DEFAULT 0;

-- Financial terms (all listing types)
ALTER TABLE listings ADD COLUMN security_deposit_pct REAL;
ALTER TABLE listings ADD COLUMN commission_pct        REAL;
ALTER TABLE listings ADD COLUMN ejari_fee             REAL;
ALTER TABLE listings ADD COLUMN admin_fee             REAL;
