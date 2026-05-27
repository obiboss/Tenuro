# PROJECT HANDOFF SPECIFICATION

> **Version:** 2.0  
> **Audit date:** 2026-05-27  
> **Repository:** `c:\Users\HP\Documents\tenuro`  
> **Supersedes:** v1 handoff (2026-05-21)  
> **Rule:** Document only verifiable evidence from the codebase; mark unknowns explicitly.

---

## 1. Project Overview

### Project name
- **Repository/package name:** `tenuro` (`package.json`)
- **Product brand (user-facing):** **BOPA** — Boldverse Property App
- **Legal/company references:** Boldverse Services (`src/app/page.tsx` footer)
- **Production domain (metadata):** `https://boldverseproperty.com` (`src/app/layout.tsx`)

### Core purpose
BOPA is a Nigerian property-management SaaS for landlords, with supporting roles for tenants, agents, caretakers (schema only), and platform admins. It manages properties/units, tenant onboarding/KYC, tenancy lifecycle, digital agreements, rent ledger, manual and Paystack gateway payments, receipts (PDF + WhatsApp copy), renewals, quit notices, landlord subscription/trial gating, agent property verification pipelines, tenant verification processing fees (agent- or landlord-sourced), and SEO public tools (free receipt/agreement generators).

### Target users
| Role | Auth guard | Primary routes |
|------|------------|----------------|
| **Landlord** | `requireLandlord()` / `requireLandlordPlatformOperator()` | `/overview`, `/properties`, `/tenants`, `/settings`, etc. |
| **Tenant** | `requireTenant()` | `/tenant` |
| **Agent** | Agent layout session check | `/agent/overview`, `/agent/listings`, `/agent/onboarding` |
| **Platform admin** | `requirePlatformAdminPage()` | `/admin/*` |
| **Property manager (email)** | Same backend as landlord (`role: "landlord"`) | `/manager/login`, `/manager/register` |
| **Caretaker** | `requireCaretaker()` exists; **no implemented UI** | NOT VERIFIED as active product surface |
| **Anonymous/public** | Token/reference auth | `/t/*`, `/a/*`, generators, claim flows |

### Business/domain context
- **Geography:** Nigeria — NGN currency, Nigerian phone validation (`+234…` in `common.schema.ts`), Paystack Nigeria banks, `Africa/Lagos` timezone in payment messaging.
- **Tenancy norms:** Annual rent is the **default** payment frequency (`createTenancySchema` default `"annual"`). Other frequencies: monthly, quarterly, biannual (`src/lib/tenancy-period.ts`, `payment_frequency` enum in DB).
- **Communication:** WhatsApp-first copy patterns (`buildWaMeUrl` in `src/lib/whatsapp.ts` and `src/server/utils/whatsapp.ts`, WhatsApp buttons, message templates in services).
- **Monetization:** BOPA Basic/Pro annual subscriptions (DB + gating implemented; Paystack checkout **not yet implemented**), platform processing fees on tenant KYC verification (agent or landlord sourced), optional BOPA admin fee on rent gateway payments (`TENURO_GATEWAY_ADMIN_FEE_NAIRA`).

### Product philosophy / design philosophy / UX principles
- **"Proper records"** for Nigerian landlords — receipts, agreements, payment history, audit trail.
- **Lead-gen public tools** (watermarked PDFs) funnel to BOPA signup/claim with auto trial start.
- **Payout verification gates** block online payments until Paystack subaccount verified.
- **Subscription/trial gating** blocks core landlord workspace features when trial expires and no paid plan.
- **Server-rendered dashboards** with client forms via `useActionState`.
- **Dual feedback:** inline `role="alert"` + `ActionResultToast`.
- **Mobile nav** on landlord/tenant/agent shells; desktop sidebar on landlord/admin.
- **Plain-language status labels** via `src/lib/status-copy.ts` and `tenant-pipeline-status.ts`.
- **Pipeline-driven tenant lifecycle** on landlord tenant detail page (`src/app/(landlord)/tenants/[tenantId]/page.tsx`).

### Business workflow philosophy (tenant lifecycle)
1. Invite → onboarding (KYC) → optional verification fee payment → landlord review/approve/waitlist
2. Tenancy setup (rent terms) → landlord charges → agreement draft → finalize → tenant acceptance
3. Agreement goes live (`agreement_live_at`) → initial ledger posted → first rent Paystack link → tenant activation after paid first rent

**Agent-sourced variant:** Agent listing → landlord verification/claim → converted listing → tenant onboarding link → tenant KYC → agent verification fee → landlord review.

---

## 2. Tech Stack

| Technology | Version | Role | Key locations |
|------------|---------|------|---------------|
| **Next.js** | 16.2.4 | App Router, RSC, route handlers | `src/app/` |
| **React** | 19.2.4 | UI | `src/components/` |
| **TypeScript** | ^5 | Strict mode (`tsconfig.json`) | All `src/` |
| **Tailwind CSS** | ^4 | Styling via `@theme` in `globals.css` | `tailwind.config.ts`, `globals.css` |
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

### Frontend
Next.js App Router, React Server Components by default, client components for forms/shells/toasts. No Redux, no tRPC, no generated Supabase types.

### Backend
Server Actions (`src/actions/*.actions.ts`) + Route Handlers (`src/app/api/**`). Layered: actions → services → repositories → Postgres RPCs.

### Database
Supabase Postgres with RLS. 17 migrations. No ORM — hand-written repositories + RPC functions.

### State management
React hooks + server actions only. `useActionState` for forms. No global client store. React `cache()` on some service reads (e.g. platform payment settings).

### Styling libraries
Tailwind CSS v4 with design tokens in `@theme`. Custom UI primitives in `src/components/ui/` (not shadcn/Radix).

### Deployment/infrastructure
- **STRONG INFERENCE:** Vercel (`vercel.json` crons, `VERCEL_*` env fallbacks in public-tool services)
- **NOT VERIFIED:** CI/CD pipeline — no `.github/` workflows found
- **Crons:** rent charges daily 02:00 UTC; renewal reminders daily 06:00 UTC

### Third-party integrations
| Provider | Service | Env vars |
|----------|---------|----------|
| Paystack | `paystack.service.ts` | `PAYSTACK_SECRET_KEY` |
| Twilio | `otp-dispatch.service.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`, `TWILIO_SMS_NUMBER` |
| Supabase | `supabase/server.ts`, `admin.ts` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 3. Architecture Overview

### High-level architecture pattern
**Layered monolith** inside a single Next.js app:

```
UI (RSC pages + client components)
  → Server Actions (src/actions/*.actions.ts) — Zod parse, ActionResult
    → Services (src/server/services/*.service.ts) — auth, rules, orchestration
      → Repositories (src/server/repositories/*.repository.ts) — Supabase I/O
        → Postgres (RLS + RPC functions)
```

All service files use `import "server-only"` to block client bundling.

### Data flow architecture
1. **Read:** Page → service → `createSupabaseServerClient()` → repository → RLS-scoped data.
2. **Write (authenticated):** Form → action → service → server client or admin client → repository/RPC.
3. **Write (system/webhook/cron):** Route handler → service → `createSupabaseAdminClient()`.
4. **Financial writes:** Prefer Postgres RPCs (`record_rent_payment`, `post_initial_tenancy_ledger_entries`, `post_due_rent_charges`, etc.).
5. **Token/public flows:** Admin Supabase client in services (bypass RLS).

### Component architecture philosophy
- Domain folders under `src/components/` (auth, agent, payment, tenant, property, tenancy, platform-admin, subscription, public-tools, layout, ui).
- Pages are Server Components fetching via services; forms are Client Components.
- Shell components wrap route groups: `LandlordShell`, `AgentShell`, `PlatformAdminShell`.
- `ToastProvider` per shell/page (not root layout).
- Page composition: `PageHeader` → alerts/notices → `SectionCard`/`StatCard` grid → lists/forms.

### State management architecture
- Server state: fetched in RSC pages, passed as props.
- Form state: `useActionState(serverAction, initialState)` with companion `*.state.ts` files defining initial state types.
- Client UI state: local `useState` in shells/modals only.
- No optimistic updates.

### API/service layer structure
| Layer | Responsibility | Must not |
|-------|----------------|----------|
| **Actions** | FormData → Zod → service call → `revalidatePath`/`redirect` | Contain business rules |
| **Services** | Auth guards, domain rules, cross-service orchestration, external APIs | Direct SQL (use repos/RPC) |
| **Repositories** | Queries, inserts, RPC calls; accept `SupabaseClient` first arg | Auth decisions |
| **Validators** | Zod schemas + inferred types | Side effects |
| **lib/** | Pure client-safe helpers (dates, status copy, nav config) | DB access |

**Dependency direction:** `components → actions → services → repositories → supabase`  
`components → lib` (pure)  
**Forbidden:** repositories → services, actions → components.

### Validation/error handling approach
- **Boundary validation:** Zod in actions before service calls.
- **Domain errors:** `AppError` with `code`, `userMessage`, `status` (`src/server/errors/app-error.ts`).
- **Action results:** `successResult()` / `errorResult()` (`src/server/errors/result.ts`) — maps Zod, AppError, Postgres codes to user-friendly messages.
- **UI feedback:** `ActionResultToast` + inline alerts with `role="alert"`.
- **Payout errors:** `getFriendlyPayoutVerificationErrorMessage()` maps Paystack subaccount codes to plain language.
- **Financial integrity:** `tenancy-financial-integrity.service.ts`, `rent-receipt-integrity.service.ts`, `gateway-payment-idempotency.service.ts`.

### Auth/session flow
1. Supabase session in cookies via `@supabase/ssr` (`src/server/supabase/server.ts`).
2. `requireUser()` loads `profiles` row; inactive → sign out + `AppError`.
3. Wrong role → `AppError` (403) or `redirect('/login')` or `notFound()` (platform admin).
4. Post-login redirect (`src/lib/auth-routing.ts`, `src/app/auth/callback/route.ts`): admin→`/admin`, tenant→`/tenant`, agent→`/agent/overview`, default→`/overview`.
5. **Landlord platform operator:** `requireLandlordPlatformOperator()` = `requireLandlord()` + subscription access check.

### Edge/security
- **`src/proxy.ts`:** Security headers + `x-pathname` header for subscription gating.
- **NOT VERIFIED as active:** No `middleware.ts` found; `proxy.ts` export exists but wiring into Next.js middleware is unconfirmed. Landlord layout reads `x-pathname` — if empty, layout redirect may not fire (service-layer gating still applies).

---

## 4. Project Structure

```
tenuro/
├── .cursor/
│   ├── rules/project-rules.mdc      # Production-grade workflow rules for AI
│   └── skills/                      # analyze/plan/implement/verify engineer skills
├── AGENTS.md / CLAUDE.md            # Next.js 16 agent rules pointer
├── docs/
│   └── PROJECT_HANDOFF_SPECIFICATION.md  # This document
├── eslint.config.mjs
├── next.config.ts                   # www→non-www sitemap redirect
├── package.json
├── postcss.config.mjs
├── public/                          # Static assets (SVGs)
├── supabase/migrations/             # 17 SQL migrations (ordered)
├── tailwind.config.ts               # Mirrors @theme tokens
├── tsconfig.json                    # Strict, @/ alias → src/
├── vercel.json                      # Cron schedules
└── src/
    ├── actions/                     # Server actions + *.state.ts initial states
    ├── app/                         # Routes, layouts, API handlers, globals.css
    ├── components/                  # Domain UI + ui/ primitives
    ├── lib/                         # Pure client-safe utilities
    ├── proxy.ts                     # Security headers + x-pathname (wiring unverified)
    └── server/
        ├── constants/               # Permissions, audit events, gating, routes
        ├── errors/                  # AppError, ActionResult helpers
        ├── jobs/                    # Inngest scaffold
        ├── repositories/            # Supabase I/O (39 files)
        ├── services/                # Business logic (63 files incl. 5 PDF .tsx)
        ├── supabase/                # server, admin, browser (unused) clients
        ├── types/                   # Manual TypeScript types
        ├── utils/                   # money, phone, tokens, encryption, balance
        └── validators/              # Zod schemas (22 files)
```

### `src/actions/` — Server action modules
Each domain has `{domain}.actions.ts` + optional `{domain}.state.ts`:
- `auth.actions.ts` — phone/email/OTP login, register, magic link; starts landlord trial on register
- `properties.actions.ts`, `units.actions.ts`, `tenants.actions.ts`, `tenancies.actions.ts`
- `tenancy-agreements.actions.ts`, `agreement-templates.actions.ts`
- `payments.actions.ts`, `receipts.actions.ts`, `landlord-tenancy-charges.actions.ts`
- `onboarding.actions.ts`, `tenant-activation.actions.ts`
- `agent-profile.actions.ts`, `agent-property-listings.actions.ts`, `agent-tenant-onboarding.actions.ts`
- `property-rules.actions.ts`, `quit-notices.actions.ts`
- `public-receipt-generator.actions.ts`, `public-agreement-generator.actions.ts`, `public-tool-onboarding.actions.ts`
- `landlord-onboarding.actions.ts`
- `platform-admin-payout-verification.actions.ts`, `platform-admin-payment-settings.actions.ts`
- `app-fee-payment.actions.ts`

### `src/app/` — Route groups
| Group | URL prefix | Layout guard |
|-------|------------|--------------|
| `(auth)` | `/login`, `/register`, `/agent/*`, `/manager/*` | Public |
| `(landlord)` | `/overview`, `/properties`, … | `requireLandlord()` + subscription gating |
| `(landlord)/(gated)` | Same paths (incomplete migration) | Double subscription guard |
| `(tenant)` | `/tenant` | `requireTenant()` |
| `(agent)` | `/agent/*` | Session + role check |
| `(platform-admin)` | `/admin/*` | `requirePlatformAdminPage()` |

Token/public routes outside groups: `/t/*`, `/a/*`, generators, legal, claim flows.

### Critical entry points
| Entry | File | Purpose |
|-------|------|---------|
| Marketing home | `src/app/page.tsx` | Landing + public tool CTAs |
| Landlord dashboard | `src/app/(landlord)/overview/page.tsx` | Stats + subscription notice |
| Tenant hub | `src/app/(tenant)/tenant/page.tsx` | Rent, agreement, payments |
| Tenant lifecycle | `src/app/(landlord)/tenants/[tenantId]/page.tsx` | Central orchestration UI |
| Agent home | `src/app/(agent)/agent/overview/page.tsx` | Agent dashboard |
| Admin payment settings | `src/app/(platform-admin)/admin/payment-settings/page.tsx` | Platform fee/pricing config |
| Paystack webhook | `src/app/api/webhooks/paystack/route.ts` | Payment + fee settlement |
| Rent charge cron | `src/app/api/cron/rent-charges/route.ts` | Daily 02:00 UTC |
| Renewal cron | `src/app/api/cron/renewal-reminders/route.ts` | Daily 06:00 UTC |
| Payout status API | `src/app/api/payout-verification/status/route.ts` | Poll Paystack verification |
| Auth callback | `src/app/auth/callback/route.ts` | Session exchange |

---

## 5. Implemented Features

### Properties & units
- CRUD for properties and units (`properties.service.ts`, `units.service.ts`)
- Property types, blocks, archive, setup sections
- Unit status lifecycle (vacant → occupied on first rent)

### Tenant onboarding & KYC
- 7-day token, SHA-256 hash stored (`onboarding.service.ts`)
- Extended lifecycle statuses: `invited` → `documents_submitted` → (verification fee) → `submitted_for_landlord_review` → `approved`/`rejected`/`waitlisted`
- Agent-sourced vs landlord-sourced tenant detection (`onboarding-lifecycle.ts`)
- Property rules auto-decline (`property-rule-kyc.service.ts`)
- KYC document upload (`files.service.ts`, signed upload API)
- Nigeria state/LGA picker (`src/lib/nigeria-state-lga.ts`)

### Tenant verification processing fees (NEW since v1)
- **Agent-sourced:** `agent-processing-fee.service.ts` — split to agent subaccount + platform charge
- **Landlord-sourced:** `landlord-processing-fee.service.ts` — split to landlord subaccount + platform charge
- **Router:** `tenant-verification-processing-fee.service.ts` — branches on `isAgentSourcedTenant`
- **Platform config:** `platform-payment-settings.service.ts` — singleton fee amounts/splits, enable flags
- **Webhook fallback:** `gateway-payment-webhook.service.ts` routes non-rent references to fee services
- Paystack metadata: `payment_purpose: "agent_verification_processing_fee"` or `"landlord_verification_processing_fee"`
- On payment: advances tenant to `submitted_for_landlord_review`, audit log with `payment_does_not_guarantee_approval: true`

### Tenancy setup & agreement flow
- Pipeline substeps on tenant detail: agreement-setup → charges → agreement-draft → agreement
- `agreement_live_at` model (NOT draft enum workflow)
- Agreement templates (`agreement-templates.service.ts`)
- PDF generation (`tenancy-agreement-pdf.service.tsx`)
- Tenant acceptance via token (`/t/agreement/[token]`)

### Landlord tenancy charges
- Move-in/recurring charges with `charge_name` (authoritative) + legacy `label`/`charge_type` sync trigger
- Charge confirmation gate before agreement draft

### Manual & gateway payments
- Manual rent recording (`payments.service.ts`)
- Paystack rent initialization (`gateway-payment.service.ts`)
- Split model: flat split to landlord (+ agent for deals) + platform fee via `transaction_charge`
- Payment total formula: `rent + landlordCharges + agentCommission + tenuroFee`
- References: `tenuro_` + UUID prefix
- 24-hour link expiry
- Idempotency via unique references, webhook dedup, RPC integrity

### Receipts
- PDF generation (`receipt-pdf.service.tsx`, `receipts.service.ts`)
- WhatsApp copy buttons (`receipt-whatsapp-button.tsx`)
- Integrity service prevents duplicate receipt paths

### Tenant activation
- Post-first-rent activation links (`tenant-activation.service.ts`, `/t/activate/[token]`)

### Renewals
- Renewals overview + manual renew (`renew-tenancy-button.tsx`)
- Cron preparation (`renewal-reminders.service.ts`)
- Reminder interval days (30/60/90) on tenancies

### Automatic rent charges
- Daily cron posts due charges via `post_due_rent_charges` RPC

### Quit notices
- Draft/issue/acknowledge/withdraw lifecycle
- PDF generation (`quit-notice-pdf.service.tsx`)

### Property rules / KYC engine
- Property/unit scoped rules with enforcement levels
- Auto-decline on KYC submission

### Agent flows
- Agent profile + Paystack subaccount setup
- Property listings with landlord verification/claim tokens (`agent-property-listings.service.ts`)
- Tenant onboarding links from converted listings
- Agent dashboard at `/agent/overview` with payout verification polling
- Processing fee collection for agent-sourced tenants
- Commission tracking in services (UI placeholder at `/agent/commissions`)

### Platform admin
- Dashboard KPIs (`platform-admin-dashboard.service.ts`)
- Payment operations queue + detail views
- Payout verification queue (manual Paystack subaccount approval)
- **Payment settings** (NEW): configure agent/landlord processing fees, BOPA Basic/Pro annual prices, trial days

### Landlord subscription & trial (NEW since v1)
- Trial auto-start on landlord registration and public-tool signup (`landlord-trial.service.ts`)
- Access gating (`landlord-subscription-access.service.ts`): active subscription, trialing, legacy grandfathered, trial expired, subscription inactive
- Nav/UI locking when access denied (`LandlordShell`, `landlord-subscription-gate.ts`)
- Settings page pricing section (`LandlordPricingPlans`, `#bopa-plans` anchor)
- Subscription notice on overview and settings

### Public receipt/agreement generators + claim/import
- SEO location pages, watermarked PDFs
- Claim flow → landlord signup + trial
- Imported lists in landlord dashboard

### Auth
- Landlord/agent phone + password login
- Email + password + magic link for "manager" routes (creates landlord role)
- OTP login (Twilio-dependent)
- Role-based post-login routing

### Audit / activity feed
- Central writer: `audit-log.service.ts` (`writeAuditLog`, `writeSystemAuditLog`)
- Landlord activity page reads audit logs
- Event types in `audit-events.ts` (includes new fee/trial/settings events)

### Legal pages
- `/privacy`, `/terms`, `/refund-policy`

### Payout verification
- Landlord/agent Paystack subaccount setup
- Admin manual verification queue
- Auto-refresh polling (`PayoutVerificationAutoRefresh`, 25s interval)
- Payment gates until verified (`paystack-verification.service.ts`, `landlord-payment-gate.ts`)

---

## 6. In-Progress / Partial Features

| Feature | Current state |
|---------|---------------|
| **BOPA subscription purchase** | Gating + pricing display exist; no Paystack checkout service for Basic/Pro plans |
| **`(gated)` route group migration** | Layout exists at `(landlord)/(gated)/layout.tsx`; pages still at `(landlord)/` level — duplicate page files may exist under `(gated)/` |
| **Renewal reminder delivery** | Cron prepares reminders; full WhatsApp/email dispatch NOT fully traced |
| **Agent commissions UI** | Gateway splits work; `/agent/commissions` is placeholder |
| **Caretakers** | `/caretakers` placeholder UI; DB schema exists |
| **Reports** | `/reports` placeholder UI |
| **Manager role** | Email auth UI exists; backend creates `role: "landlord"` — no distinct property_manager role |
| **OTP login** | Depends on Twilio env configuration |
| **App fee payments** | Separate flow exists; optional on rent |
| **Scaffolded APIs** | `/api/cron/overdue-alerts`, `/api/cron/rent-due-notifications`, `/api/webhooks/whatsapp`, `/api/files/signed-download`, `/api/onboarding/tenant/resolve`, `/api/inngest` |
| **`proxy.ts` wiring** | File exists; no `middleware.ts` — security headers may not be active |
| **`resend` package** | In dependencies; zero imports in `src/` |
| **`audit.service.ts`** | Dead code — duplicate auth stubs, zero imports |
| **`landlord_tenant_processing_fee_intents` RLS** | Table created without RLS policies (migration gap) |
| **Inngest jobs** | Client + route scaffold only |

---

## 7. Core Reusable Patterns

### Component composition patterns
- **Shell + page:** Layout fetches auth/access state → passes to shell → page renders domain sections.
- **Card compounds:** `Card`/`CardHeader`/`CardTitle`/`CardContent`/`CardFooter`.
- **SectionCard:** Card with titled header bar + optional action slot.
- **StatCard:** Metric with icon tone container.
- **Domain cards:** `{Entity}Card`, `{Entity}Form`, `{Entity}Panel` naming.
- **Sticky sidebar panels:** `xl:sticky xl:top-28` on tenant detail page.

### Hook patterns
- **`useActionState(action, initialState)`** — all form mutations.
- **`useToast()`** — via `ToastProvider` context; consumed by `ActionResultToast`.
- No custom data-fetching hooks — RSC handles reads.

### Utility/helper patterns
| Concern | Location |
|---------|----------|
| Class merging | `src/lib/cn.ts` — `clsx` + `tailwind-merge` |
| Status labels | `src/lib/status-copy.ts`, `src/lib/tenant-pipeline-status.ts` |
| Tenancy dates | `src/lib/tenancy-period.ts` |
| Reminder intervals | `src/lib/reminder-interval.ts` |
| Payment gate UI | `src/lib/landlord-payment-gate.ts` |
| Subscription gate UI | `src/lib/landlord-subscription-gate.ts` |
| Payout verification UI | `src/lib/payout-verification.ts` |
| Auth routing | `src/lib/auth-routing.ts` |
| Currency | `src/server/utils/money.ts`, `CurrencyInput` component |
| Balance | `src/server/utils/tenancy-balance.ts`, `tenancy-financial-integrity.service.ts` |
| WhatsApp URLs | `src/lib/whatsapp.ts`, `src/server/utils/whatsapp.ts` |
| Phone normalization | `src/lib/phone.ts`, `src/server/utils/phone.ts` |
| Navigation config | `src/lib/navigation.ts`, `src/lib/platform-admin-navigation.ts` |
| Charge presets | `src/lib/landlord-charge-presets.ts` |
| Agreement template default | `src/lib/agreement-template-default.ts` |
| Onboarding lifecycle helpers | `src/server/constants/onboarding-lifecycle.ts` |

### Service abstraction patterns
- **Auth guards:** `requireLandlord()`, `requireLandlordPlatformOperator()`, `requireTenant()`, `requireAgent()`, `requirePlatformAdminPage()`, `requireCaretaker()`.
- **Admin client for system writes:** webhooks, cron, audit, storage, token flows.
- **React `cache()`:** platform payment settings read deduplication.
- **Integrity services:** separate from main flow for idempotency/validation.
- **PDF services:** `.service.tsx` files using `@react-pdf/renderer`, upload to Supabase Storage.

### Form handling patterns
```typescript
// Typical action pattern
"use server";
export async function someAction(_prev: SomeState, formData: FormData): Promise<SomeState> {
  try {
    const parsed = someSchema.parse(Object.fromEntries(formData));
    await someService.doThing(parsed);
    revalidatePath("/some/path");
    return { ok: true, message: "Success message" };
  } catch (error) {
    return toActionError(error); // wraps errorResult
  }
}

// Typical form component
"use client";
const [state, action, pending] = useActionState(someAction, initialSomeActionState);
// Inline alert when state.message && !state.ok
// <ActionResultToast ok={state.ok} message={state.message} />
```

- Initial states defined in `*.state.ts` alongside actions.
- Field errors from Zod passed through `fieldErrors` on state type.
- `CurrencyInput` for NGN amounts; `PhoneNumberInput` for Nigerian phones.

### Table/list rendering patterns
- No shared data-table abstraction.
- Lists render as stacked cards or simple HTML tables with Tailwind.
- `EmptyState`, `LoadingState`, `ErrorState` for list boundaries.
- `StatusPill` / `Badge` for row status.

### Modal/dialog patterns
- `RentPaymentModal` — client modal for Paystack initialization.
- `SlideOverPanel` — drawer pattern for secondary actions.
- `login-role-selection-modal.tsx` — landing login role picker.
- No Radix/shadcn Dialog — custom implementations.

### Offline/queue/sync patterns
- **None implemented.** Notifications table exists; cron prepares but full dispatch incomplete.
- Inngest scaffold present but unused.

---

## 8. Styling / Design System Rules

### Theme philosophy
- **Light mode only** (`color-scheme: light`).
- Warm off-white background (`#F8F7F4`) with subtle gold radial glow.
- Blue primary (`#1B4FD8`) + gold accent (`#F6B73C`) — professional Nigerian SaaS aesthetic.
- High contrast text hierarchy; generous whitespace; touch-friendly targets.

### Color usage
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1B4FD8` | CTAs, active nav, links |
| `primary-soft` | `#EAF0FF` | Hover backgrounds, info callouts |
| `gold` / `gold-soft` | `#F6B73C` / `#FFF4D8` | Accent highlights, brand glow |
| `success` / `success-soft` | `#16A34A` / `#EAF7EE` | Paid, verified, approved |
| `warning` / `warning-soft` | `#D97706` / `#FFF3DF` | Pending, trialing |
| `danger` / `danger-soft` | `#DC2626` / `#FDECEC` | Errors, rejected, expired |
| `text-strong/normal/muted` | `#111827` / `#374151` / `#6B7280` | Typography hierarchy |
| `border-soft` | `#E7E5DF` | Input borders, dividers |
| `surface` | `#FFFFFF` | Cards, inputs |
| `background` | `#F8F7F4` | Page background |

Status tones in `status-copy.ts`: `primary`, `success`, `warning`, `danger`, `neutral`.

### Typography rules
- **Font:** Plus Jakarta Sans via `next/font/google` (`--font-plus-jakarta`).
- **Headings:** `font-extrabold` or `font-black`.
- **Labels:** `font-semibold`.
- **Body:** `text-sm leading-6` default.
- **Inputs:** 16px font size (prevents iOS zoom).

### Spacing conventions
- Card padding: `p-5 md:p-6`.
- Section gaps: `gap-4` to `gap-6`.
- Grid breakpoints: `md:grid-cols-2`, `xl:grid-cols-4/5`.

### Layout/grid rules
- Landlord: desktop sidebar + mobile bottom nav.
- Agent/tenant: sticky header + mobile nav.
- Admin: sidebar navigation.
- Content max-width varies by page; forms often `max-w-2xl`.

### Card/button/input styles
- **Cards:** `rounded-card bg-surface shadow-card` (1rem radius).
- **Buttons:** `rounded-button` (0.75rem), variants: `primary | secondary | danger | ghost`, sizes: `sm | md | lg`, min-height 40–48px.
- **Inputs:** `min-h-12 rounded-button border-border-soft`, focus `ring-2 ring-primary-soft`, error `border-danger`.
- **Shadows:** `shadow-card` for cards, `shadow-soft` for buttons/active nav.

### Responsive design approach
- Mobile-first Tailwind breakpoints.
- Sidebar hidden on mobile; bottom nav shown.
- Sticky panels collapse to stacked on smaller screens.
- `min-h-12` touch targets throughout.

### Animation/motion conventions
- Minimal — `scroll-behavior: smooth` on html.
- Loading spinners on buttons via `isLoading` prop.
- Toast slide-in via `ToastProvider`.
- No framer-motion.

---

## 9. Naming Conventions

### File naming conventions
- **kebab-case** for all files: `tenant-activation.service.ts`, `landlord-shell.tsx`.
- **Server actions:** `{domain}.actions.ts`
- **Action state:** `{domain}.state.ts`
- **Services:** `{domain}.service.ts` (PDF renderers: `{domain}-pdf.service.tsx`)
- **Repositories:** `{domain}.repository.ts`
- **Validators:** `{domain}.schema.ts`
- **Components:** `{entity}-{purpose}.tsx` in domain folders

### Component naming conventions
- **Export PascalCase:** `LandlordShell`, `TenantReviewCard`.
- **Client components:** `"use client"` directive at top.
- **Page components:** default export, often named `Page` or descriptive.

### Hook naming conventions
- **`use{Thing}`:** `useToast`, `useActionState` (React built-in).
- No custom data hooks convention established.

### Variable/function naming rules
- **camelCase** for variables/functions.
- **SCREAMING_SNAKE** for constants: `AUDIT_EVENT_TYPES`, `GATED_LANDLORD_PATH_PREFIXES`.
- **AppError codes:** SCREAMING_SNAKE: `LANDLORD_SUBSCRIPTION_REQUIRED`, `FORBIDDEN`.
- **Brand in code:** user-facing = BOPA; internal prefixes often `tenuro` (e.g. `tenuro_` Paystack references, `TENURO_GATEWAY_ADMIN_FEE_NAIRA`).

### Database/table naming rules
- **snake_case** for tables, columns, enums.
- **Plural tables:** `tenants`, `tenancies`, `audit_logs` (app uses plural `audit_logs`, NOT `audit_log`).
- **FK pattern:** `{entity}_id`.
- **Timestamps:** `created_at`, `updated_at`, domain-specific (`agreement_live_at`, `trial_expires_at`).
- **Enums:** snake_case values (`submitted_for_landlord_review`).

### Import alias
- `@/` maps to `src/` (tsconfig paths).

---

## 10. Data Models / Schemas

### Migrations (apply in order — 17 total)
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
13. `20260526000000_agent_verification_onboarding_lifecycle.sql`
14. `20260526000001_backfill_onboarding_submitted_status.sql`
15. `20260527000000_platform_payment_settings.sql`
16. `20260528000000_landlord_verification_and_trial.sql`
17. `20260529000000_subscriptions_cancellation_reason.sql`

### Core entities (49 tables post-migrations)

**Identity & settings:**
- `profiles` — 1:1 with `auth.users`; `role` enum, `full_name`, `phone_number`, `is_active`
- `landlord_settings` — defaults, bank info, receipt branding, **`trial_started_at`**, **`trial_expires_at`**
- `agent_profiles` — agent business profile

**Property hierarchy:**
- `properties` → `blocks` (optional) → `units`
- `property_rules` — KYC/rental rules per property/unit
- `caretaker_assignments` — caretaker ↔ property (no UI)

**Tenant lifecycle:**
- `tenants` — KYC data, `onboarding_status`, verification fee fields, agent linkage
- `guarantors` — tenant guarantors
- `tenant_activation_tokens` — hashed activation tokens

**Tenancy & agreements:**
- `tenancies` — lease terms, `tenancy_status`, `agreement_live_at`, `charges_confirmed_at`, `reminder_interval_days`
- `landlord_tenancy_charges` — move-in charges (`charge_name` authoritative)
- `tenancy_agreement_documents` — agreement PDF lifecycle
- `agreement_templates` — reusable landlord templates
- `quit_notices`, `renewal_queue`

**Financial:**
- `rent_payments`, `ledger_entries` (authoritative), `tenant_ledger` (parallel — reconciliation pending)
- `receipts`, `receipt_counters`
- `gateway_payment_intents`, `gateway_payment_events`, `payment_allocations`
- `agent_tenant_processing_fee_intents`, **`landlord_tenant_processing_fee_intents`** (NEW)
- `app_fee_payment_intents`
- `opening_balance_declarations`, `debt_breakdown`

**Paystack accounts:**
- `landlord_paystack_accounts`, `agent_paystack_accounts` — subaccounts + `verification_status`

**Subscriptions & platform config (NEW/extended):**
- `subscriptions` — `plan_type` (basic/pro), `status` (active/trialing/cancelled/etc.), `expires_at`, `cancellation_reason`
- `subscription_payments`
- **`platform_payment_settings`** — singleton: agent/landlord processing fee splits, BOPA pricing, trial days

**Agent:**
- `agent_property_listings` — listings with verification/claim tokens
- `agent_paystack_accounts`

**Public tools:**
- `public_tool_leads`, `public_generated_agreements`, `public_generated_receipts`
- `agreement_usage_events`, `receipt_usage_events`

**System:**
- `audit_logs` (app), `audit_log` (triggers)
- `notifications`
- `otp_store`, `otp_delivery_logs` (legacy)

### Key enums (43 total)
- `user_role`: landlord, tenant, caretaker, agent, **platform_admin**
- `tenant_onboarding_status`: invited, profile_complete, **documents_submitted**, **submitted_for_landlord_review**, **waitlisted**, approved, rejected, token_expired
- `tenancy_status`: active, terminated, etc.
- `payment_frequency`: annual, biannual, quarterly, monthly
- `gateway_payment_status`, `landlord_processing_fee_status` (NEW), `agent_processing_fee_status`
- `bopa_plan_type`, `bopa_subscription_status`

### Key relationships
```
profiles ─┬─ properties ── units ── tenancies ── rent_payments ── ledger_entries
          ├─ tenants ── tenancies
          ├─ subscriptions
          ├─ landlord_paystack_accounts
          └─ landlord_settings (trial)

tenants ──┬─ agent_tenant_processing_fee_intents (agent-sourced)
          └─ landlord_tenant_processing_fee_intents (landlord-sourced)

gateway_payment_intents ── payment_allocations ── rent_payments

agreement_templates ── tenancy_agreement_documents ── tenancies
```

### Tenancy phase model (CRITICAL)
| Phase | Condition |
|-------|-----------|
| **Agreement setup** | `agreement_live_at IS NULL` AND `tenancy_status = 'active'` |
| **Operationally live** | `agreement_live_at IS NOT NULL` AND `tenancy_status = 'active'` |

Do **not** reintroduce draft enum workflow — use `agreement_live_at`.

### Payment total formula (VERIFIED)
```
total = rent + landlordCharges + agentCommission + tenuroFee (BOPA fee)
```
Env: `TENURO_GATEWAY_ADMIN_FEE_NAIRA`. Link expiry: 24 hours.

### Amount units
- Rent/ledger: `numeric(12,2)` naira
- Gateway intents, processing fees, subscriptions: **kobo** (integer)

### Schema drift risk (CRITICAL)
Baseline migration column names differ from app code expectations:
- `reference` vs `paystack_reference` on gateway intents
- `accepted_at` vs `tenant_accepted_at` on agreement docs
- `current_period_end` vs `end_date` on tenancies
- Fresh DB from baseline-only **will fail** at migration 6+ or mismatch app repos.

---

## 11. Important Constraints / Non-Negotiables

1. **Layering:** actions → services → repositories. No business logic in actions or repositories.
2. **`agreement_live_at` model:** Setup vs live tenancy determined by this timestamp, NOT draft status enum.
3. **Annual rent default:** `createTenancySchema` defaults to `"annual"`; use `tenancy-period.ts` for all date math.
4. **Payment total formula and Paystack split pattern:** flat split + `transaction_charge` for platform fee; references prefixed `tenuro_`.
5. **Postgres RPCs for ledger/payments:** Do not implement financial writes as multi-step app transactions.
6. **Admin client for system writes:** webhooks, cron, audit, storage, token flows bypass RLS via service role.
7. **`errorResult` / `AppError` handling:** All user-facing errors through this pipeline.
8. **BOPA branding:** User-facing text says BOPA; do not expose "tenuro" to users.
9. **Payout verification gates:** Block gateway payments until Paystack subaccount verified.
10. **Subscription gating:** Use `requireLandlordPlatformOperator()` for mutations on gated features; respect `GATED_LANDLORD_PATH_PREFIXES`.
11. **Onboarding lifecycle:** Use helpers in `onboarding-lifecycle.ts`; treat `profile_complete` as legacy alias for `submitted_for_landlord_review`.
12. **Verification fee routing:** Agent-sourced vs landlord-sourced determined by `agentPropertyListingId` + `invitedByAgentId`; do not hardcode one path.
13. **Audit table:** Write to `audit_logs` (plural), not `audit_log`.
14. **Ledger table:** Use `ledger_entries` as authoritative; `tenant_ledger` is parallel/legacy.
15. **Charge naming:** `charge_name` is authoritative; `label`/`charge_type` are legacy synced columns.
16. **No API contract changes** without explicit instruction.
17. **No DB column renames** without migration + full repo audit.
18. **Platform payment settings:** Singleton row; splits must sum to total; validate in service before write.
19. **Legacy grandfathering:** Landlords with no subscription row AND no `trial_started_at` retain access — do not break this silently.

---

## 12. Known Technical Debt / Caveats

| Issue | Risk | Notes |
|-------|------|-------|
| Schema drift baseline vs migrations | **HIGH** | Fresh install may fail; app expects evolved column names |
| `proxy.ts` not wired to middleware | **MEDIUM** | Security headers + `x-pathname` may not apply |
| Tenant detail page coupling | **HIGH** | Central orchestration UI — changes ripple widely |
| Gateway webhook idempotency | **HIGH** | Must preserve dedup paths |
| No automated tests | **HIGH** | Zero test files found |
| `audit.service.ts` dead code | **LOW** | Confusing duplicate of auth guards |
| Split audit patterns | **MEDIUM** | Some services insert directly to `audit_logs` |
| `landlord_tenant_processing_fee_intents` missing RLS | **MEDIUM** | Migration gap |
| Dropped FK on `tenants.verification_fee_intent_id` | **MEDIUM** | Can point to agent OR landlord intent table |
| Dual tenancy status columns | **MEDIUM** | `status` text + `tenancy_status` enum — prefer enum |
| Parallel ledgers | **MEDIUM** | `ledger_entries` + `tenant_ledger` |
| `(gated)` route group incomplete | **LOW** | Duplicate layout/gating mechanisms |
| Manager role scaffolding | **LOW** | UI only; backend is landlord |
| Subscription purchase not built | **MEDIUM** | Gating exists without checkout |
| Unused deps (resend, inngest) | **LOW** | Implement or remove |
| Nav inconsistency | **LOW** | Some coming-soon items in nav vs `navigation.ts` |
| Overview uses `requireLandlord()` not platform operator | **LOW** | Intentional escape hatch for expired-trial landlords |
| Amount unit mixing (naira vs kobo) | **HIGH** | Always verify which unit a field uses |

### Deprecated / legacy (retained)
- `landlord_tenancy_charges.label`, `charge_type` (synced with `charge_name`)
- `tenancies.status` text (enum `tenancy_status` authoritative)
- `/onboarding/[token]` → redirects to `/t/onboarding/[token]`
- `otp_store` / `otp_delivery_logs` tables
- `AppShell` component (legacy; shells use role-specific components)

---

## 13. Pending Roadmap

Recommended implementation order:

1. **Fix migration chain for fresh installs** — reconciling migration bridging baseline column names to app expectations
2. **Wire `proxy.ts` as middleware** — security headers + reliable `x-pathname` for subscription gating
3. **BOPA subscription Paystack checkout** — complete monetization loop (Basic/Pro purchase flow)
4. **Add RLS to `landlord_tenant_processing_fee_intents`**
5. **Complete `(gated)` route group migration** — consolidate duplicate pages or remove redundant layout
6. **Agent commissions UI** — surface existing gateway split data
7. **Renewal reminder dispatch** — complete WhatsApp/email delivery from cron preparation
8. **Caretakers & reports** — implement or remove placeholder nav items
9. **Scaffolded crons/APIs** — implement overdue alerts, rent-due notifications, signed download, or remove
10. **Inngest / Resend** — implement background jobs and email, or remove dependencies
11. **Delete `audit.service.ts`** — eliminate dead code confusion
12. **Consolidate audit writes** — route all through `audit-log.service.ts`
13. **Automated tests** — at minimum for tenancy-period math, payment totals, subscription access logic

**Dangerous areas (require extra care):** agreement flow, gateway payments, ledger RPCs, Paystack split math, migrations, verification fee routing, subscription gating edge cases (legacy grandfathering).

---

## 14. Continuation Instructions For Next AI

### What to preserve
- **Architecture:** actions → services → repositories layering with `server-only` on services.
- **Domain models:** `agreement_live_at` setup/live model; annual rent default; payment total formula.
- **Financial integrity:** Postgres RPCs for ledger/payments; idempotency services for webhooks/receipts.
- **Auth patterns:** Supabase session + profile role; admin client for system writes.
- **Error handling:** `AppError` + `errorResult` + `ActionResultToast` + inline alerts.
- **UI system:** Custom `components/ui/` primitives; design tokens from `globals.css`; BOPA branding.
- **Nigerian context:** NGN, +234 phones, Paystack, WhatsApp-first messaging.
- **Onboarding lifecycle:** Extended status machine with verification fee step; use `onboarding-lifecycle.ts` helpers.
- **Subscription gating:** Three layers (layout redirect, nav lock, `requireLandlordPlatformOperator()`); legacy grandfathering rule.
- **Platform settings:** Singleton config via `platform-payment-settings.service.ts`.
- **Naming:** kebab-case files, PascalCase components, snake_case DB, `@/` imports.

### What to avoid changing
- Do NOT introduce Redux, tRPC, parallel API layers, or client-side Supabase mutations.
- Do NOT duplicate balance/receipt logic outside integrity services.
- Do NOT rename DB columns/fields without migration + full repo grep audit.
- Do NOT bypass payout verification gates or subscription access checks.
- Do NOT assume scaffolded features (Inngest, Resend, caretakers, reports, commissions UI) work.
- Do NOT reintroduce draft tenancy status enum workflow.
- Do NOT change API contracts or payment reference formats without explicit instruction.
- Do NOT use `audit.service.ts` — use `audit-log.service.ts`.
- Do NOT break legacy grandfathered landlord access unintentionally.

### Coding standards to maintain
1. **Analyze → Plan → Implement → Verify** workflow (per `.cursor/rules/project-rules.mdc`).
2. **Minimal diffs** — only modify files required for the task.
3. **Reuse existing abstractions** — match surrounding naming, types, import style.
4. **Comments** only for non-obvious business logic.
5. **No over-engineering** — no helpers for one-liners; no excessive error handling for impossible edges.
6. **Read Next.js 16 docs** in `node_modules/next/dist/docs/` before using Next.js APIs (breaking changes from training data).
7. **List files to modify before editing**; explain risks before implementation.
8. **Run verification after edits** (lint, build as appropriate).

### Refactor philosophy
- Prefer extending existing services over creating parallel implementations.
- Consolidate dead code removal in dedicated tasks, not mixed with feature work.
- When fixing schema drift, add forward migrations — never edit applied migrations.
- Keep tenant detail page changes surgical — it is the highest-coupling UI surface.

### Error prevention requirements
Before implementing any feature, verify:
- [ ] Route/page exists (or create following route group conventions)
- [ ] Service + repository/RPC exists (or extend existing)
- [ ] Validator schema exists in `src/server/validators/`
- [ ] Env var is referenced in code (not assumed)
- [ ] DB column exists in migrations (not baseline alone)
- [ ] Auth guard appropriate for role (`requireLandlordPlatformOperator` for gated landlord mutations)
- [ ] Audit event type added to `audit-events.ts` if new domain action
- [ ] Amount units correct (naira vs kobo)
- [ ] RLS policies considered for new tables

### Environment variables (verified in code)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client |
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `PAYSTACK_SECRET_KEY` | Paystack API |
| `TENURO_GATEWAY_ADMIN_FEE_NAIRA` | Platform fee on rent payments |
| `CRON_SECRET` | Cron route auth |
| `TENURO_SESSION_SECRET` | HMAC session tokens |
| `TENURO_FIELD_ENCRYPTION_KEY_BASE64` | Field encryption |
| `TWILIO_ACCOUNT_SID` | Twilio auth |
| `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp OTP |
| `TWILIO_SMS_NUMBER` | SMS OTP |
| `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` | Fallback base URLs |

---

*End of PROJECT HANDOFF SPECIFICATION v2.0*
