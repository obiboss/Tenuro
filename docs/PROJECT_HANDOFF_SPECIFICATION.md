# PROJECT HANDOFF SPECIFICATION

> **Purpose:** Zero-context continuity handoff for AI/human engineers continuing BOPA (Tenuro) development.  
> **Audit date:** 2026-05-21  
> **Repository:** `c:\Users\HP\Documents\tenuro`  
> **Rule:** Document only verifiable evidence; mark unknowns explicitly.

---

## 1. Project Overview

### Project name
- **Repository/package name:** `tenuro` (`package.json`)
- **Product brand (user-facing):** **BOPA** — Boldverse Property App
- **Legal/company references:** Boldverse Services (`src/app/page.tsx` footer)
- **Production domain (metadata):** `https://boldverseproperty.com` (`src/app/layout.tsx`)

### Core purpose
**VERIFIED IMPLEMENTATION:** BOPA is a Nigerian property-management SaaS for landlords, with supporting roles for tenants, agents, caretakers (schema only), and platform admins. It manages properties/units, tenant onboarding/KYC, tenancy lifecycle, digital agreements, rent ledger, manual and Paystack gateway payments, receipts (PDF + WhatsApp copy), renewals, quit notices, and SEO public tools (free receipt/agreement generators).

### Product/domain context
- **Geography:** Nigeria — NGN currency, Nigerian phone validation (`+234…` in `common.schema.ts`), Paystack Nigeria banks, `Africa/Lagos` timezone in payment messaging.
- **Tenancy norms:** Annual rent is the **default** payment frequency (`createTenancySchema` default `"annual"`). Other frequencies: monthly, quarterly, biannual (`src/lib/tenancy-period.ts`, `payment_frequency` enum in DB).
- **Communication:** WhatsApp-first copy patterns (`buildWaMeUrl`, WhatsApp buttons, message templates in services).

### Primary user types
| Role | Auth guard | Primary routes |
|------|------------|----------------|
| **Landlord** | `requireLandlord()` | `(landlord)` group → `/overview`, `/properties`, `/tenants`, etc. |
| **Tenant** | `requireTenant()` | `/tenant` |
| **Agent** | `requireAgent()` | `/agent/*` |
| **Platform admin** | `requirePlatformAdminPage()` | `/admin/*` |
| **Caretaker** | `requireCaretaker()` exists; **no implemented UI** beyond placeholder | NOT VERIFIED as active product surface |
| **Anonymous/public** | Token/reference auth | `/t/*`, `/a/*`, generators, claim flows |

### Product philosophy
- **VERIFIED:** "Proper records" for Nigerian landlords — receipts, agreements, payment history, audit trail.
- **VERIFIED:** Lead-gen public tools (watermarked PDFs) funnel to BOPA signup/claim.
- **VERIFIED:** Payout verification gates block online payments until Paystack subaccount verified.

### UX philosophy
- Server-rendered dashboards with client forms via `useActionState`.
- Dual feedback: inline `role="alert"` + `ActionResultToast`.
- Mobile nav on landlord/tenant shells; desktop sidebar on landlord.
- Plain-language status labels via `src/lib/status-copy.ts` and `tenant-pipeline-status.ts`.

### Business workflow philosophy
End-to-end tenant lifecycle is **pipeline-driven** on landlord tenant detail page (`src/app/(landlord)/tenants/[tenantId]/page.tsx`):
1. Invite → onboarding (KYC) → landlord review/approve
2. Tenancy setup (rent terms) → landlord charges → agreement draft → finalize → tenant acceptance
3. Agreement goes live → initial ledger posted → first rent Paystack link → tenant activation after paid first rent

### VERIFIED vs inferred assumptions

| Statement | Label |
|-----------|-------|
| BOPA = Boldverse Property App | **VERIFIED** (`layout.tsx`, `page.tsx`) |
| Repo name "tenuro" is internal | **VERIFIED** (`package.json`) |
| Production runs on Vercel | **STRONG INFERENCE** (`vercel.json`, `VERCEL_*` env fallbacks in public-tool services) |
| Supabase is production DB | **VERIFIED** (migrations, clients) |
| Caretaker role is production-ready | **NOT VERIFIED** — placeholder page only |
| Email via Resend | **NOT VERIFIED** — `resend` in `package.json` but **no imports in `src/`** |
| Security headers from `proxy.ts` active | **NOT VERIFIED** — file exists, **no `middleware.ts`**, no other wiring found |
| CI/CD pipeline | **NOT VERIFIED** — no `.github/` workflows |
| Automated tests | **NOT VERIFIED** — no test files found |

---

## 2. Tech Stack

| Technology | Version (package.json) | Role | Key locations |
|------------|------------------------|------|---------------|
| **Next.js** | 16.2.4 | App Router, RSC, route handlers | `src/app/` |
| **React** | 19.2.4 | UI | `src/components/` |
| **TypeScript** | ^5 | Strict mode (`tsconfig.json`) | All `src/` |
| **Tailwind CSS** | ^4 | Styling | `tailwind.config.ts`, `globals.css` |
| **Supabase** | `@supabase/ssr` 0.10.2, `@supabase/supabase-js` 2.104.1 | Auth + Postgres + Storage | `src/server/supabase/` |
| **Zod** | ^4.3.6 | Validation at action boundary | `src/server/validators/` |
| **date-fns** | ^4.1.0 | Date math | `src/lib/tenancy-period.ts`, services |
| **Paystack REST** | — (fetch) | Payments, subaccounts, splits | `src/server/services/paystack.service.ts` |
| **@react-pdf/renderer** | ^4.5.1 | Receipt/agreement/quit-notice PDFs | `*.service.tsx` in services |
| **Twilio** | — (fetch) | OTP WhatsApp/SMS | `src/server/services/otp-dispatch.service.ts` |
| **lucide-react** | ^1.11.0 | Icons | Components, navigation |
| **clsx + tailwind-merge** | — | Class merging | `src/lib/cn.ts` |
| **Inngest** | ^4.2.4 | Background jobs (**scaffold only**) | `src/server/jobs/inngest.client.ts`, `src/app/api/inngest/route.ts` |
| **Resend** | ^6.12.2 | **Dependency present, unused in src** | NOT VERIFIED usage |
| **ESLint** | ^9 + eslint-config-next | Lint | `eslint.config.mjs` |
| **Prettier** | ^3.8.3 | Formatting | devDependency only |

### Architectural roles
- **No ORM** — Supabase client + hand-written repositories + Postgres RPCs.
- **No Redux/global client store** — React hooks + server actions.
- **No generated Supabase types** — Row types defined manually in repositories.
- **Auth:** Supabase Auth (phone/email/password) + `profiles` table for role.
- **Payments:** Paystack with subaccount + flat split + `transaction_charge` for platform fee.
- **PDF:** React-PDF server-side render → Supabase Storage upload.
- **Cron:** Vercel cron → `/api/cron/*` with `CRON_SECRET`.
- **Testing:** None found.

---

## 3. Repository & Architecture Overview

### Architectural style
**Layered monolith** inside a single Next.js app:

```
UI (RSC pages + client components)
  → Server Actions (src/actions/*.actions.ts) — Zod parse, ActionResult
    → Services (src/server/services/*.service.ts) — auth, rules, orchestration
      → Repositories (src/server/repositories/*.repository.ts) — Supabase I/O
        → Postgres (RLS + RPC functions)
```

### Layering strategy
| Layer | Responsibility | Must not |
|-------|----------------|----------|
| **Actions** | FormData → Zod → service call → `revalidatePath`/`redirect` | Contain business rules |
| **Services** | Auth guards, domain rules, cross-service orchestration, external APIs | Direct SQL (use repos/RPC) |
| **Repositories** | Queries, inserts, RPC calls; accept `SupabaseClient` first arg | Auth decisions |
| **Validators** | Zod schemas + inferred types | Side effects |
| **lib/** | Pure client-safe helpers (dates, status copy, nav config) | DB access |

All service files use `import "server-only"` to block client bundling.

### Route organization
Next.js App Router with **route groups** (parentheses do not appear in URL):

| Group | URL prefix | Layout guard |
|-------|------------|--------------|
| `(auth)` | `/login`, `/register`, `/agent/login`, `/agent/register` | Public |
| `(landlord)` | `/overview`, `/properties`, … | `requireLandlord()` |
| `(tenant)` | `/tenant` | `requireTenant()` |
| `(agent)` | `/agent/*` | `requireAgent()` |
| `(platform-admin)` | `/admin/*` | `requirePlatformAdminPage()` |

Token/public routes live **outside** groups: `/t/*`, `/a/*`, generators, legal pages.

### Client/server separation
- **Pages:** Mostly Server Components fetching via services.
- **Forms:** Client Components with `useActionState(action, initialState)`.
- **Mutations:** Server Actions only (no client-side Supabase mutations — browser client exists but **unused** in `src/`).
- **Public token flows:** Admin Supabase client in services (bypass RLS).

### Data flow patterns
1. **Read:** Page → service → `createSupabaseServerClient()` → repository → RLS-scoped data.
2. **Write (authenticated):** Form → action → service → server client or admin client → repository/RPC.
3. **Write (system/webhook/cron):** Route handler → service → `createSupabaseAdminClient()`.
4. **Financial writes:** Prefer Postgres RPCs (`record_rent_payment`, `post_initial_tenancy_ledger_entries`, `post_due_rent_charges`, etc.).

### Rendering strategy
- Default Server Components.
- `"use client"` on forms, shells, toasts, modals.
- PDF generation in server `.tsx` services using React-PDF.

### Dependency direction
`components → actions → services → repositories → supabase`  
`components → lib` (pure)  
`services → lib` (some, e.g. payment gate UI mapping)  
**Forbidden direction:** repositories → services, actions → components.

### Shared infrastructure
- **Auth:** `src/server/services/auth.service.ts`
- **Errors:** `AppError`, `errorResult`, `successResult` (`src/server/errors/`)
- **Audit:** `writeAuditLog` / `writeSystemAuditLog` → `audit_logs` table via admin client
- **Permissions:** `src/server/constants/permissions.ts` (role → permission map)
- **Routes/base URL:** `src/server/constants/routes.ts` → `getAppBaseUrl()`

### Auth/session flow
1. Supabase session in cookies via `@supabase/ssr` (`src/server/supabase/server.ts`).
2. `requireUser()` loads `profiles` row; inactive → sign out + `AppError`.
3. Wrong role → `AppError` (403) or `redirect('/login')` or `notFound()` (platform admin).
4. Post-login redirect in `src/app/auth/callback/route.ts`: admin→`/admin`, tenant→`/tenant`, agent→`/agent/overview`, default→`/overview`.

### Edge/security
- **`src/proxy.ts`:** Security headers only — **NOT VERIFIED as active** (no `middleware.ts`).
- Auth is **layout/service-layer only**, not middleware.

---

## 4. Full Repository Structure

```
tenuro/
├── .cursor/                    # Cursor rules & project skills
├── .env.local                  # Local secrets (gitignored)
├── AGENTS.md / CLAUDE.md       # Next.js 16 agent rules pointer
├── docs/                       # Reference documentation (this file)
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── public/
├── supabase/migrations/        # 12 SQL migrations
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── src/
    ├── actions/                # Server action modules + *.state.ts
    ├── app/                    # Routes, layouts, API handlers
    ├── components/             # Domain UI + ui/ primitives
    ├── lib/                    # Pure utilities
    ├── proxy.ts                # Security headers (wiring NOT VERIFIED)
    └── server/
        ├── constants/
        ├── errors/
        ├── jobs/
        ├── repositories/
        ├── services/
        ├── supabase/
        ├── types/
        ├── utils/
        └── validators/
```

### Critical entry points
| Entry | File | Purpose |
|-------|------|---------|
| Marketing home | `src/app/page.tsx` | Landing + public tool CTAs |
| Landlord dashboard | `src/app/(landlord)/overview/page.tsx` | Stats |
| Tenant hub | `src/app/(tenant)/tenant/page.tsx` | Rent, agreement, payments |
| Tenant lifecycle | `src/app/(landlord)/tenants/[tenantId]/page.tsx` | Central orchestration UI |
| Paystack webhook | `src/app/api/webhooks/paystack/route.ts` | Payment posting |
| Rent charge cron | `src/app/api/cron/rent-charges/route.ts` | Daily 02:00 UTC |
| Renewal cron | `src/app/api/cron/renewal-reminders/route.ts` | Daily 06:00 UTC |
| Auth callback | `src/app/auth/callback/route.ts` | Session exchange |

---

## 5. Verified Feature Inventory

### Fully implemented
- Properties & units
- Tenant onboarding (invite → KYC → review)
- Tenancy setup & agreement flow
- Landlord tenancy charges
- Agreement templates
- Manual payments
- Paystack gateway payments
- Receipts (PDF + WhatsApp)
- Tenant activation
- Renewals overview + manual renew + cron reminders prep
- Automatic rent charges (cron)
- Quit notices
- Property rules / KYC engine
- Agent flows (profile, listings, onboarding links, processing fee)
- Platform admin (dashboard, payments ops, payout verification)
- Public receipt/agreement generators + claim/import
- Auth (landlord/agent phone+email)
- Audit / activity feed
- Legal pages

### Partially implemented
- Renewal reminder delivery (prepares; full dispatch NOT fully traced)
- Agent commission tracking UI (gateway splits work; dashboard placeholder)
- OTP login (depends on Twilio env)
- App fee payments (separate flow)
- Subscriptions (DB tables exist; no app services found)

### Scaffolded / placeholder
- `/api/cron/overdue-alerts`, `/api/cron/rent-due-notifications`
- `/api/webhooks/whatsapp`, `/api/files/signed-download`, `/api/onboarding/tenant/resolve`
- `/api/inngest`
- `/caretakers`, `/reports`, `/agent/commissions`
- `src/server/supabase/browser.ts` (unused)
- `resend` package (unused)

### Deprecated / legacy (retained)
- `landlord_tenancy_charges.label`, `charge_type` (synced with `charge_name`)
- `tenancies.status` text (enum `tenancy_status` authoritative)
- `/onboarding/[token]` → redirects to `/t/onboarding/[token]`
- `audit_log` vs `audit_logs` (app uses plural)
- `tenant_ledger` vs `ledger_entries` (app uses latter)

---

## 6. Business Logic & Domain Rules

### Tenancy period calculation
**Source:** `src/lib/tenancy-period.ts`, `createTenancySchema`

- End date = start + period − 1 day (annual/biannual/quarterly/monthly)
- Next rent charge date = day after end date
- Renewal notice date = end date − reminderIntervalDays (30/60/90)

### Tenancy phases (critical)
| Phase | Condition |
|-------|-----------|
| **Agreement setup** | `agreement_live_at IS NULL` AND `tenancy_status = 'active'` |
| **Operationally live** | `agreement_live_at IS NOT NULL` AND `tenancy_status = 'active'` |

Do **not** reintroduce draft enum workflow — use `agreement_live_at`.

### Agreement setup substeps (tenant detail page)
1. `agreement-setup` — approved tenant, no setup tenancy
2. `charges` — setup tenancy, charges not confirmed
3. `agreement-draft` — charges confirmed
4. `agreement` — document exists

### Payment total formula (VERIFIED)
```
total = rent + landlordCharges + agentCommission + tenuroFee (BOPA fee)
```
Env: `TENURO_GATEWAY_ADMIN_FEE_NAIRA`. Link expiry: 24 hours.

### Paystack split model
- Flat split to landlord subaccount (+ agent for deals)
- Platform fee via `transaction_charge`, `bearer: "subaccount"`
- References: `tenuro_` + UUID

### Onboarding
- 7-day token, SHA-256 hash stored
- Agent tenants: processing fee before KYC
- Property rules may auto-decline (`property-rule-kyc.service.ts`)

### Idempotency
- Unique paystack references, receipt numbers, ledger payment credits (migrations 20260522–23)
- Gateway webhook replay protection via `gateway-payment-idempotency.service.ts`

### Audit
- App writes to **`audit_logs`** (not `audit_log`)
- Event types: `AUDIT_EVENT_TYPES` in `audit-events.ts`

---

## 7. Database & Data Model Specification

### Migrations (apply in order)
1. `20260519000000_baseline_schema.sql`
2. `20260520000000_add_paystack_verification_status.sql`
3. `20260521000000_add_platform_admin_role.sql`
4. `20260521000001_platform_admin_foundation.sql`
5. `20260521000002_paystack_verification_queue_indexes.sql`
6. `20260522000000_payment_operations_integrity.sql`
7. `20260523000000_receipt_ledger_integrity.sql`
8. `20260524000000_agreement_templates.sql`
9. `20260525000000_tenancy_agreement_flow_completion.sql`
10. `20260525000001_landlord_charge_name_lookup_index.sql`
11. `20260525000002_tenancy_agreement_live_at.sql`
12. `20260525000003_landlord_charge_legacy_columns.sql`

### Schema drift risk (CRITICAL)
Later migrations reference columns **not in baseline file**:
- `paystack_reference` vs `reference`
- `gateway_payment_intent_id`, `recipient_type` on allocations
- `receipt_path` on rent_payments
- `tenant_accepted_at` vs `accepted_at`
- `end_date`, `renewal_notice_date` on tenancies

Fresh DB from baseline-only may fail at `20260522000000`. App code expects evolved names.

### RLS
- Enabled on all public tables
- Landlord owns `landlord_id = auth.uid()`
- Platform admin via `is_platform_admin()`
- Service role bypasses for webhooks/cron/audit

---

## 8. API / Service Layer Architecture

### Patterns
- Actions: Zod → service → `errorResult` / `successResult`
- Services: `requireLandlord()` etc. → rules → repos/RPC → audit
- Repositories: throw Supabase errors
- Financial atomicity: Postgres RPCs, not app transactions

### External integrations
| Provider | Service | Env |
|----------|---------|-----|
| Paystack | `paystack.service.ts` | `PAYSTACK_SECRET_KEY` |
| Twilio | `otp-dispatch.service.ts` | `TWILIO_*` |
| Supabase | `supabase/server.ts`, `admin.ts` | `NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 9. Frontend Architecture & UI System

- Domain folders under `src/components/`
- `ToastProvider` per shell/page (not root layout)
- Forms: `useActionState` + `ActionResultToast` + inline alerts
- Primitives: `components/ui/` (custom, not shadcn/Radix)
- No optimistic updates
- No shared data-table abstraction

---

## 10. Styling & Design System

- Font: Plus Jakarta Sans
- Primary: #1B4FD8, Gold accent: #F6B73C, Background: #F8F7F4
- `rounded-card` (1rem), `rounded-button` (0.75rem)
- Button variants: primary | secondary | danger | ghost
- Compose with `cn()` from `lib/cn.ts`
- User-facing brand: **BOPA**; code often uses `tenuro` prefix

---

## 11. Reusable Engineering Patterns

| Concern | Location |
|---------|----------|
| Status labels | `status-copy.ts`, `tenant-pipeline-status.ts` |
| Payment gate UI | `landlord-payment-gate.ts` |
| Currency | `money.ts`, `CurrencyInput` |
| Dates | `tenancy-period.ts`, `reminder-interval.ts` |
| Balance | `tenancy-balance.ts`, `tenancy-financial-integrity.service.ts` |
| Toasts | `ActionResultToast`, `ToastProvider` |
| Audit | `writeAuditLog`, `AUDIT_EVENT_TYPES` |

---

## 12. Naming Conventions

- Files: kebab-case; components export PascalCase
- Services: `{domain}.service.ts`
- Repositories: `{domain}.repository.ts`
- Actions: `{verb}{Entity}Action`, state: `initial{Entity}ActionState`
- DB: snake_case; errors: `SCREAMING_SNAKE` AppError codes
- Imports: `@/` alias

---

## 13. Environment, Infrastructure & Deployment

### Environment variables (verified in code)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client |
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `PAYSTACK_SECRET_KEY` | Paystack |
| `TENURO_GATEWAY_ADMIN_FEE_NAIRA` | Platform fee |
| `CRON_SECRET` | Cron auth |
| `TENURO_SESSION_SECRET` | Session tokens |
| `TENURO_FIELD_ENCRYPTION_KEY_BASE64` | Field encryption |
| `TWILIO_*` | OTP delivery |

### Deployment
- **STRONG INFERENCE:** Vercel (`vercel.json` crons)
- **NOT VERIFIED:** CI/CD, staging environment

---

## 14. Known Issues & Fragile Areas

| Issue | Risk |
|-------|------|
| Schema drift baseline vs migrations | HIGH |
| `proxy.ts` not wired | MEDIUM |
| Tenant detail page coupling | HIGH |
| Gateway webhook idempotency path | HIGH |
| `agreement_live_at` semantics | HIGH |
| No automated tests | HIGH |
| Unused deps (resend, inngest scaffold) | LOW |
| Nav inconsistency shell vs `navigation.ts` | LOW |

---

## 15. Pending Roadmap (recommended order)

1. Fix migration chain for fresh installs
2. Complete scaffolded crons / wire proxy
3. Agent commissions UI
4. Caretakers, reports, signed download API
5. Inngest / Resend — implement or remove

**Dangerous areas:** agreement flow, gateway payments, ledger RPCs, Paystack split math, migrations.

---

## 16. Continuation Rules For Future AI

### MUST preserve
- actions → services → repositories layering
- `agreement_live_at` setup/live model
- Annual rent default; `tenancy-period.ts` math
- Payment total formula and Paystack split pattern
- Postgres RPCs for ledger/payments
- Admin client for token/webhook/audit/storage writes
- `errorResult` / `AppError` handling
- BOPA branding; existing UI primitives

### Prohibited
- Redux, tRPC, parallel API layers, client-side business mutations
- Duplicating balance/receipt logic outside integrity services
- Renaming DB columns without migration + repo audit
- Bypassing payout verification gates
- Assuming unscaffolded features work

### Before implementing, verify
- [ ] Route/page exists
- [ ] Service + repository/RPC exists
- [ ] Validator schema exists
- [ ] Env var used in code
- [ ] DB column in migrations (not baseline alone)

---

*End of handoff specification.*
