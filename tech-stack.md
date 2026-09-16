# Tech Stack — Property Marketplace Platform

Recommended stack for the Momentum Living property marketplace based on the project scope: multi-role web app (public, vendor portal, admin panel), SMS OTP auth, image uploads, search/filter listings, CSV exports, and an 8-day delivery target.

---

## Frontend

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Next.js 14 (App Router)** | SSR for public listing pages (SEO), SPA behaviour for portals |
| Language | **TypeScript** | Type safety across all three portals |
| Styling | **Tailwind CSS** | Rapid responsive UI; aligns with 8-day timeline |
| UI Components | **shadcn/ui** | Pre-built accessible components (forms, tables, modals) |
| State management | **Zustand** | Lightweight; handles auth state and shortlist/favourites |
| Maps | **Leaflet / React Leaflet** | Open-source, no billing surprises; show listing locations |
| Image handling | **Next.js Image + Cloudinary** | Optimised delivery, upload transforms for listing photos |
| Forms | **React Hook Form + Zod** | Validation with TypeScript schema sharing |

---

## Backend

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | **Node.js 20** | Mature ecosystem; matches Next.js deployment |
| API layer | **Next.js API Routes / Route Handlers** | Co-located with frontend; reduces infra complexity |
| ORM | **Prisma** | Type-safe DB access; migrations for iterative schema work |
| Database | **PostgreSQL** | Relational integrity for users → listings → enquiries |
| File storage | **AWS S3 / Cloudflare R2** | Vendor documents and listing photos |
| Auth | **NextAuth.js (Auth.js v5)** | Session management for customers, vendors and admin |
| SMS OTP | **Twilio / MSG91** | Reliable OTP delivery to UAE and India numbers |
| Email alerts | **Nodemailer + SMTP / Resend** | Admin enquiry notifications |

---

## Admin Panel

Built as a protected Next.js route group (`/admin/*`) with role-based middleware.

| Feature | Approach |
|---------|----------|
| Data tables | **TanStack Table v8** — sortable, filterable, paginated |
| CSV export | **json2csv** library — server-side generation, streamed to client |
| Dashboard charts | **Recharts** — lightweight, fits summary reports |
| Rich text / remarks | **Tiptap** (minimal config) for admin feedback on listings |

---

## Infrastructure & DevOps

| Concern | Choice |
|---------|--------|
| Hosting | **Vercel** (frontend + API routes) — zero-config Next.js deploy |
| Database hosting | **Supabase** or **Neon** (managed Postgres, free tier available) |
| File storage | **Cloudflare R2** (S3-compatible, no egress fees) |
| SSL | Automatic via Vercel |
| Analytics | **Vercel Analytics** or **Plausible** |
| Environment config | `.env` files + Vercel environment variables |

---

## Third-Party Services

| Service | Purpose |
|---------|---------|
| **MSG91 / Twilio** | SMS OTP for customer and vendor verification |
| **Cloudinary / R2** | Photo uploads and document storage |
| **Google Maps API / Leaflet + OSM** | Listing map display |
| **Resend / SendGrid** | Transactional email (enquiry notifications) |

> **Note:** SMS gateway subscription and per-message charges are paid directly by the client (Momentum Living) — not included in the project cost.

---

## Development Tooling

| Tool | Purpose |
|------|---------|
| **pnpm** | Fast, disk-efficient package manager |
| **ESLint + Prettier** | Code quality and formatting |
| **Husky + lint-staged** | Pre-commit hooks |
| **Prisma Studio** | DB inspection during development |
| **Postman / Bruno** | API testing |

---

## Folder Structure (Monorepo — single Next.js app)

```
momentum-living/
├── app/
│   ├── (public)/          # Home, search, listing detail, about, contact
│   ├── (auth)/            # Customer & vendor login / signup / OTP
│   ├── (vendor)/          # Vendor dashboard, listing management
│   └── (admin)/           # Admin panel — verifications, approvals, reports
├── components/
├── lib/                   # Prisma client, auth config, OTP logic, email
├── prisma/
│   └── schema.prisma
├── public/
└── .env.local
```

---

## Key Data Models

```
User (customer | vendor | admin)
  ↳ VendorProfile (landlord | company | agent | broker)
      ↳ Listing (property | plot | room)
          ↳ Enquiry → CallStatus (Pending | OwnerConfirmed | CustomerContacted | Closed)
```
