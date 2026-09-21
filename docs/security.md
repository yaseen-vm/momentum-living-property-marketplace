# Security

> Target security model for the client build spec. Items not yet implemented are listed under *Known gaps* and tracked in [`implementation-status.md`](./implementation-status.md).

## Threat Model Summary

| Actor | Threat | Mitigation |
|-------|--------|-----------|
| Anonymous visitor | See inventory without qualifying | No public listing endpoint; results/details gated server-side on completed, owned enquiry + `lead_matches` membership |
| Anonymous visitor | Scrape inventory by guessing IDs | Opportunity detail requires `enquiry_id` that the caller owns and that matched the listing; UUIDs not enumerable |
| Enquirer | Read another enquirer's lead/matches | Every `/availability/*` query scoped by `user_id = jwt.sub` |
| Enquirer | Skip steps (call matches before requirements) | `403 NOT_QUALIFIED` unless `stage = completed` |
| Enquirer | Learn owner identity | `owner_name`, `owner_contact`, `internal_notes`, exact coordinates only selected in admin handlers |
| Admin impersonation | Elevate role | Role from JWT signed with `JWT_SECRET`; admin role only set directly in D1 |
| OTP brute-force / SMS pumping | Bypass verification, run up SMS bill | 5-attempt limit, 15-min lock, 3 sends / 10 min per mobile via KV; Cloudflare WAF per-IP rate limit on `/auth/otp/send`; Turnstile optional (v1.1) |
| Fake OTP | Verification bypass in production | Fixed dev code only when `ENVIRONMENT=development`; otherwise missing MSG91 config → `503` |
| Form spam | Junk leads | Enquiry creation requires verified mobile; 5 enquiries / user / hour; 10 requests / user / hour |
| Direct file access | Read private photos/docs by key | Private R2; `GET /upload/files/:key` requires HMAC signature + expiry except `public-media/` |
| Malicious upload | Store malware | MIME allow-list + size limits; files never executed or parsed |
| CSRF | Forge requests | `Authorization: Bearer` header, no cookies — no CSRF surface |
| XSS | Script via content (CMS, listing text, enquiry text) | React escapes output; CMS markdown rendered with a sanitising renderer (no raw HTML); no `dangerouslySetInnerHTML` on untrusted input; CSP |
| Prompt injection (v2) | Listing/enquiry text hijacks an LLM | External content only in user-turn XML tags; system prompt marks it untrusted |

---

## Authentication

### JWT (HS256)
- Signed with `JWT_SECRET` (Workers Secret)
- Payload: `{ sub: userId, role, mobile_verified: bool, exp }`
- Expiry: 24 h (enquirer), 8 h (admin)
- Stateless; short expiry is the revocation mechanism in v1

### OTP (as implemented in `apps/api/src/lib/otp.ts`)
```
Generation:     crypto.getRandomValues → 6-digit (100000–999999)
Storage:        HMAC-SHA256(otp, JWT_SECRET) hex in D1 otp_tokens; plain OTP never persisted
Compare:        constant-time
Expiry:         5 minutes
Attempts:       5 wrong guesses → 423 LOCKED, KV otp:lock:{mobile} TTL 900 s
Send cap:       KV otp:rate:{mobile} TTL 600 s, max 3
Never:          returned in API responses or shown in the frontend
Dev fallback:   fixed code ONLY when ENVIRONMENT = "development"
```

### Admin access
Admin users log in with the same OTP flow; `users.role = 'admin'` is set manually in D1. Admin routes live under `/admin` in the SPA and `/admin/*` in the API; every handler re-checks the role.

### Role enforcement
```
/availability/*   role = customer AND mobile_verified = true; ownership checks per enquiry
/admin/*          role = admin
/content, /agents public, read-only
```

---

## Authorisation Rules

| Resource | Rule |
|----------|------|
| `site_content` read | Public |
| `site_content` write | Admin |
| `agents` read (active) | Public (only public fields) |
| `agents` write | Admin |
| `enquiries` create | Verified enquirer; `mobile` from JWT user; consent required |
| `enquiries` read/update | Enquirer: own only, requirements immutable after completion. Admin: all |
| `lead_matches` / matched listings | Enquirer: own completed enquiries only. Admin: all |
| `lead_requests` create | Enquirer; listing must be in the enquiry's matches |
| `listings` read (full, incl. confidential) | Admin only |
| `listings` write | Admin only |
| `lead_notes` | Admin only |
| CSV export | Admin; range ≤ 366 days; 5 / hour |

---

## File Security

- Upload through the API Worker (`POST /upload/file`) after JWT check; MIME allow-list (JPEG/PNG/WebP images ≤ 10 MB; PDF allowed for documents ≤ 5 MB).
- Private R2 bucket. Delivery through `GET /upload/files/:key`:
  - `public-media/*` → public (agent photos, MD portrait, corporate imagery)
  - `listing-photos/*`, `enquiry-docs/*`, legacy `vendor-docs/*` → signed URL: `?exp=<unix ms>&sig=HMAC-SHA256(key + exp, JWT_SECRET)`, 1-hour TTL, minted only in responses the caller is authorised to receive.
- R2 keys are the only file references stored in D1; files are never executed.

---

## API Security

### Rate limiting
| Endpoint | Limit | Storage |
|----------|-------|---------|
| `POST /auth/otp/send` | 3 / mobile / 10 min + WAF per-IP | KV + WAF |
| `POST /auth/otp/verify` | 5 attempts / token | D1 |
| `POST /availability/enquiries` | 5 / user / hour | KV |
| `POST /availability/enquiries/:id/requests` | 10 / user / hour | KV |
| `GET /admin/export` | 5 / admin / hour | KV |
| Everything else | 100 req/min per IP | Cloudflare WAF (free tier) |

### Input validation
Zod schemas at every handler boundary (per-user-type schemas for enquiry details and requirements). Unknown fields stripped. Parameterised D1 statements only.

### Security headers (Hono middleware + Pages `_headers`)
```
Content-Security-Policy:   default-src 'self'; img-src 'self' data: <api origin>; connect-src 'self' <api origin>; frame-ancestors 'none'
X-Frame-Options:           DENY
X-Content-Type-Options:    nosniff
Referrer-Policy:           strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
(Relax CSP for the chosen web-chat provider when it is connected.)

### CORS
Allow-list of the production web origins (`labourcamps.com`, Pages domain); any origin only when `ENVIRONMENT=development`.

---

## Privacy

- **Data collected:** name, mobile (verified), email, company, position, optional nationality, business type, ownership status, accommodation requirements. No ID numbers, no payment data.
- **Consent:** required checkbox on the details step: *"I agree to Momentum Living contacting me about my enquiry by phone, WhatsApp or email, and I have read the Privacy Policy."* Stored as `enquiries.consent_at`.
- **Privacy Policy** and **Terms & Conditions** pages (admin-editable, placeholder text until the client supplies approved wording).
- Customer data visible only to admins; never on public pages; owner data never shown to enquirers.
- Deletion: on request, admin deletes the user and their enquiries (cascade to matches/requests/notes) and associated `enquiry-docs/*`.
- **No compliance claims** (e.g. UAE PDPL) are made on the site unless configured and verified.
- HTTPS enforced by Cloudflare.

---

## Secrets Management

| Secret | Storage |
|--------|---------|
| `JWT_SECRET` | Workers Secret |
| `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` | Workers Secret |
| `RESEND_API_KEY`, `ADMIN_EMAIL` | Workers Secret |
| `AWS_*` (v2) | Workers Secret |

`ENVIRONMENT` is a plain `wrangler.toml` var (`development` locally / `production`). Local secrets in `apps/api/.dev.vars` (gitignored).

---

## Known gaps in current code (must fix before launch)

1. `GET /listings` and `GET /listings/:id` are **unauthenticated** — full inventory is public. Remove (legacy).
2. `GET /upload/files/:key` is **unauthenticated for all keys**, including vendor documents. Add signed-URL check.
3. OTP fallback (`123456`) activates whenever `MSG91_AUTH_KEY` is a placeholder, regardless of environment. Gate on `ENVIRONMENT`.
4. No Zod validation on request bodies (manual checks only).
5. Security headers middleware not installed.
6. `pnpm audit` not in CI; CI runs typecheck only (no lint).

---

## Dependency Security

- `pnpm audit` in CI on every PR (to add); high/critical findings block merge.
- No `eval`, no raw SQL string construction with user input.
- Worker bindings declared explicitly in `wrangler.toml`.

## AWS / Bedrock (v2)

Unchanged from the original design: least-privilege IAM (`bedrock:InvokeModel` on `anthropic.claude-*`), credentials as Workers Secrets, `aws4fetch` SigV4, only non-PII opportunity text sent, content in `<listing>` XML tags in the user turn.
