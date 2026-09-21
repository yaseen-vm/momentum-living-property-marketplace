# Implementation Status: Client Build Spec vs Current Code

**Last reviewed:** 2026-09-21 (branch `feat/stage-5-admin`)
**Compared:** the client's *Build Specification: Momentum Living* against the current repo (docs + `apps/*` code)

The current code was built for the **original marketplace scope** in quotation LNG-2026-WD-003. In that model, vendors self-register and post listings, and customers log in with OTP and browse everything. The client's spec describes a **different product**: a corporate site with no inventory, plus a gated **Availability** qualification journey that produces leads. This file lists, item by item, what is already done, what can be reused, what must be reworked, what is new and what is legacy.

## Legend

| Mark | Meaning |
|------|---------|
| ✅ **Done** | Built and matches the spec |
| 🟡 **Partial** | Exists but incomplete for the spec |
| 🔁 **Rework** | Exists but must change to fit the spec |
| ⬜ **Pending** | Not started |
| 🗄️ **Legacy** | Built for the old scope and not in the client spec. Hide now, remove after client confirmation |
| ⚠️ **Issue** | Security/compliance problem in current code. Fix before launch regardless of scope |

---

## Summary

| Area (spec §) | Status | Notes |
|---------------|--------|-------|
| Platform foundation (monorepo, CI, D1, Workers, Pages) | ✅ | Reusable as-is |
| SMS OTP backend (§15) | ✅ | Dev fallback gated on `ENVIRONMENT=development`; otherwise `503` (Stage 3) |
| Admin shell + notifications (§21) | ✅ | Leads, Properties, Agents, Content, Reports, Export (Stage 5) |
| Branding & design system (§2) | ✅ | Navy/white/charcoal/gold tokens, wordmark with LABOURCAMPS.COM (Stage 1) |
| Global navigation & footer (§3, §25) | ✅ | Built; footer contact reads `site_content.company` (Stage 2) |
| Home page (§4–6) | ✅ | Spec hero, CMS about block + audiences, 8 Why Choose cards; no inventory or invented facts |
| About, MD, MD Note, Agents, Why Us, Contact, Privacy, Terms (§7–10, §22) | ✅ | Built from `site_content` / `GET /agents`; placeholders until the client supplies content (Stage 2) |
| Chat With an Agent (§11) | 🟡 | Picker built (agent → WhatsApp / phone / email). Website chat hidden until a provider is chosen |
| Availability wizard, steps 1–4 (§12–17) | ✅ | `/availability` wizard: type → details + consent → OTP → requirements → results (Stage 3) |
| Matching engine (§17) | ✅ | Rule-based scorer on an indexed candidate query; `lead_matches` snapshot (Stage 3) |
| Opportunity cards + detail (§18–19) | ✅ | Gated cards with View Details / Request Information / Chat With Agent; gated detail page with Request Viewing / More Information (Stage 4) |
| Lead management (§20) | ✅ | `enquiries` = leads with 8 statuses; `lead_requests`; admin leads module with filters, detail, assign, notes, rematch (Stage 5) |
| Admin: properties, agents, leads, content (§21) | ✅ | Leads, Properties (CRUD + archive + availability), Agents (CRUD + photo), Content editor, Reports, Export (Stage 5) |
| Security & privacy (§22) | 🟡 / ⚠️ | Availability API gated + Zod-validated; 2 access-control holes left (public `/listings` API, unsigned file serving), no headers |
| SEO (§24) | ⬜ | One static `<title>`; excluded from original quote |
| Vendor portal, shortlists, public browse | 🗄️ | Not in spec |

**Rough completion against the client spec: about 80 %** (foundation, OTP, corporate site, availability journey, opportunity detail and requests, full admin module). Remaining: hardening (signed URLs, security headers, legacy removal), SEO and responsive QA.

---

## Stage 0: Platform Foundation

| Item | Status | Current state | What's needed |
|------|--------|---------------|---------------|
| pnpm monorepo, workspaces | ✅ | `apps/web`, `apps/api`, `apps/ingestion`, `packages/shared` | — |
| Wrangler config, D1/KV/R2 bindings | ✅ | `apps/api/wrangler.toml` | Add final domain routes |
| D1 migrations | 🟡 | `0001_init` … `0004_site_content_agents`, `0005_availability`, `0006_lead_requests`, `0007_admin` | — |
| CI | 🟡 | `.github/workflows/ci.yml`: typecheck + deploy | Add `pnpm lint`, `pnpm audit` |
| JWT HS256 | ✅ | `apps/api/src/lib/jwt.ts`, `middleware/auth.ts` | Remove `vendor` role usage later |
| Shared types | 🟡 | `packages/shared/src/index.ts`; content + agent types in `content.ts`; enquiry/lead types, location + facility catalogues and Zod schemas in `availability.ts` | Legacy `ListingType` (`property\|plot\|room`) still used by old screens; new code uses `PropertyType` (`labour_camp\|warehouse\|land`) |
| `agent_runs` audit rows | 🟡 | `lib/agentRuns.ts` `runAgent()` wraps the lead notification agent | Wrap the OTP send and legacy tasks |
| Ingestion Worker | 🟡 | Stub `apps/ingestion/src/index.ts` | Phase 2 only |

## Stage 1: Foundation (Design System & Navigation)

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Brand: MOMENTUM LIVING + LABOURCAMPS.COM | §2, notes | ✅ | `components/site/BrandLogo.tsx`: wordmark + LABOURCAMPS.COM secondary line; labour-accommodation positioning | — |
| Palette navy/white/charcoal/gold | §2 | ✅ | `tailwind.config.ts`: `navy` (aliased as `primary`), `charcoal`, `gold` scales; `index.css`: `.btn-*`, `.card`, `.heading-*`, `.eyebrow`, `.container-site` | Older screens (login, admin, vendor) still use hard-coded `#1D3B53`; restyle when each is reworked |
| Global nav (7 items + AVAILABILITY) | §3 | ✅ | `components/site/SiteHeader.tsx`: 6 links + gold AVAILABILITY button, hamburger below `xl`; wrapped by `SiteLayout` | — |
| Footer | §25 | ✅ | `components/site/SiteFooter.tsx`: tagline, nav, contact from `site_content.company`, legal, socials (real `https://` URLs only), © line. Placeholders render as text, never as `tel:`/`mailto:` links | — |
| Page title/meta | §24 | 🟡 | `lib/usePageMeta.ts`: per-route title, description, `noindex`; `index.html` default title/description | react-helmet-async + prerender in the SEO stage |
| Routes for pending pages | §3 | ✅ | All nav targets are real pages; `PagePending.tsx` removed (Stage 3) | — |

## Stage 2: Corporate Pages

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Home hero (headline, CTAs, AVAILABILITY) | §4 | ✅ | `Landing.tsx`: spec headline/text, Learn About / Speak to an Agent, separate AVAILABILITY button | — |
| Home: no inventory | §4, §27 | ✅ | Category cards, marketplace and "Start Your Journey" links removed | — |
| Home: about company section | §5 | ✅ | `site_content.home.about_intro` + audiences, Discover Momentum Living / Contact Us CTAs | — |
| Why Choose cards (8) | §6 | ✅ | Cards from `site_content.why_choose_us.features[].summary`, Learn More → `/why-choose-us` | — |
| Invented facts removed | §30 | ✅ | Licence banner, DET claims, email and phone removed; all contact data comes from `site_content` placeholders | Client to supply real values (admin editor in Stage 5) |
| About Us page | §10 | ✅ | `pages/site/AboutPage.tsx`: Who We Are, What We Do, Who We Work With, Why Momentum Living, Our Approach (6 steps), prominent contact block | — |
| Managing Director page | §7 | ✅ | `ManagingDirectorPage.tsx` from `site_content.md_profile`; portrait placeholder until `photo_key` is set | Client content |
| Note from MD | §8 | ✅ | `MdNotePage.tsx`: letter-styled page from `site_content.md_note` | Client content |
| Our Agents page | §9 | ✅ | `AgentsPage.tsx`: cards from `GET /agents` with Chat With Agent + WhatsApp (when real); loading / empty / error states | Client profiles + photos |
| Why Choose Us page | §6 | ✅ | `WhyChooseUsPage.tsx`: intro + 8 expanded cards | — |
| Contact page | §10 | ✅ | `ContactPage.tsx`: all 8 fields, Chat With an Agent, Start an Enquiry | — |
| Privacy Policy, Terms | §22 | 🟡 | `LegalPage.tsx` renders `legal_privacy` / `legal_terms` as text (never HTML) | Client to supply legal wording |
| Chat With an Agent picker | §11 | 🟡 | `components/site/ChatWithAgent.tsx`: provider in `SiteLayout`; modal: any agent / named agent → WhatsApp (prefilled) / phone / email; unavailable channels shown disabled; opened from cards and detail with the listing's agent preselected (Stage 4) | Website chat once a provider is chosen (open question 7) |
| `site_content` table + `GET /content` | §21, §30 | ✅ | Migration 0004 + placeholder seed; `GET /content`, `GET /content/:key` (5-min cache) | Admin editor (Stage 5) |
| `agents` table + `GET /agents` | §9 | ✅ | Migration 0004 + 3 placeholder profiles; `GET /agents` covered by `(is_active, display_order)` | Admin CRUD (Stage 5) |

## Stage 3: Availability Workflow

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| AVAILABILITY entry, no immediate inventory | §1, §12 | ✅ | `/availability` → `pages/availability/AvailabilityPage.tsx`. Legacy `/listings` web routes redirect to `/availability`; customer `/login` lands on `/availability` | Remove the public `/listings` API (Stage 6) |
| Progress indicator (Step 1→4→Results) | §12 | ✅ | `components/availability/WizardProgress.tsx`; wizard state in `store/availabilityWizard.ts` (sessionStorage, survives a refresh) | — |
| Step 1: Tenant / Landlord / Mgmt Co (+ Buyer / Seller) | §13 | ✅ | `UserTypeStep.tsx`; Buyer/Seller shown only when `availability_config.enable_buyer` / `enable_seller`; the API rejects disabled types | Client decision on Buyer/Seller (open question 2) |
| Step 2: dynamic details (individual / company / landlord) | §14 | ✅ | `DetailsStep.tsx`: 3 forms (individual/company toggle for tenant/buyer), nationality per `availability_config.nationality_field`, required consent checkbox | — |
| OTP send/verify API | §15 | ✅ | `routes/auth.ts`, `lib/otp.ts`: CSPRNG, HMAC hash, 5-min expiry, 5-attempt lock, 3 sends / 10 min; send returns `resend_after` | — |
| OTP UI | §15 | ✅ | `OtpStep.tsx`: mobile from Step 2, explicit Send, numeric `one-time-code` input, resend countdown, change-number link | — |
| OTP never shown in frontend | §15 | ✅ | Not returned by API | — |
| No fake OTP | §15 | ✅ | `agents/otp.ts`: fixed code only when `ENVIRONMENT=development` and MSG91 is not configured; otherwise `503 SERVICE_UNAVAILABLE` | Local dev needs `ENVIRONMENT=development` in `.dev.vars` |
| Step 3: dynamic requirements per user type | §16 | ✅ | `RequirementsStep.tsx` renders `requirementFields.ts` per type; validated by the shared Zod schemas (`packages/shared/src/availability.ts`) in the form and the API | Landlord supporting-document upload (needs an `enquiry_doc` upload context) |
| `enquiries` table + endpoints | §20 | ✅ | Migration 0005; `routes/availability.ts`: `POST` / `GET /availability/enquiries`, `GET …/:id`, `PUT …/:id/requirements`; sequential `LD-YYYY-NNNNNN` reference; 5 enquiries / user / hour | — |
| Matching engine | §17 | ✅ | `lib/matching.ts`: candidate query on `idx_listings_matching`, score 0–100 (capacity, budget, dates, type, facilities), top 20 with score ≥ 40 → `lead_matches` | A listing matches a location filter only when its `location_slug` is from the shared catalogue (admin form, Stage 5) |
| Results page (Matched Opportunities) + empty state | §17 | ✅ | `MatchesPage.tsx` + `OpportunityCard.tsx`; empty state with Chat With an Agent; `noindex` | — |
| Server-side gate on results | §33 | ✅ | `GET /availability/enquiries/:id/matches` → `403 NOT_QUALIFIED` unless owned + completed; card fields only | Public `/listings` API still exists (Stage 6) |
| New-lead notification | §20 | ✅ | `agents/leadNotification.ts` via `runAgent`: `admin_notifications` (`new_lead`) + Resend email to `ADMIN_EMAIL` | Admin UI for `new_lead` items and lead links (Stage 5) |

## Stage 4: Details & Contact

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Opportunity card fields | §18 | ✅ | `OpportunityCard.tsx`: reference no., title, general location, capacity, rooms × persons, type, facilities, availability, price (or "on request"), summary; **View Details**, **Request Information** (shows "Information Requested" once sent), **Chat With Agent** | Signed photo URLs (Stage 6) |
| Opportunity detail page | §19 | ✅ | `pages/availability/OpportunityDetailPage.tsx` at `/availability/opportunities/:id?enquiry=…`; `GET /availability/opportunities/:id` gated by `lead_matches` (403) and availability (404); gallery, overview, facilities, accommodation specs, commercial information, terms, map only when `show_map`; agent block; `noindex`. Migration 0006 adds `listings.terms`, `show_map` | Signed photo URLs (Stage 6) |
| Hide owner info | §18 | ✅ | Card and detail queries select enquirer-safe columns only; coordinates nulled unless `show_map`; confidential `owner_name`, `owner_contact`, `internal_notes` columns (migration 0007) admin-only | — |
| Request information / viewing | §19 | ✅ | `RequestDialog.tsx` → `POST /availability/enquiries/:id/requests` (`leadRequestSchema`); `lead_requests` (migration 0006) with a unique `(enquiry_id, listing_id, kind)`; a viewing moves `new\|contacted\|qualified\|matching` leads to `viewing_requested`; 10 / user / hour; admin sees requests on lead detail (Stage 5) | — |
| Contact assigned agent | §33 | ✅ | Card and detail open the Chat With an Agent picker with `listings.assigned_agent_id` preselected (any agent when unset or inactive); admin assigns agents via properties CRUD (Stage 5) | — |
| Lead notification (dashboard + email) | §20 | ✅ | `new_lead` (Stage 3) and `lead_request` (`notifyLeadRequest`) via `runAgent`: `admin_notifications` + Resend email; emails include admin lead link (Stage 5); notification dropdown with mark-read (Stage 5) | — |

## Stage 5: Admin

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Admin login / protection | §21 | ✅ | OTP + `role=admin` in D1, 8 h JWT, `ProtectedRoute` | — |
| Admin layout, notifications feed | §21 | ✅ | `AdminLayout.tsx` with navy sidebar, 6-item nav (Leads, Properties, Agents, Content, Reports, Export), notification dropdown with mark-read / mark-all-read, mobile bottom nav | — |
| **Leads** list/filter/assign/status/notes | §20–21 | ✅ | `AdminLeadsPage.tsx`, `AdminLeadDetailPage.tsx`; `routes/admin/leads.ts`: list with filters (user_type, lead_status, agent, stage, date range, search), detail (contact, requirements with field labels, matches, requests, notes timeline), PATCH (status + agent + note), standalone notes, rematch | — |
| **Properties** add/edit/archive/availability/photos/pricing/facilities/ref no. | §21 | ✅ | `AdminPropertiesPage.tsx`, `AdminPropertyFormPage.tsx`; `routes/admin/properties.ts`: list with filters, create with auto-reference `ML-{LC\|WH\|LD}-{seq:04}`, edit (all fields incl. `opportunity_kind`, photos with alt text and reorder), availability toggle, archive. Migration 0007: `vendor_id`/`price` nullable, `owner_name`, `owner_contact`, `internal_notes`, `created_by`, `archived_at` | — |
| **Agents** CRUD | §21 | ✅ | `AdminAgentsPage.tsx` with add/edit modal; `routes/admin/agents.ts`: list (incl. inactive, with lead/property counts), create, update, delete (only unreferenced, else 409); photo upload to `public-media/agents/` | — |
| **Corporate content** editor | §21 | ✅ | `AdminContentPage.tsx` with recursive field editor (text, textarea, boolean, select, image upload, string lists, object lists, groups); `routes/admin/content.ts`: GET all keys, PUT per key with per-key Zod validation from `SITE_CONTENT_SCHEMAS` | — |
| CSV export | extra | ✅ | `AdminExportPage.tsx`, `routes/admin/export.ts`: `leads` and `enquirers` exports with period, user_type, lead_status filters; CSV blob download; 5/hour rate limit; range ≤ 366 days | — |
| Reports | extra | ✅ | `AdminReportsPage.tsx`, `routes/admin/reports.ts`: leads by status + user type, requests by kind, properties by kind + status + available count, verified enquirers; stat cards linked to filtered admin lists; date range picker | — |

## Stage 6: Hardening

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Public listing API | §27, §33 | ⚠️ | `GET /listings`, `GET /listings/:id` have **no auth**, so anyone can pull all inventory | Remove; serve only via `/availability/*` and `/admin/*` |
| Public file serving | §22 | ⚠️ | `GET /upload/files/:key` has **no auth for any key**, including `vendor-docs/*` | HMAC-signed URLs (1 h) except `public-media/*` |
| OTP fallback | §15 | ✅ | Gated on `ENVIRONMENT` (Stage 3) | — |
| Input validation | §22 | 🟡 | Zod on `/availability/*` (shared schemas); older handlers use manual checks | Zod schemas on every handler |
| Security headers / CSP | §22 | ⬜ | None | Hono middleware + Pages `_headers` |
| Rate limits on forms | §22 | 🟡 | OTP, enquiry creation (`rl:enquiry:{user_id}`), info/viewing requests (`rl:request:{user_id}`) | Contact form if one is added |
| Consent wording | §22 | ✅ | Details-step checkbox (wording from `security.md`), stored as `enquiries.consent_at` | — |
| CORS for final domain | — | 🟡 | `momentum-living.com` + Pages domain | Add `labourcamps.com` |
| Responsive QA | §23 | 🟡 | Pages are responsive-minded; not tested against the new flows | QA 320 px → desktop |
| Loading / empty / error states | §32 | 🟡 | Spinner component exists | Every new screen |
| SEO (titles, meta, H1/H2, alt, sitemap, robots, prerender) | §24 | ⬜ | | react-helmet-async + prerender + sitemap |

## Legacy (not in the client spec)

| Item | Where | Recommendation |
|------|-------|----------------|
| Vendor OTP login, register, pending, dashboard, listing form | `pages/vendor/*`, `routes/vendor/*`, `/vendor/login` | Hide routes now. Move the listing form into admin. Delete the rest after client confirmation |
| Vendor verification queue | `AdminVendorsPage.tsx`, `routes/admin/vendors.ts` | Hide, then delete |
| Listing approval queue | `AdminListingsPage.tsx`, `routes/admin/listings.ts` | Replace with admin Properties |
| Customer browse page | `ListingBrowsePage.tsx`, `ListingDetailPage.tsx`, `routes/listings.ts` | Web routes already redirect to `/availability`; delete the pages and the public API (⚠️) |
| Shortlists | `routes/customer/shortlists.ts`, `shortlists` table | Delete |
| Bookings | `routes/customer/bookings.ts`, `routes/admin/bookings.ts`, `bookings`, `booking_notes` | Replace with leads; migrate any real data first |
| Moderation agent / vendor emails | `agents/moderation.ts` | Delete with vendor portal |
| Vendor documents + UAE vendor fields (trade licence, VAT…) | `vendor_documents`, migration 0002 vendor columns | Drop after confirmation |

## What can be reused

- **OTP + JWT + KV rate limiting**, used unchanged inside the wizard
- **Labour-camp listing fields** (rooms, persons/room, capacity, MOHRE, Ejari, commercial fees): reuse for admin properties and cards
- **R2 upload route** (type/size checks): extend with new contexts
- **Listing detail page layout** (gallery, specs, map): reuse inside the gated detail page
- **Admin layout, notifications, CSV streaming, reports scaffolding**
- **UI primitives** (`components/ui/*`), `OtpForm`, `ProtectedRoute`, `lib/api.ts`, auth store
- **Imagery:** `professional_accommodation_*.jpg`, `dubai_commercial_hero_*.jpg` suit the corporate hero. Drop the residential images (`kitchen_interior`, `interior_living`, `hero_modern_home`, `exterior_patio`)

---

## Pending Work & Effort Estimate

Rough developer-day estimates for one full-stack developer, assuming the reuse listed above. They are for planning the change request, not a commitment.

| # | Work package | Spec § | Est. days |
|---|--------------|--------|-----------|
| 1 | Design system, rebrand, nav, footer | §2, §3, §25 | 1.5 |
| 2 | Corporate pages ×7 + Privacy/Terms + chat picker | §4–11, §22 | 3 |
| 3 | CMS (`site_content`) + agents tables, public APIs, placeholder seed | §9, §21, §30 | 1 |
| 4 | Availability wizard (steps 1–3, dynamic forms, OTP step, consent) | §12–16 | 3 |
| 5 | Enquiries/leads schema + endpoints + matching engine + results + detail + requests | §17–20 | 3.5 |
| 6 | Admin: leads, properties rework, agents, content editor, export/reports retarget | §21 | 4 |
| 7 | Hardening: fix ⚠️ issues, Zod, headers, rate limits, states, responsive QA | §22–23 | 2 |
| 8 | SEO: helmet, prerender, sitemap/robots, alt text | §24 | 1 |
| 9 | Legacy removal + migrations cleanup | — | 1 |
| 10 | Acceptance testing (§33) desktop/mobile, deployment, training | §33 | 1.5 |
| | **Total** | | **≈ 21.5 days** |

The original quotation was ₹ 80,000 for 8 working days and included no SEO. Packages 2–6 and 8 are **new scope** and need a revised quotation or change request (quotation T&C: scope beyond listed items is quoted separately). The same quotation's "Not included" list puts content writing and photography on the client, so the client must supply the MD bio, agent profiles, contact details, legal wording and photos.

**Running costs** outside the quote (paid by the client): MSG91 SMS credits + UAE sender ID, domain `labourcamps.com`. Cloudflare and Resend stay on free tiers at v1 volumes.

---

## Critical Acceptance Test (spec §33): current result

| # | Check | Today |
|---|-------|-------|
| 1 | Visitor lands on homepage, sees corporate info | ✅ Hero, about, Why Choose cards |
| 2 | Visitor does **not** see available properties | ✅ No inventory links on corporate pages or nav/footer |
| 3 | Can read About Us | ✅ |
| 4 | Can read about the Managing Director | ✅ (placeholder content) |
| 5 | Can read the MD's note | ✅ (placeholder content) |
| 6 | Can see the agents | ✅ (placeholder profiles) |
| 7 | Can contact/chat with an agent | 🟡 Picker built; channels activate once real numbers/emails are entered |
| 8 | Clicks AVAILABILITY | ✅ Button on every public page opens the wizard |
| 9 | Selects Tenant / Landlord / Management Company | ✅ |
| 10 | Enters required details | ✅ |
| 11 | Verifies mobile by OTP | ✅ Wizard step |
| 12 | Enters requirements | ✅ |
| 13 | System processes requirements | ✅ Matching engine + lead |
| 14 | Only now sees relevant opportunities | ✅ Results page only after completion |
| 15 | Can view an opportunity | ✅ Result cards and gated detail page |
| 16 | Can request information/viewing | ✅ `lead_requests` + admin notification and email |
| 17 | Can contact assigned agent | 🟡 Chat With Agent on cards (listing's agent, else any agent) |
| 18 | Lead recorded in admin dashboard | ✅ `enquiries` row + `new_lead` notification + admin leads module with full detail |
| 19 | Access control: unqualified user can't reach results | 🟡 Results gated server-side; legacy public `/listings` API still to remove (Stage 6) |

---

## Open Questions for the Client

1. **Vendor portal:** confirm we remove landlord self-registration and self-posted listings (spec has the admin add all properties; landlords only submit enquiries).
2. **Buyer / Seller options:** enable in Step 1 now, or hide behind the config flag?
3. **Nationality field:** hidden, optional or required?
4. **Opportunities for landlords/sellers:** will the admin create anonymised "tenant demand" / "investor demand" records, or should these user types just get a confirmation + agent contact?
5. **Content:** MD name, bio, photo and note; agent profiles and photos; company phone/WhatsApp/emails/address/hours; social links; Privacy Policy and Terms wording. Placeholders stay until supplied.
6. **Licensing claims:** may the site mention the DET brokerage licence? (Currently shown without confirmation. The spec forbids unconfirmed claims.)
7. **Website chat provider:** Tawk.to / Crisp / none for v1?
8. **Domain:** `labourcamps.com` ownership and DNS access; `momentum-living.com` still needed?
9. **Commercials:** approve the revised quotation or change request for the new scope before stages 1–7 continue.
