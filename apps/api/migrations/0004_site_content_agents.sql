-- Stage 2: corporate content CMS and public agent profiles.
-- Seed values are clearly marked placeholders (spec §30): never invented data.
-- Generated from DEFAULT_SITE_CONTENT in packages/shared/src/content.ts; keep them in step.

-- ─── site_content ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT REFERENCES users (id),
  updated_at INTEGER NOT NULL
);

-- ─── agents ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  position       TEXT NOT NULL,
  specialization TEXT,
  languages      TEXT NOT NULL DEFAULT '[]',
  phone          TEXT,
  email          TEXT,
  whatsapp       TEXT,
  photo_r2_key   TEXT,
  bio            TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_active_order ON agents (is_active, display_order);

-- ─── seed: content placeholders ──────────────────────────────────────────────
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'home',
  '{"about_intro":"Momentum Living is a specialist in labour accommodation. We work with property owners, landlords, tenants, operators, management companies, investors, corporate clients and agents to find, place and manage workforce housing.","audiences":["Property Owners","Landlords","Tenants","Operators","Management Companies","Investors","Corporate Clients","Agents"]}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'about',
  '{"who_we_are":"Momentum Living is a real-estate company focused on labour accommodation and labour camps. We bring together the people who own, operate and need workforce housing, and we handle each requirement with care, discretion and a clear process.","what_we_do":[{"title":"Labour Camps","text":"Sourcing, leasing and sale of labour camps for companies and operators."},{"title":"Labour Accommodation","text":"Workforce housing matched to headcount, location and budget."},{"title":"Property Transactions","text":"Support through leasing, sale and purchase of accommodation assets."},{"title":"Accommodation Opportunities","text":"Access to suitable opportunities once your requirements are understood."},{"title":"Landlord Relationships","text":"Working with owners to position and place their accommodation."},{"title":"Tenant Requirements","text":"Understanding what tenants need before any option is presented."},{"title":"Management Company Relationships","text":"Partnering with management companies on supply and demand."},{"title":"Corporate Accommodation Solutions","text":"Housing plans for companies moving or expanding a workforce."},{"title":"Investment Opportunities","text":"Introducing investors to accommodation assets where applicable."}],"who_we_work_with":[{"title":"Tenants","text":"Companies and contractors that need accommodation for their workforce."},{"title":"Landlords","text":"Owners with labour accommodation to lease or sell."},{"title":"Management Companies","text":"Operators that run and maintain accommodation on behalf of owners."},{"title":"Property Owners","text":"Owners of land, buildings or camps suitable for workforce housing."},{"title":"Operators","text":"Businesses that operate accommodation facilities day to day."},{"title":"Investors","text":"Parties looking at accommodation assets as an investment."},{"title":"Corporate Clients","text":"Organisations planning accommodation for projects and teams."},{"title":"Agents","text":"Fellow professionals who want to collaborate on requirements."}],"why_us":"We focus on one market and we take the time to understand each requirement before presenting any option. Enquiries are handled confidentially, and every client works with a dedicated point of contact from first conversation to completion.","approach_steps":[{"title":"Understand","text":"We listen to what you need: location, capacity, timing and budget."},{"title":"Qualify","text":"We confirm the details so every option we present is relevant."},{"title":"Match","text":"We match your requirements against suitable opportunities."},{"title":"Connect","text":"We introduce the right parties and arrange information or viewings."},{"title":"Negotiate","text":"We support both sides towards terms that work."},{"title":"Complete","text":"We see the transaction through to completion."}]}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'why_choose_us',
  '{"intro":"Momentum Living is built around one market: labour accommodation. Here is what that focus means for the people we work with.","features":[{"title":"Specialist Knowledge","summary":"A focus on labour accommodation and workforce housing.","text":"Labour accommodation is our focus, not a side line. We understand the requirements behind workforce housing, from capacity and facilities to location and access.","icon":"compass"},{"title":"Professional Network","summary":"Relationships across owners, operators and occupiers.","text":"We work with landlords, property owners, operators, management companies and agents, so a requirement can reach the right people quickly.","icon":"network"},{"title":"Client-Focused Approach","summary":"Your requirements lead every conversation.","text":"We start with what you need and only present options that fit. You are not asked to browse; we do the matching for you.","icon":"users"},{"title":"Efficient Process","summary":"A clear path from enquiry to completion.","text":"Understand, qualify, match, connect, negotiate, complete. Each step is defined, so you always know where your enquiry stands.","icon":"zap"},{"title":"Market Understanding","summary":"Informed by day-to-day activity in the market.","text":"Our work across tenants, landlords and operators gives us a practical view of how the accommodation market is moving.","icon":"line-chart"},{"title":"Trusted Relationships","summary":"Long-term relationships built on straight dealing.","text":"We aim to be the partner clients come back to, by being clear, responsive and honest about what is and is not a good fit.","icon":"handshake"},{"title":"Confidentiality","summary":"Enquiries and owner details handled discreetly.","text":"Owner details and client requirements are kept confidential and shared only when both parties are ready to proceed.","icon":"shield"},{"title":"Dedicated Support","summary":"A named agent for every enquiry.","text":"Every enquiry is assigned to an agent who stays with it, so you have one point of contact from first call to completion.","icon":"headset"}]}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'md_profile',
  '{"name":"[MANAGING DIRECTOR NAME]","title":"Managing Director, Momentum Living","photo_key":"","biography":"[MANAGING DIRECTOR BIO]","experience":"[MANAGING DIRECTOR EXPERIENCE]","philosophy":"[LEADERSHIP PHILOSOPHY]","vision":"[VISION FOR MOMENTUM LIVING]","commitment_clients":"[COMMITMENT TO CLIENTS]","commitment_standards":"[COMMITMENT TO PROFESSIONAL STANDARDS]","market_vision":"[VISION FOR THE LABOUR ACCOMMODATION MARKET]"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'md_note',
  '{"heading":"A Note From Our Managing Director","body":"[MANAGING DIRECTOR''S MESSAGE: WELCOME TO MOMENTUM LIVING]\n\n[THE COMPANY''S PURPOSE]\n\n[WHY PROFESSIONAL LABOUR ACCOMMODATION MATTERS]\n\n[RELATIONSHIPS AND TRUST]\n\n[COMMITMENT TO CLIENTS, AND A WELCOME TO OWNERS, TENANTS, OPERATORS AND PARTNERS]","signature_name":"[MANAGING DIRECTOR NAME]"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'company',
  '{"phone":"[COMPANY PHONE]","whatsapp":"[WHATSAPP NUMBER]","email":"[COMPANY EMAIL]","general_email":"[EMAIL]","sales_email":"[SALES EMAIL]","management_email":"[MANAGEMENT EMAIL]","address":"[OFFICE ADDRESS]","working_hours":"[WORKING HOURS]","socials":{"linkedin":"","instagram":"","other":[]}}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'legal_privacy',
  '{"body_markdown":"[PRIVACY POLICY WORDING TO BE SUPPLIED BY MOMENTUM LIVING]","updated_on":""}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'legal_terms',
  '{"body_markdown":"[TERMS AND CONDITIONS WORDING TO BE SUPPLIED BY MOMENTUM LIVING]","updated_on":""}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
INSERT OR IGNORE INTO site_content (key, value, updated_at) VALUES (
  'availability_config',
  '{"enable_buyer":false,"enable_seller":false,"nationality_field":"optional"}',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);

-- ─── seed: placeholder agent profiles (replace or deactivate from the admin) ─
INSERT OR IGNORE INTO agents (id, name, position, specialization, languages, bio, display_order, created_at, updated_at)
VALUES ('5b0f7c1e-2d4a-4c1b-9e3f-6a8d2b7c4e01', '[AGENT NAME]', '[AGENT POSITION]', '[AREA / PROPERTY TYPE]', '[]', '[AGENT BIO]', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
INSERT OR IGNORE INTO agents (id, name, position, specialization, languages, bio, display_order, created_at, updated_at)
VALUES ('8e2a4d6f-1b3c-4e5a-8f7d-9c0b1a2e3f02', '[AGENT NAME]', '[AGENT POSITION]', '[AREA / PROPERTY TYPE]', '[]', '[AGENT BIO]', 2, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
INSERT OR IGNORE INTO agents (id, name, position, specialization, languages, bio, display_order, created_at, updated_at)
VALUES ('c3d5e7f9-4a6b-4c8d-9e0f-1a2b3c4d5e03', '[AGENT NAME]', '[AGENT POSITION]', '[AREA / PROPERTY TYPE]', '[]', '[AGENT BIO]', 3, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);
