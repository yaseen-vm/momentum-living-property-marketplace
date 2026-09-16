# Property Marketplace Platform — Requirements

**Client:** Momentum Living, UAE
**Vendor:** Lapofy Next Gen Systems LLP
**Quote No.:** LNG-2026-WD-003
**Date:** 01 August 2026
**Total:** ₹ 80,000

---

## Project Overview

A listing marketplace for properties, plots and rooms. Owners register as a vendor type (landlord, company, agent or broker), are verified by admin before they can post, and every listing is approved before it appears publicly. Vendors and customers both verify their mobile by SMS OTP. Customers search approved listings and register interest; the admin is notified and closes the deal offline.

---

## Modules & Scope

### 1. UI/UX Design & Design System — ₹ 10,000
- Complete design for public site, vendor portal and admin panel
- Colour system, typography, listing cards, search and detail layouts
- Responsive: desktop, tablet and mobile

### 2. Public Website & Listing Search — ₹ 12,000
- Pages: Home, Category, Listing Detail, About, Contact
- Search & filters: type (property / plot / room), location, price range, size, amenities
- Photo galleries, map location, sorting, pagination
- Shortlist / favourites functionality

### 3. Customer Registration & SMS OTP Verification — ₹ 7,000
- Customer signup with mobile number verified by SMS OTP before search access
- OTP generation, expiry, resend and retry limits
- SMS gateway integration
- Profile, saved listings and enquiry history

### 4. Vendor Registration, Onboarding & SMS OTP — ₹ 8,000
- Signup as landlord, company, agent or broker
- Mobile number verified by SMS OTP
- Document uploads per vendor type: trade licence, ID, ownership proof
- Submission moves to pending state until admin verifies

### 5. Vendor Dashboard & Listing Submission — ₹ 11,000
- Verified vendors create listings: photos, description, price, location, specifications
- Listing states: Draft → Submitted → Pending / Approved / Rejected
- Actions: edit, mark as rented/sold, withdraw
- Admin remarks visible to vendor

### 6. Admin Panel — Verification & Approvals — ₹ 13,000
- Vendor verification queue: document review, approve or reject with reason
- Listing approval queue: review content/photos, approve / request changes / reject
- Full control over users, listings, categories, locations and site content

### 7. Enquiry & Interest Management — ₹ 9,000
- Admin notified by email and in-dashboard alert when a customer registers interest
- Central enquiry view: customer, listing, vendor with contact details of both parties
- Call status workflow: Pending → Owner Confirmed → Customer Contacted → Closed
- Internal notes for offline deal tracking

### 8. Customer Data Export — Segmented CSV — ₹ 5,000
- Admin exports customer data to CSV for: last 24 hours, 2 days, 1 week, 1 month, custom date range
- Separate exports:
  - Mobile-verified customers
  - Customers who registered interest (includes listing and category enquired about)
- Columns: name, mobile, verification status, signup date, enquiry details

### 9. Reports, Deployment & Training — ₹ 5,000
- Admin summary: listings, vendors, customers, enquiries with date filters
- SSL setup, analytics, production deployment, QA testing
- Training session with documentation

---

## Platform Workflow

| Stage | What Happens |
|-------|-------------|
| 1. Vendor signs up | Registers as landlord / company / agent / broker, verifies mobile via OTP, uploads documents |
| 2. Admin verifies vendor | Reviews documents; approves or rejects. Only verified vendors can post |
| 3. Vendor submits listing | Creates property / plot / room listing with photos and details; submits for review |
| 4. Admin approves listing | Checks listing; publishes, requests changes, or rejects |
| 5. Customer verifies & searches | Signs up, confirms mobile via OTP, then searches approved listings |
| 6. Interest raised, admin closes | Customer registers interest; admin notified with both contacts; deal closed offline |

---

## Timeline & Payment

- Delivery in **8 working days** from advance payment and confirmed requirements
- 50% advance — ₹ 40,000 (to commence work)
- 30% on demo approval — ₹ 24,000
- 20% on final delivery — ₹ 16,000

---

## Inclusions

- Fully responsive (mobile, tablet, desktop)
- Admin and vendor training with documentation
- 30 days free support after launch (bug fixes)
- Two rounds of design revisions at mockup stage
- Source code ownership transferred on final payment

---

## Exclusions

- Native mobile apps (iOS / Android)
- SMS/OTP gateway subscription and per-message charges (client pays directly)
- Domain, hosting and cloud infrastructure (quoted separately)
- Arabic or multi-language version (available as add-on)
- Online payments, escrow or commission collection (handled offline)
- Content writing, photography and logo design
- SEO optimisation (quoted separately if required)

---

## Terms

- Valid for 30 days from quote date
- All amounts in INR, exclusive of applicable taxes
- Scope additions quoted and approved separately
- Additional design revisions: ₹ 2,500 per round
- Optional annual maintenance from ₹ 12,000/year
