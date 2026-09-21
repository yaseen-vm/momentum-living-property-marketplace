# Product Requirements

> **Source:** client build specification *"Build Specification — Momentum Living"* (received Sept 2026). This supersedes the original marketplace scope in `quotation-LNG-2026-WD-003.md`.
> **Build status** of every requirement below is tracked in [`implementation-status.md`](./implementation-status.md).

## Overview

A premium B2B corporate website for **Momentum Living** — a specialist real-estate company focused on labour accommodation / labour camps — published under the web identity **LabourCamps.com**.

The product has **two strictly separated experiences**:

1. **Public corporate website** — explains who Momentum Living is, its people, approach and how to contact it. **Shows no inventory of any kind.**
2. **Availability journey** — reached **only** by clicking **AVAILABILITY**. A multi-step qualification (user type → details → mobile OTP → requirements) that ends in a personalised list of **matched opportunities**. Every completed journey creates a **lead** that the admin/agents work offline.

Behind both sits an **admin dashboard** for properties/opportunities, agents, leads and corporate content.

Primary audience: landlords/property owners, tenants/operators, management companies, investors, agents and companies looking for labour accommodation.

Stack: React + Vite SPA on Cloudflare Pages, Hono on Cloudflare Workers, Cloudflare D1 (SQLite), all on the free tier. (The client spec mentions Base44 — we are **not** using Base44; the spec's only hard dependency is a real SMS/OTP provider, which is MSG91.)

---

## Core Principle — Strict No-Listing Rule (mandatory)

No property cards, grids, photos-as-listings, prices, availability counters, search results or "Available Now" content may appear on **any** corporate page: Home, About Us, Managing Director, MD's Note, Our Agents, Why Choose Us, Contact, or in the global navigation/footer.

The **only** entry point to opportunities is **AVAILABILITY**. Results are only reachable after the full qualification journey — this is enforced **server-side**, not just by hiding routes.

Corporate CTAs use: *Learn More, About Momentum Living, Meet Our Agents, Speak to an Agent, Contact Us, Chat With an Agent, Start an Enquiry, Availability.*
Never on corporate pages: *Browse Properties, See Available Camps, View Listings.*

---

## Pages & Portals

| Area | Route | Who | Auth |
|------|-------|-----|------|
| Home | `/` | Everyone | None |
| About Us | `/about` | Everyone | None |
| Managing Director | `/managing-director` | Everyone | None |
| Note From the MD | `/managing-director/note` | Everyone | None |
| Our Agents | `/agents` | Everyone | None |
| Why Choose Us | `/why-choose-us` | Everyone | None |
| Contact | `/contact` | Everyone | None |
| Privacy Policy / Terms | `/privacy`, `/terms` | Everyone | None |
| Availability — steps 1–4 | `/availability` | Everyone (starts journey) | OTP mid-journey |
| Matched opportunities | `/availability/results/:enquiryId` | Qualified enquirer | JWT + completed enquiry |
| Opportunity detail | `/availability/opportunities/:id` | Qualified enquirer | JWT + opportunity in own matches |
| Admin dashboard | `/admin/*` | Admin | Admin OTP login |

---

## FR-01 — Branding & Visual Design System

- Primary brand **MOMENTUM LIVING**; secondary identity **LABOURCAMPS.COM** (shown as tagline/domain — the company is not "LabourCamps.com").
- Palette: dark navy / deep blue, white, charcoal, subtle gold/warm-metallic accent.
- Clean typography, generous spacing, high-quality architectural imagery, modern cards, subtle animations, professional icons, strong CTA buttons.
- Avoid: cheap templates, heavy gradients, cartoon graphics, bright colours, clutter, excessive animation, "property portal" look.

## FR-02 — Global Navigation & Footer

**Nav:** logo *MOMENTUM LIVING* + *LABOURCAMPS.COM*; items Home · About Us · Managing Director · Our Agents · Why Choose Us · Contact · **AVAILABILITY** (visually prominent button). Hamburger menu on mobile. Availability reachable from every corporate page.

**Footer (all pages):** brand line *"Labour accommodation and real-estate solutions."*; nav links (as above); contact (phone, WhatsApp, email, address — from admin-editable company content); legal (Privacy Policy, Terms & Conditions); social (LinkedIn, Instagram, other approved channels); *© [YEAR] Momentum Living. All Rights Reserved.*

## FR-03 — Home Page

- **Hero:** headline *"Momentum Living — Moving Labour Accommodation Forward."*; supporting text *"Specialists in labour accommodation, property opportunities and professional real-estate solutions."*; corporate workforce-housing image; primary CTA **Learn About Momentum Living**, secondary **Speak to an Agent**; separate prominent **AVAILABILITY** button.
- **About the company** section: specialist in labour accommodation; works with property owners, landlords, tenants, operators, management companies, investors, corporate clients, agents. CTA **Discover Momentum Living** → `/about`.
- **Why Choose Momentum Living** feature cards (8): Specialist Knowledge, Professional Network, Client-Focused Approach, Efficient Process, Market Understanding, Trusted Relationships, Confidentiality, Dedicated Support.
- No listings anywhere. No unsupported claims ("number one", "largest", "guaranteed returns").

## FR-04 — Managing Director Page

Executive profile: portrait placeholder, `[MANAGING DIRECTOR NAME]`, title *Managing Director, Momentum Living*, biography, experience, leadership philosophy, vision for Momentum Living, commitment to clients and professional standards, vision for the labour accommodation market. All admin-editable; **no invented qualifications, awards, years or employers.**

## FR-05 — Note From the Managing Director

Visually distinctive, personal page/section with a clearly marked placeholder message (welcome, company purpose, importance of professional labour accommodation, relationships and trust, commitment to clients; welcomes owners, tenants, operators, partners). Admin-editable.

## FR-06 — Our Agents Page

Profile cards: photo, name, position, specialization, languages, phone, email, WhatsApp CTA, **Chat With Agent** button. Initially placeholder profiles (`[Agent Name]` …) — no invented employees. Admin can add / edit / remove / reorder / deactivate agents.

## FR-07 — Why Choose Us Page

Expanded version of the 8 feature cards from FR-03 with supporting copy. Admin-editable.

## FR-08 — About Us Page (most detailed corporate page)

Sections: **Who We Are**; **What We Do** (labour camps, labour accommodation, property transactions, accommodation opportunities, landlord relationships, tenant requirements, management company relationships, corporate accommodation solutions, investment opportunities where applicable); **Who We Work With** (Tenants, Landlords, Management Companies, Property Owners, Operators, Investors, Corporate Clients, Agents); **Why Momentum Living**; **Our Approach** — *Understand → Qualify → Match → Connect → Negotiate → Complete*; **Contact Momentum Living** (extremely prominent).

No promises of legal, financial or regulatory outcomes.

## FR-09 — Contact Page & Company Details

Admin-editable fields, shown on `/contact`, About Us and footer: Phone `[COMPANY PHONE]`, WhatsApp `[WHATSAPP NUMBER]`, Email `[COMPANY EMAIL]`, General enquiries `[EMAIL]`, Sales `[SALES EMAIL]`, Management `[MANAGEMENT EMAIL]`, Office `[OFFICE ADDRESS]`, Working hours `[WORKING HOURS]`. Includes **Chat With an Agent** and **Start an Enquiry** (→ Availability) CTAs.

## FR-10 — Chat With an Agent

CTA on appropriate corporate pages and on opportunity cards/details. Opens a picker: choose an active agent (or "any agent"), then channel — **WhatsApp** (`wa.me` deep link), **Phone** (`tel:`), **Email** (`mailto:`), **Website chat** (interface built; provider pluggable later, hidden until configured). No fabricated numbers/emails — placeholders until real data is supplied.

---

## FR-11 — Availability Journey (most important functional area)

Clicking **AVAILABILITY** starts a wizard with a progress indicator: **Step 1 → Step 2 → Step 3 → Step 4 → Results**. Inventory is never shown before the journey is complete. Large tap targets, simple forms, mobile-friendly OTP input.

### Step 1 — User Type ("How can we help you?")
| Option | Description |
|--------|-------------|
| **Tenant** | I am looking for labour accommodation / a labour camp. |
| **Landlord** | I own or represent accommodation/property. |
| **Management Company** | I represent a company involved in managing or operating accommodation. |
| **Buyer** *(configurable)* | I'm interested in buying. |
| **Seller** *(configurable)* | I'm interested in selling. |

Later steps adapt to this choice.

### Step 2 — Personal / Company Details
| Form | Fields |
|------|--------|
| **Individual** (tenant/buyer, "individual" toggle) | Full name*, mobile*, email*, nationality (optional, configurable), company name, position/job title |
| **Company** (tenant/buyer "company" toggle, management company) | Company name*, contact person*, position*, email*, mobile*, company website (optional), business type* |
| **Landlord / Owner** (landlord, seller) | Full name / contact person*, company, phone*, email*, ownership/representation status* (owner / authorised representative / agent / other) |

Consent checkbox (required): agreement to be contacted and to the Privacy Policy. No unnecessary sensitive data (no ID numbers, no documents at this step).

### Mobile OTP Verification (between Step 2 and Step 3)
1. Mobile from Step 2 → **Send OTP** → SMS via MSG91.
2. Enter 6-digit code → validated server-side.
3. Wrong → error + retry; **Resend OTP** available (cooldown shown).
4. Rate limiting & lockout: 6-digit, 5-min expiry, max 3 sends / 10 min, 5 wrong attempts → 15-min lock.
5. **No fake OTP in production** — the fixed development code is only allowed when `ENVIRONMENT=development`. The OTP is **never** returned to or displayed in the frontend.

On success the enquirer receives a JWT and the enquiry (type + details) is saved server-side.

### Step 3 — Requirements ("Tell Us What You Need")
Dynamic by user type; checkboxes, dropdowns, radios, sliders, text.

| User type | Fields |
|-----------|--------|
| **Tenant** | Required location (emirate), preferred area, number of occupants, rooms/beds, required capacity, move-in date, contract duration, budget range, accommodation type, facilities required, parking, transport, other requirements |
| **Landlord** | Property location, property type, capacity, number of rooms, current occupancy, availability date, asking price, preference (sale / lease / management), contract preference, property condition, facilities, supporting documents (optional upload) |
| **Management Company** | Company name (prefilled), managed capacity, locations, required capacity, management requirements, operational requirements, contract requirements, other conditions |
| **Buyer** | Location(s), property type, capacity range, budget range, timeline, other requirements |
| **Seller** | Property location, property type, capacity, asking price, timeline, facilities, other details |

Submitting Step 3 completes the enquiry → runs matching → creates the **lead** → notifies admin.

### Step 4 — Matched Opportunities
Shown **only after** type + details + OTP + requirements. Title: **MATCHED OPPORTUNITIES**.

| User type | Shows |
|-----------|-------|
| Tenant | Suitable labour accommodation for lease |
| Landlord | Tenant / operator demand and management opportunities |
| Management Company | Properties and management opportunities |
| Buyer | Properties for acquisition |
| Seller | Buyer / investor demand |

Matching uses the submitted requirements (location, capacity, budget, dates, type, facilities). If nothing matches: a professional empty state ("an agent will contact you with suitable options") plus agent contact — the lead is still recorded.

### Opportunity Card
Reference number, name/reference, general location, capacity, rooms/beds, property type, facilities, availability date, price/rent where appropriate, authorised images, short description; buttons **View Details**, **Request Information**, **Chat With Agent**. Never exposes owner identity/contact.

### Opportunity Detail
Overview, general area (no exact address/pin unless authorised), capacity, accommodation details, facilities, photos, terms, availability, commercial information, reference number, agent contact, **Request Viewing**, **Request More Information**, **Chat With Agent**. Only accessible to an enquirer whose own completed enquiry matched this opportunity.

---

## FR-12 — Lead Management

Every completed availability enquiry creates a structured lead storing: user type, name, company, email, verified phone, requirements, preferences, date/time, matched opportunities, assigned agent, status.

**Lead statuses:** New → Contacted → Qualified → Matching → Viewing Requested → Negotiation → Closed | Not Proceeding.

Information/viewing requests from the results/detail pages are attached to the lead (a viewing request moves an early-stage lead to *Viewing Requested*). Admin receives an in-dashboard alert and email for each new lead and each request.

## FR-13 — Admin Dashboard

Secure admin area (admin-role OTP login; admin JWT 8 h).

| Module | Capabilities |
|--------|-------------|
| **Properties / Opportunities** | Add, edit, archive, mark available/unavailable, upload photos, set capacity, location, pricing, facilities, internal reference number, opportunity kind, assigned agent, confidential owner details (admin-only) |
| **Agents** | Add, edit, remove/deactivate, photo, phone/email/WhatsApp, languages, specialties, display order |
| **Leads** | List/filter by user type, status, agent, date; view details & requirements & matches & requests; assign agent; change status; internal notes timeline |
| **Corporate Content** | Edit Home copy, About Us, Why Choose Us, Managing Director profile, MD's note, company/contact details, social links, Privacy Policy, Terms |
| **Export** *(retained extra)* | CSV of leads and verified enquirers with date filters |
| **Reports** *(retained extra)* | Leads by status / user type, opportunities by availability, date filters |

## FR-14 — Security & Privacy

Secure & validated forms; no public exposure of customer data or OTPs; protected admin; rate limiting; server-side access control on results; Privacy Policy and Terms pages; consent wording on the details step. Do not claim regulatory compliance unless configured and verified. Detail in `security.md`.

## FR-15 — SEO

Per-page titles, meta descriptions, correct H1/H2 hierarchy, image alt text, clean URLs, internal linking, `sitemap.xml`, `robots.txt`. Corporate pages focus on the brand/expertise; terms such as *labour camps UAE, labour accommodation Dubai, workforce accommodation, labour camp for sale, labour accommodation management* used naturally — no keyword stuffing. Availability results/details are `noindex` (they are private).

## FR-16 — Content Placeholders

Wherever real data is missing, use clearly identifiable placeholders (`[MANAGING DIRECTOR NAME]`, `[MANAGING DIRECTOR BIO]`, `[COMPANY PHONE]`, `[WHATSAPP NUMBER]`, `[COMPANY EMAIL]`, `[OFFICE ADDRESS]`, `[AGENT NAME]`, `[AGENT PHONE]` …). **Never invent** employees, phone numbers, emails, addresses, awards, certifications, licences, years of experience, inventory, prices or statistics. All placeholders replaceable from the admin.

---

## User Flow Summary

```
VISITOR (corporate):
Home → About Us / Managing Director / MD Note / Our Agents / Why Choose Us / Contact
     → Chat With an Agent (WhatsApp / phone / email / web chat)
     → no inventory anywhere

ENQUIRER (availability):
AVAILABILITY → 1. user type → 2. details + consent → OTP verify
            → 3. requirements → [matching + lead created + admin notified]
            → 4. matched opportunities → opportunity detail
            → request info / viewing / chat with agent

ADMIN:
Leads (assign agent, status, notes) · Properties/Opportunities · Agents
· Corporate content · Export · Reports · Notifications
```

---

## Critical Acceptance Test (from client spec §33)

1. Visitor lands on homepage and sees corporate information — **no available properties**.
2. Visitor can read About Us, Managing Director, MD's note; can see agents; can contact/chat with an agent.
3. Visitor clicks **AVAILABILITY**, selects Tenant / Landlord / Management Company, enters details, verifies mobile by OTP, enters requirements.
4. System processes requirements; **only now** relevant opportunities are shown.
5. Visitor can view an opportunity, request information/viewing, contact the assigned agent.
6. Lead is recorded in the admin dashboard.
7. **Access control:** without completing qualification + verification, protected results and opportunity details are not reachable (UI **and** API).

---

## Non-Functional Requirements

| Concern | Requirement |
|---------|------------|
| Responsiveness | Mobile-first; desktop, laptop, tablet, iPhone, Android; works from 320 px |
| OTP delivery | < 10 s p95 to UAE and India numbers |
| Matching | < 500 ms p95 — indexed D1 filter + in-Worker scoring of ≤ 200 candidates |
| Worker CPU budget | All request handlers ≤ 10 ms CPU; async work via `waitUntil` |
| D1 reads | Index all hot query paths; stay under 5 M reads/day |
| KV writes | OTP + form rate-limit keys only; stay under 1,000 writes/day |
| File sizes | Photos max 10 MB; documents max 5 MB |
| States | Every screen has loading, empty and error states |

## Cloudflare Free-Tier Design Constraints

| Service | Free Limit | Constraint |
|---------|-----------|-----------|
| Workers | 100,000 req/day, 10 ms CPU | Thin handlers; heavy work via `waitUntil` |
| D1 | 5 GB, 5 M reads/day, 100,000 writes/day | Composite indexes; batch writes |
| KV | 100,000 reads/day, 1,000 writes/day | Rate-limit and config only |
| R2 | 10 GB/month, free egress | Private bucket; enforce file-size limits |

## Out of Scope (v1)

- Native iOS / Android apps
- In-platform payments, escrow or commission collection
- Arabic / RTL
- Live web-chat provider integration (UI is built, provider plugged in later)
- AI/semantic matching (v1 matching is rule-based)
- Agent logins / agent portal (agents are managed by admin; admin works leads)

## Legacy Scope (pre-spec, not in client spec)

The original quotation's **vendor self-service portal** (vendor signup, document verification, vendor listing submission, listing approval queue), customer **browse/search** page, **shortlists** and **booking** requests are **not part of the client spec**. They are hidden from v1 and pending removal once the client confirms (see `implementation-status.md` → Open Questions).
