# Momentum Living — LabourCamps.com

Corporate website and private availability-matching platform for **Momentum Living**, a UAE real-estate company specialising in labour accommodation / labour camps. Public web identity: **LabourCamps.com**.

The site has two strictly separated experiences:

1. **Corporate website:** who Momentum Living is, the Managing Director, the agents, the company's approach, and how to contact it. It shows **no inventory**.
2. **Availability journey:** reached only through the **AVAILABILITY** button:
   ```
   User type → Details → Mobile OTP → Requirements → Matched opportunities → Request info / viewing / chat with agent
   ```
   Every completed journey creates a **lead** that the admin works with the agents.

The admin dashboard manages leads, properties/opportunities, agents and all corporate content.

---

## Docs

| File | Description |
|------|-------------|
| [`docs/implementation-status.md`](./docs/implementation-status.md) | **What's built vs pending**: gap analysis against the client spec |
| [`docs/requirements.md`](./docs/requirements.md) | Product requirements (from the client build spec) |
| [`docs/architecture.md`](./docs/architecture.md) | Components and request flows |
| [`docs/data-model.md`](./docs/data-model.md) | D1 schema, R2, KV |
| [`docs/api-spec.md`](./docs/api-spec.md) | REST API contract |
| [`docs/security.md`](./docs/security.md) | Auth, access control, privacy |
| [`docs/agent-spec.md`](./docs/agent-spec.md) | Async tasks (OTP, lead notifications, export) |
| [`docs/techstack.md`](./docs/techstack.md) | Technology decisions |
| [`docs/job-sources.md`](./docs/job-sources.md) | Future feed-ingestion adapter contract |
| [`docs/roadmap.md`](./docs/roadmap.md) | Milestones |
| [`quotation-LNG-2026-WD-003.md`](./quotation-LNG-2026-WD-003.md) | Original quotation. Its marketplace scope was superseded by the client build spec |

---

## Roles

| Role | Capabilities |
|------|-------------|
| **Visitor** | Reads corporate pages, contacts or chats with an agent |
| **Enquirer** (JWT role `customer`) | Completes the availability journey, sees own matched opportunities, requests info or a viewing |
| **Admin** | Leads, properties/opportunities, agents, corporate content, export, reports |

## Stack

React + Vite (Cloudflare Pages) · Hono (Cloudflare Workers) · D1 · KV · R2 · MSG91 (SMS OTP) · Resend (email) · pnpm monorepo.

```
apps/web        React SPA
apps/api        Hono Worker (REST API)
apps/ingestion  Cron Worker (stub; v2 feeds)
packages/shared Shared types
```

## Development

```bash
pnpm install
pnpm dev:api     # Wrangler dev (needs apps/api/.dev.vars — see .dev.vars.example)
pnpm dev:web     # Vite dev server
pnpm lint && pnpm typecheck
```
