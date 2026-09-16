# Momentum Living — Property Marketplace Platform

A listing marketplace for properties, plots and rooms built for **Momentum Living, UAE**.

Vendors register as landlord, company, agent or broker, get verified by admin, then submit listings for approval before they appear publicly. Customers verify their mobile via SMS OTP, search approved listings, and register interest. The admin closes deals offline.

---

## Docs in this repo

| File | Description |
|------|-------------|
| [`quotation-LNG-2026-WD-003.md`](./quotation-LNG-2026-WD-003.md) | Full quotation from Lapofy Next Gen Systems LLP — scope, costs, timeline, terms |
| [`requirements.md`](./requirements.md) | Detailed functional requirements broken down by module |
| [`tech-stack.md`](./tech-stack.md) | Recommended tech stack with justifications and folder structure |

---

## Platform at a Glance

```
Vendor signs up → Admin verifies vendor → Vendor submits listing
→ Admin approves listing → Customer searches → Customer registers interest
→ Admin notifies both parties → Deal closed offline
```

### User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Verify mobile, search listings, shortlist, register interest |
| **Vendor** | Landlord / company / agent / broker — submit and manage listings |
| **Admin** | Verify vendors, approve listings, manage enquiries, export data, view reports |

---

## Key Features

- **SMS OTP** verification for both customers and vendors
- **Multi-vendor types** — landlord, company, agent, broker (different doc requirements per type)
- **Two-stage moderation** — vendor verification + listing approval before anything goes live
- **Enquiry workflow** — Pending → Owner Confirmed → Customer Contacted → Closed
- **Segmented CSV exports** — verified customers and interested customers, filterable by date range
- **Fully responsive** — mobile, tablet and desktop

---

## Quote Summary

| | |
|---|---|
| **Vendor** | Lapofy Next Gen Systems LLP |
| **Quote No.** | LNG-2026-WD-003 |
| **Total** | ₹ 80,000 |
| **Delivery** | 8 working days from advance + confirmed requirements |
| **Payment** | 50% advance / 30% demo approval / 20% final delivery |

---

## Not in Scope

- Native iOS / Android apps
- SMS gateway costs (client pays directly)
- Domain, hosting, infrastructure
- Online payments / escrow
- SEO, content writing, translation
