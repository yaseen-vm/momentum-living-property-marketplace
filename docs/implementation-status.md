# Implementation Status: Client Build Spec vs Current Code

**Last reviewed:** 2026-09-21 (branch `feat/stage-1-foundation`)
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
| SMS OTP backend (§15) | ✅ / ⚠️ | Solid. Dev fallback code needs environment gating |
| Admin shell + notifications (§21) | 🟡 | Layout reusable; modules need retargeting |
| Branding & design system (§2) | ✅ | Navy/white/charcoal/gold tokens, wordmark with LABOURCAMPS.COM (Stage 1) |
| Global navigation & footer (§3, §25) | ✅ / 🟡 | Built; footer contact reads placeholders until `site_content` lands |
| Home page (§4–6) | 🟡 | Spec hero + short about block; no inventory or invented facts. Why Choose cards pending |
| About, MD, MD Note, Agents, Why Us, Contact, Privacy, Terms (§7–10, §22) | ⬜ | None exist |
| Chat With an Agent (§11) | ⬜ | |
| Availability wizard, steps 1–4 (§12–17) | ⬜ | Only a plain OTP login page exists |
| Matching engine (§17) | ⬜ | Only a filter/browse query exists |
| Opportunity cards + detail (§18–19) | 🔁 | Browse/detail pages exist but are ungated and customer-browse styled |
| Lead management (§20) | 🔁 | `bookings` exist with the wrong model and statuses |
| Admin: properties, agents, leads, content (§21) | ⬜ / 🔁 | Only vendor/listing approval queues and bookings exist |
| Security & privacy (§22) | 🟡 / ⚠️ | 3 access-control holes, no validation lib, no headers |
| SEO (§24) | ⬜ | One static `<title>`; excluded from original quote |
| Vendor portal, shortlists, public browse | 🗄️ | Not in spec |

**Rough completion against the client spec: about 15–20 %** (foundation, OTP and admin shell). Most of the product-facing work is still to be done.

---

## Stage 0: Platform Foundation

| Item | Status | Current state | What's needed |
|------|--------|---------------|---------------|
| pnpm monorepo, workspaces | ✅ | `apps/web`, `apps/api`, `apps/ingestion`, `packages/shared` | — |
| Wrangler config, D1/KV/R2 bindings | ✅ | `apps/api/wrangler.toml` | Add final domain routes |
| D1 migrations | 🟡 | `0001_init`, `0002_uae_fields`, `0003_booking_contact_fields` | New migrations (see Stage 3–5) |
| CI | 🟡 | `.github/workflows/ci.yml`: typecheck + deploy | Add `pnpm lint`, `pnpm audit` |
| JWT HS256 | ✅ | `apps/api/src/lib/jwt.ts`, `middleware/auth.ts` | Remove `vendor` role usage later |
| Shared types | 🔁 | `packages/shared/src/index.ts` | `ListingType` is `property\|plot\|room` but the form uses `labour_camp\|warehouse\|land`. Add enquiry/lead/agent types |
| `agent_runs` audit rows | ⬜ | Table exists; no code writes to it | Wrap `waitUntil` tasks per `agent-spec.md` |
| Ingestion Worker | 🟡 | Stub `apps/ingestion/src/index.ts` | Phase 2 only |

## Stage 1: Foundation (Design System & Navigation)

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Brand: MOMENTUM LIVING + LABOURCAMPS.COM | §2, notes | ✅ | `components/site/BrandLogo.tsx`: wordmark + LABOURCAMPS.COM secondary line; labour-accommodation positioning | — |
| Palette navy/white/charcoal/gold | §2 | ✅ | `tailwind.config.ts`: `navy` (aliased as `primary`), `charcoal`, `gold` scales; `index.css`: `.btn-*`, `.card`, `.heading-*`, `.eyebrow`, `.container-site` | Older screens (login, admin, vendor) still use hard-coded `#1D3B53`; restyle when each is reworked |
| Global nav (7 items + AVAILABILITY) | §3 | ✅ | `components/site/SiteHeader.tsx`: 6 links + gold AVAILABILITY button, hamburger below `xl`; wrapped by `SiteLayout` | — |
| Footer | §25 | 🟡 | `components/site/SiteFooter.tsx`: tagline, nav, contact, legal, socials, © line. Placeholders render as text, never as `tel:`/`mailto:` links | Read `site_content.company` instead of `COMPANY_PLACEHOLDER` (Stage 2) |
| Page title/meta | §24 | 🟡 | `lib/usePageMeta.ts`: per-route title, description, `noindex`; `index.html` default title/description | react-helmet-async + prerender in the SEO stage |
| Routes for pending pages | §3 | 🟡 | `/about`, `/managing-director(/note)`, `/agents`, `/why-choose-us`, `/contact`, `/privacy`, `/terms`, `/availability` render `pages/site/PagePending.tsx` (`noindex`) | Replace with real pages (Stages 2–3) |

## Stage 2: Corporate Pages

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Home hero (headline, CTAs, AVAILABILITY) | §4 | ✅ | `Landing.tsx`: spec headline/text, Learn About / Speak to an Agent, separate AVAILABILITY button | — |
| Home: no inventory | §4, §27 | ✅ | Category cards, marketplace and "Start Your Journey" links removed | — |
| Home: about company section | §5 | 🟡 | Short "Who we are" block + Discover Momentum Living CTA | Full copy from `site_content.home` |
| Why Choose cards (8) | §6 | ⬜ | "How the Matching Works" section instead | New cards from `site_content.why_choose_us` |
| Invented facts removed | §30 | ✅ | Licence banner, DET claims, email and phone removed; footer uses `[COMPANY EMAIL]`-style placeholders | Source from CMS (Stage 2) |
| About Us page | §10 | ⬜ | | `/about`, 6 sections + prominent contact block |
| Managing Director page | §7 | ⬜ | | `/managing-director` from `site_content.md_profile` |
| Note from MD | §8 | ⬜ | | `/managing-director/note` from `site_content.md_note` |
| Our Agents page | §9 | ⬜ | | `/agents`, cards from `GET /agents` |
| Why Choose Us page | §6 | ⬜ | | `/why-choose-us` |
| Contact page | §10 | ⬜ | Only an anchor section on the landing page | `/contact` with all 8 fields |
| Privacy Policy, Terms | §22 | ⬜ | | `/privacy`, `/terms` (placeholder text until client supplies wording) |
| Chat With an Agent picker | §11 | ⬜ | | Modal: agent → WhatsApp / phone / email / web chat slot |
| `site_content` table + `GET /content` | §21, §30 | ⬜ | | Migration + seed placeholders + route |
| `agents` table + `GET /agents` | §9 | ⬜ | | Migration + route |

## Stage 3: Availability Workflow

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| AVAILABILITY entry, no immediate inventory | §1, §12 | 🔁 | "Browse Properties" → `/login` → full list | `/availability` wizard route |
| Progress indicator (Step 1→4→Results) | §12 | ⬜ | | Wizard shell component |
| Step 1: Tenant / Landlord / Mgmt Co (+ Buyer / Seller) | §13 | ⬜ | Only customer vs vendor login | Type selector + config flag for buyer/seller |
| Step 2: dynamic details (individual / company / landlord) | §14 | ⬜ | Booking modal collects name/email only | 3 form variants + consent checkbox |
| OTP send/verify API | §15 | ✅ | `routes/auth.ts`, `lib/otp.ts`: CSPRNG, HMAC hash, 5-min expiry, 5-attempt lock, 3 sends / 10 min | — |
| OTP UI | §15 | 🟡 | `components/OtpForm.tsx` inside `OtpLoginPage` | Embed as a wizard step; resend countdown; mobile-friendly input |
| OTP never shown in frontend | §15 | ✅ | Not returned by API | — |
| No fake OTP | §15 | ⚠️ | `agents/otp.ts`: `123456` whenever `MSG91_AUTH_KEY` is a placeholder, in **any** environment | Gate on `ENVIRONMENT === "development"`; otherwise return 503 |
| Step 3: dynamic requirements per user type | §16 | ⬜ | | 5 requirement forms + Zod schemas (shared) |
| `enquiries` table + endpoints | §20 | ⬜ | | Migration; `POST /availability/enquiries`, `GET`, `PUT …/requirements` |
| Matching engine | §17 | ⬜ | `GET /listings` filter query (no requirements input) | Rule-based scorer + `lead_matches` table + covering index |
| Results page (Matched Opportunities) + empty state | §17 | ⬜ | `ListingBrowsePage.tsx` (browse all + filters) | New results page; reuse card styling only |
| Server-side gate on results | §33 | ⚠️⬜ | Frontend `ProtectedRoute` only; **API `/listings` is public** | `403 NOT_QUALIFIED` unless the enquiry is owned + completed |

## Stage 4: Details & Contact

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Opportunity card fields | §18 | 🔁 | Card has title/price/location/size/beds | Add reference no., capacity, facilities, availability date, 3 buttons |
| Opportunity detail page | §19 | 🔁 | `ListingDetailPage.tsx` with gallery, map, specs | Gate by `lead_matches`; general area only; terms; agent block; request buttons |
| Hide owner info | §18 | ✅/🔁 | Owner not shown to customers today | Keep; add confidential admin-only fields |
| Request information / viewing | §19 | 🔁 | "Book" → `bookings` | `lead_requests` + endpoint |
| Contact assigned agent | §33 | ⬜ | | `listings.assigned_agent_id` + chat picker |
| Lead notification (dashboard + email) | §20 | 🔁 | `agents/notification.ts` for bookings | Retarget to `new_lead` / `lead_request` |

## Stage 5: Admin

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Admin login / protection | §21 | ✅ | OTP + `role=admin` in D1, 8 h JWT, `ProtectedRoute` | — |
| Admin layout, notifications feed | §21 | 🟡 | `AdminLayout.tsx`, `routes/admin/notifications.ts` | New nav items; new notification types |
| **Leads** list/filter/assign/status/notes | §20–21 | 🔁 | `AdminBookingsPage.tsx`: 4 statuses, per-booking notes | Rebuild on `enquiries`: 8 statuses, user-type filter, agent assign, requirements view, matches, rematch |
| **Properties** add/edit/archive/availability/photos/pricing/facilities/ref no. | §21 | 🔁 | Only vendors create listings (`VendorListingFormPage.tsx`, 426 lines, labour-camp fields); admin can only approve/reject | Move the form into admin; add `opportunity_kind`, `reference_no`, `is_available`, archive, confidential owner fields; relax `vendor_id NOT NULL` (table rebuild) |
| **Agents** CRUD | §21 | ⬜ | | Page + API + photo upload (`public-media/`) |
| **Corporate content** editor | §21 | ⬜ | | Page per content key + `PUT /admin/content/:key` |
| CSV export | extra | 🔁 | `customers` / `owners` exports | Retarget to `leads` / `enquirers` |
| Reports | extra | 🔁 | Listings/vendors/customers/bookings counts | Leads by status/type, properties by availability |

## Stage 6: Hardening

| Item | Spec | Status | Current state | What's needed |
|------|------|--------|---------------|---------------|
| Public listing API | §27, §33 | ⚠️ | `GET /listings`, `GET /listings/:id` have **no auth**, so anyone can pull all inventory | Remove; serve only via `/availability/*` and `/admin/*` |
| Public file serving | §22 | ⚠️ | `GET /upload/files/:key` has **no auth for any key**, including `vendor-docs/*` | HMAC-signed URLs (1 h) except `public-media/*` |
| OTP fallback | §15 | ⚠️ | See Stage 3 | Environment gate |
| Input validation | §22 | 🟡 | Manual checks; no Zod in `apps/api` | Zod schemas on every handler |
| Security headers / CSP | §22 | ⬜ | None | Hono middleware + Pages `_headers` |
| Rate limits on forms | §22 | 🟡 | OTP only | Enquiry + request limits (KV) |
| Consent wording | §22 | ⬜ | | Details-step checkbox, `consent_at` |
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
| Customer browse page | `ListingBrowsePage.tsx`, `routes/listings.ts` | Delete (⚠️ public API) |
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
| 1 | Visitor lands on homepage, sees corporate info | 🟡 Labour-accommodation hero + intro; full sections pending |
| 2 | Visitor does **not** see available properties | ✅ No inventory links on corporate pages or nav/footer |
| 3 | Can read About Us | ❌ |
| 4 | Can read about the Managing Director | ❌ |
| 5 | Can read the MD's note | ❌ |
| 6 | Can see the agents | ❌ |
| 7 | Can contact/chat with an agent | 🟡 mailto/tel only, with invented values |
| 8 | Clicks AVAILABILITY | 🟡 Button on every public page; leads to a holding page until Stage 3 |
| 9 | Selects Tenant / Landlord / Management Company | ❌ |
| 10 | Enters required details | ❌ |
| 11 | Verifies mobile by OTP | ✅ Backend works (UI needs moving into the wizard) |
| 12 | Enters requirements | ❌ |
| 13 | System processes requirements | ❌ |
| 14 | Only now sees relevant opportunities | ❌ Sees everything right after login |
| 15 | Can view an opportunity | 🟡 Detail page exists |
| 16 | Can request information/viewing | 🟡 "Book" only |
| 17 | Can contact assigned agent | ❌ |
| 18 | Lead recorded in admin dashboard | 🟡 As a booking, without requirements/user type |
| 19 | Access control: unqualified user can't reach results | ❌ Public `/listings` API |

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
