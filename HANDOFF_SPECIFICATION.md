# PROJECT HANDOFF SPECIFICATION

## 1. Project Overview

**Project Name:** Tenuro

**Core Purpose:** A comprehensive property and rental management platform designed specifically for Nigerian landlords, real estate agents, tenants, and property caretakers. Tenuro simplifies the entire rental lifecycle—from tenant onboarding and rental agreement generation to rent payment tracking, receipt generation, and renewal management.

**Target Users:**
- **Landlords**: Property owners managing single or multiple properties with multiple tenants
- **Agents**: Real estate professionals facilitating property verification and tenant onboarding
- **Tenants**: Rental occupants managing their lease agreements and payment records
- **Caretakers**: Property managers handling day-to-day property operations on behalf of landlords

**Business/Domain Context:**
- Nigeria-focused platform (NGN currency, Nigerian states/LGAs, WhatsApp-first communication)
- Addresses fragmented record-keeping in the Nigerian rental market
- Supports complex rental structures: multiple properties, multiple units per property, various rent payment frequencies
- Handles multi-tier workflows: landlord approval of tenants, agent commissions, payment verification
- Integrates with Paystack for payment gateway transactions
- Leverages WhatsApp for tenant notifications and document delivery

**Product Philosophy:**
- **Simple & Accessible**: Designed for users without technical backgrounds to manage complex rental operations
- **Clarity Over Features**: Focus on clear rent tracking and payment records rather than feature bloat
- **Trust & Verification**: Built-in verification flows for tenants, payments, and agreements
- **Complete Records**: Comprehensive audit trails and document generation for legal compliance
- **Digital-First Communication**: WhatsApp integration for immediate, informal communication with tenants
- **Security Through Roles**: Role-based access control ensures users only access appropriate data

---

## 2. Tech Stack

**Frontend:**
- **Framework**: Next.js 16.2.4 with App Router (server components by default)
- **UI Library**: React 19.2.4
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with custom theme extensions
- **Form/Data Validation**: Zod 4.3.6
- **Icons**: Lucide React 1.11.0
- **PDF Generation**: @react-pdf/renderer 4.5.1
- **Utilities**: clsx, tailwind-merge, date-fns

**Backend/Database:**
- **Runtime**: Next.js Server Actions ("use server" directive)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (password & OTP-based)
- **ORM/Query**: Supabase JavaScript client (direct query API)
- **Job Queue**: Inngest 4.2.4 (for cron jobs and async workflows)

**Infrastructure & Integrations:**
- **Deployment**: Vercel (configured in vercel.json)
- **Cron Jobs**: Vercel cron (rent charges at 2 AM daily, renewal reminders at 6 AM daily)
- **Payment Gateway**: Paystack (gateway payments, webhooks)
- **Email**: Resend 6.12.2 (for email notifications)
- **File Storage**: Supabase Storage (for PDFs and documents)
- **Notifications**: WhatsApp integration via Supabase triggers/webhooks

**Development Tools:**
- **Linter**: ESLint 9 (with Next.js and TypeScript configs)
- **Formatter**: Prettier 3.8.3
- **Font**: Plus Jakarta Sans (Google Fonts)

---

## 3. Architecture Overview

### 3.1 High-Level Architecture Pattern: Server-Driven with Server Actions

This project follows a **Next.js App Router with Server Actions** architecture:

```
Client Component (Form)
    ↓
Server Action ("use server")
    ↓
Validation (Zod Schema)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Database Queries)
    ↓
Supabase Database
```

**Key Principle**: Minimize client-side logic. Forms submit directly to server actions; data fetching happens server-side in page components.

### 3.2 Data Flow Architecture

1. **User Action Initiation**: User interacts with a form component (client component)
2. **Form Submission**: Form uses `useActionState` hook to call a server action
3. **Validation**: Server action parses FormData using Zod schema
4. **Authorization**: Service layer checks user role/permissions via `requireUser()`, `requireRole()`, etc.
5. **Business Logic**: Service applies domain rules (e.g., only active tenancies can record payments)
6. **Data Mutation**: Repository layer executes Supabase queries
7. **Audit Logging**: Critical operations logged to audit trail
8. **Cache Invalidation**: `revalidatePath()` clears Next.js cache to reflect changes
9. **Response**: Returns `ActionResult` (success/error) to client
10. **UI Update**: Client displays toast/error message; form revalidates

### 3.3 Component Architecture Philosophy

**Layering:**
- **Layout Components**: Shells with navigation (`LandlordShell`, `AgentShell`)
- **Feature Components**: Domain-specific components (Property form, Tenant card, Payment modal)
- **UI Components**: Reusable primitives (Button, Input, Card, Select)
- **Client vs Server**: Components are **server components by default** unless they need interactivity

**Principles:**
- Use client components minimally (only for forms, modals, interactive elements)
- Server components fetch data directly; no context/state management for data
- Props flow server→client; minimal callback props
- Each feature has its own folder in `src/components/`

### 3.4 State Management Architecture

**No centralized state manager** (no Redux, Zustand, Context). Instead:

1. **Server State**: Fetched by server components, passed to client as props
2. **Form State**: Managed by `useActionState` hook (React 19)
3. **UI State**: Local component state for modals, dropdowns, etc.
4. **Async Operations**: Server actions handle all mutations
5. **Revalidation**: `revalidatePath()` refreshes server-rendered data

### 3.5 API/Service Layer Structure

**Three-Layer Pattern:**

1. **Repositories** (`src/server/repositories/*.ts`):
   - Direct Supabase queries
   - No business logic
   - Named functions like `createProperty()`, `getRentPaymentsForLandlord()`
   - Typed row objects (e.g., `PropertyRow`, `RentPaymentRow`)
   - Explicit select statements
   - Error propagation (throw errors for callers to handle)

2. **Services** (`src/server/services/*.ts`):
   - Business logic and orchestration
   - Auth checks (call `requireLandlord()`, `requireAgent()`, etc.)
   - Permission checks
   - Multi-step workflows
   - Audit logging
   - Call repositories, not Supabase directly

3. **Actions** (`src/actions/*.ts`):
   - Form handlers ("use server")
   - Parse FormData with Zod
   - Call services
   - Return `ActionResult<T>` or action state object
   - Handle validation errors and display to user
   - Call `revalidatePath()` on success

### 3.6 Validation/Error Handling Approach

**Validation:**
- **Input**: Zod schemas in `src/server/validators/`
- **Schema Pattern**: Separate schemas per domain (auth, property, payment, etc.)
- **Transformation**: Use `.transform()` for computed fields (e.g., calculating tenancy end date)
- **Client-Side**: Minimal (optional); server validation is authoritative

**Error Handling:**
- **AppError**: Custom error class with `code`, `userMessage`, `status`
- **Result Type**: `ActionResult<T>` union type for success/error responses
- **Field Errors**: Zod errors flattened to `fieldErrors: Record<string, string[]>`
- **User Messages**: Always provide readable error messages; distinguish system from user-facing
- **Logging**: console.error on catch; don't expose stack traces to client
- **Database Errors**: Map Postgres error codes to user messages (e.g., "23505" → "This record already exists.")

---

## 4. Project Structure

```
c:\Users\HP\Documents\tenuro\
├── AGENTS.md                          # Warn about Next.js version breaking changes
├── CLAUDE.md                          # References AGENTS.md
├── HANDOFF_SPECIFICATION.md           # This document
├── package.json                       # Dependencies (Next.js, React, Tailwind, Zod, etc.)
├── tsconfig.json                      # TypeScript config (strict: true, baseUrl: @/*)
├── next.config.ts                     # Next.js config (minimal, no special options)
├── tailwind.config.ts                 # Tailwind theme extensions (colors, shadows, fonts)
├── eslint.config.mjs                  # ESLint with Next.js & TypeScript rules
├── postcss.config.mjs                 # PostCSS config for Tailwind
├── vercel.json                        # Vercel deployment config + cron schedules
├── README.md                          # Basic Next.js setup instructions (placeholder)
│
├── public/                            # Static assets (if any)
│
├── src/
│   ├── app/                           # Next.js App Router (routes)
│   │   ├── globals.css                # Global styles (Tailwind base + font)
│   │   ├── layout.tsx                 # Root layout (metadata, font setup)
│   │   ├── page.tsx                   # Landing page with feature list & auth links
│   │   │
│   │   ├── (auth)/                    # Auth route group
│   │   │   ├── layout.tsx             # Auth layout (no navigation shell)
│   │   │   ├── login/                 # Landlord/caretaker login
│   │   │   ├── register/              # Landlord/caretaker registration
│   │   │   └── agent/                 # Agent login/register routes
│   │   │
│   │   ├── (landlord)/                # Landlord workspace group
│   │   │   ├── layout.tsx             # LandlordShell with nav sidebar
│   │   │   ├── overview/              # Dashboard with stats & quick actions
│   │   │   ├── properties/            # Property list, detail, edit, create
│   │   │   ├── tenants/               # Tenant list, detail, edit, onboarding
│   │   │   ├── payments/              # Payment records, record payment, verify
│   │   │   ├── renewals/              # Renewal management, notices
│   │   │   ├── activity/              # Audit log viewer
│   │   │   ├── caretakers/            # Caretaker management (coming soon)
│   │   │   ├── reports/               # Reporting dashboards (coming soon)
│   │   │   └── settings/              # Account, bank setup, preferences
│   │   │
│   │   ├── (agent)/                   # Agent workspace group
│   │   │   ├── layout.tsx             # AgentShell with nav
│   │   │   ├── agent/
│   │   │   │   ├── overview/          # Agent dashboard: listings, earnings, setup
│   │   │   │   ├── property-listings/ # Agent's listed properties
│   │   │   │   ├── tenant-onboarding/ # Tenant onboarding workflows
│   │   │   │   └── earnings/          # Commission tracking
│   │   │   └── login & register routes
│   │   │
│   │   ├── (tenant)/                  # Tenant workspace group
│   │   │   ├── layout.tsx             # TenantShell with minimal nav
│   │   │   └── tenant/                # Tenant dashboard
│   │   │
│   │   ├── api/                       # API routes & webhooks
│   │   │   ├── cron/                  # Scheduled jobs
│   │   │   │   ├── rent-charges       # Daily rent charge posting
│   │   │   │   └── renewal-reminders  # Daily renewal reminders
│   │   │   ├── inngest/               # Inngest webhook endpoint
│   │   │   ├── webhooks/              # External webhooks (Paystack, etc.)
│   │   │   ├── onboarding/            # Tenant onboarding endpoints
│   │   │   └── files/                 # File upload/download endpoints
│   │   │
│   │   ├── auth/                      # Auth callback routes
│   │   │   └── callback/              # Supabase auth redirect
│   │   │
│   │   ├── onboarding/                # Tenant onboarding pages
│   │   │   └── [token]/               # Tokenized activation link
│   │   │
│   │   ├── register/                  # Registration pages
│   │   │   └── landlord/
│   │   │
│   │   ├── app-fees/                  # App fee payment pages
│   │   │   └── verify/
│   │   │
│   │   ├── a/                         # Agent-specific routes
│   │   │   └── property-verification/
│   │   │
│   │   ├── t/                         # Tenant-specific routes (short URLs)
│   │   │
│   │   └── proxy.ts                   # Utility for internal API routing
│   │
│   ├── actions/                       # Server actions (form handlers)
│   │   ├── *.actions.ts               # Server actions (e.g., createPropertyAction)
│   │   └── *.state.ts                 # Initial state for useActionState
│   │   ├── auth.actions.ts            # Login, signup, OTP
│   │   ├── properties.actions.ts      # Property CRUD
│   │   ├── tenants.actions.ts         # Tenant invite, approve, reject
│   │   ├── tenancy-agreements.actions.ts # Agreement generation, acceptance
│   │   ├── payments.actions.ts        # Record payment, verify, initialize gateway
│   │   ├── receipts.actions.ts        # Generate & send receipts
│   │   ├── quit-notices.actions.ts    # Create, issue, confirm move-out
│   │   ├── renewals.actions.ts        # Renewal workflows
│   │   ├── agent-profile.actions.ts   # Agent setup
│   │   ├── agent-property-listings.actions.ts
│   │   ├── agent-tenant-onboarding.actions.ts
│   │   ├── tenant-activation.actions.ts
│   │   └── [others...]
│   │
│   ├── components/                    # React components (organized by feature)
│   │   ├── ui/                        # Reusable UI primitives
│   │   │   ├── button.tsx             # Button with variants (primary, secondary, danger, ghost)
│   │   │   ├── input.tsx              # Text input with label, error, helper
│   │   │   ├── select.tsx             # Dropdown select
│   │   │   ├── textarea.tsx           # Textarea
│   │   │   ├── card.tsx               # Card + CardHeader/Title/Description/Content/Footer
│   │   │   ├── badge.tsx              # Status badge
│   │   │   ├── page-header.tsx        # Page title + description + action button
│   │   │   ├── stat-card.tsx          # Statistic display with icon & tone
│   │   │   ├── section-card.tsx       # Section with consistent styling
│   │   │   ├── status-pill.tsx        # Status indicator
│   │   │   ├── empty-state.tsx        # Empty state illustration & message
│   │   │   ├── error-state.tsx        # Error state display
│   │   │   ├── loading-state.tsx      # Skeleton/loading placeholder
│   │   │   ├── currency-input.tsx     # Money input with NGN formatting
│   │   │   ├── toast.tsx & use-toast.ts # Toast notifications
│   │   │   ├── toast-provider.tsx     # Toast context provider
│   │   │   ├── trust-notice.tsx       # Tenuro brand trust banner
│   │   │   ├── action-result-toast.tsx # Auto-toast for action results
│   │   │   └── whatsapp-send-button.tsx # WhatsApp action button
│   │   │
│   │   ├── layout/                    # Layout & shell components
│   │   │   ├── landlord-shell.tsx     # Landlord sidebar + content layout
│   │   │   ├── agent-shell.tsx        # Agent sidebar + content layout
│   │   │   ├── tenant-shell.tsx       # Tenant minimal layout
│   │   │   └── mobile-more-menu.tsx   # Mobile navigation menu
│   │   │
│   │   ├── auth/                      # Authentication components
│   │   │   ├── logout-button.tsx      # Logout trigger
│   │   │   └── [form components...]
│   │   │
│   │   ├── property/                  # Property feature components
│   │   │   ├── property-form.tsx      # Create/edit property form
│   │   │   ├── property-card.tsx      # Property list item card
│   │   │   ├── unit-form.tsx          # Create/edit unit form
│   │   │   ├── unit-card.tsx          # Unit list item card
│   │   │   ├── occupancy-summary.tsx  # Unit occupancy summary
│   │   │   └── archive-property-button.tsx
│   │   │
│   │   ├── tenant/                    # Tenant feature components
│   │   │   ├── [form & display components...]
│   │   │
│   │   ├── tenancy/                   # Tenancy/lease feature components
│   │   │   ├── [form & display components...]
│   │   │
│   │   ├── payment/                   # Payment feature components
│   │   │   ├── payment-form.tsx       # (empty; use specific methods)
│   │   │   └── [other payment components...]
│   │   │
│   │   ├── receipt/                   # Receipt feature components
│   │   │   └── [receipt components...]
│   │   │
│   │   ├── renewal/                   # Renewal feature components
│   │   │   └── [renewal components...]
│   │   │
│   │   ├── quit-notices/              # Quit notice feature components
│   │   │   └── [quit notice components...]
│   │   │
│   │   ├── onboarding/                # Onboarding flow components
│   │   │   └── [onboarding components...]
│   │   │
│   │   ├── property-rules/            # Property rule components
│   │   │   └── [property rule components...]
│   │   │
│   │   └── agent/                     # Agent-specific components
│   │       ├── agent-profile-form.tsx
│   │       ├── agent-bank-setup-form.tsx
│   │       └── [other agent components...]
│   │
│   ├── lib/                           # Utility functions & helpers
│   │   ├── cn.ts                      # clsx + tailwind-merge helper
│   │   ├── navigation.ts              # Navigation utilities (if any)
│   │   ├── status-copy.ts             # Status label mapping (active → "Active", etc.)
│   │   └── tenancy-period.ts          # Date calculation utilities
│   │
│   └── server/                        # Server-side utilities & logic
│       ├── constants/                 # Constants
│       │   ├── permissions.ts         # APP_PERMISSIONS enum & role permission matrix
│       │   ├── audit-events.ts        # Audit event type constants
│       │   ├── notification-types.ts  # Notification channel & type constants
│       │   ├── routes.ts              # App URL constants
│       │   ├── session.ts             # Session-related constants
│       │   └── storage-paths.ts       # S3/Supabase storage path patterns
│       │
│       ├── errors/                    # Error handling
│       │   ├── app-error.ts           # AppError class
│       │   ├── error-map.ts           # Database error code → message mapping
│       │   └── result.ts              # ActionResult type + result builders
│       │
│       ├── types/                     # Domain types & interfaces
│       │   ├── auth.types.ts          # UserRole, ServerSessionUser, AuthActionState
│       │   └── [domain-specific types...]
│       │
│       ├── validators/                # Zod schemas for validation
│       │   ├── common.schema.ts       # Shared schemas (uuid, money, phone, etc.)
│       │   ├── auth.schema.ts         # Auth schemas
│       │   ├── property.schema.ts     # Property schemas
│       │   ├── unit.schema.ts         # Unit schemas
│       │   ├── tenant.schema.ts       # Tenant schemas
│       │   ├── tenancy.schema.ts      # Tenancy schemas
│       │   ├── payment.schema.ts      # Payment schemas
│       │   ├── tenancy-agreement.schema.ts
│       │   ├── quit-notice.schema.ts
│       │   ├── agent.schema.ts
│       │   ├── onboarding.schema.ts
│       │   ├── renewal.schema.ts
│       │   └── [others...]
│       │
│       ├── repositories/              # Data access layer
│       │   ├── profiles.repository.ts # Profile CRUD
│       │   ├── properties.repository.ts
│       │   ├── units.repository.ts
│       │   ├── tenants.repository.ts
│       │   ├── tenancies.repository.ts
│       │   ├── payments.repository.ts # Rent payment queries & mutations
│       │   ├── receipts.repository.ts
│       │   ├── tenancy-agreements.repository.ts
│       │   ├── quit-notices.repository.ts
│       │   ├── renewals.repository.ts
│       │   ├── ledger.repository.ts   # Tenant balance/payment ledger
│       │   ├── audit-log.repository.ts
│       │   ├── gateway-payment.repository.ts # Paystack payment intents
│       │   ├── otp.repository.ts      # OTP records
│       │   ├── notifications.repository.ts
│       │   ├── agent-*.repository.ts  # Agent-specific data
│       │   ├── tenant-*.repository.ts # Tenant-specific data
│       │   └── [others...]
│       │
│       ├── services/                  # Business logic layer
│       │   ├── auth.service.ts        # Auth, user session, role/permission checks
│       │   ├── properties.service.ts  # Property operations with audit
│       │   ├── units.service.ts
│       │   ├── tenants.service.ts     # Tenant invite, approval, etc.
│       │   ├── tenancies.service.ts   # Lease operations
│       │   ├── payments.service.ts    # Payment recording, verification
│       │   ├── receipts.service.ts    # Receipt generation & delivery
│       │   ├── tenancy-agreements.service.ts # Agreement workflows
│       │   ├── quit-notices.service.ts # Quit notice management
│       │   ├── renewals.service.ts    # Renewal workflows (mostly empty)
│       │   ├── ledger.service.ts      # Tenant balance calculations
│       │   ├── audit-log.service.ts   # Audit trail writing
│       │   ├── gateway-payment.service.ts # Paystack integration
│       │   ├── payment-verify.service.ts # Payment verification
│       │   ├── otp.service.ts         # OTP generation, verification
│       │   ├── otp-dispatch.service.ts # OTP delivery (WhatsApp, SMS)
│       │   ├── notification-queue.service.ts # (empty)
│       │   ├── overview.service.ts    # Dashboard stats aggregation
│       │   ├── tenant-dashboard.service.ts # Tenant-specific dashboard
│       │   ├── pdf.service.ts         # PDF utilities
│       │   ├── receipt-pdf.service.tsx # Receipt PDF rendering
│       │   ├── tenancy-agreement-pdf.service.tsx
│       │   ├── tenancy-agreement-template.service.ts
│       │   ├── quit-notice-pdf.service.tsx
│       │   ├── quit-notice-template.service.ts
│       │   ├── storage.service.ts     # File upload/signed URLs
│       │   ├── whatsapp.service.ts    # (empty; integration pending)
│       │   ├── paystack.service.ts    # Paystack API client
│       │   ├── session.service.ts     # Session token management
│       │   ├── idempotency.service.ts # Idempotent request handling
│       │   ├── agent-*.service.ts     # Agent-specific services
│       │   └── [others...]
│       │
│       ├── utils/                     # Helper utilities
│       │   ├── crypto.ts              # SHA256, secure token generation
│       │   ├── phone.ts               # Phone normalization (234 format)
│       │   ├── money.ts               # Currency formatting (formatNaira)
│       │   ├── whatsapp.ts            # WhatsApp URL builder
│       │   ├── tokens.ts              # Secure token generation, expiry
│       │   ├── encryption.ts          # AES encryption utilities
│       │   ├── dates.ts               # Date formatting
│       │   └── [others...]
│       │
│       └── supabase/                  # Supabase client setup
│           ├── server.ts              # Server client (with cookie middleware)
│           └── admin.ts               # Admin client (service role key)
│
└── supabase/                          # Supabase migrations & config
    └── migrations/                    # (Currently empty; schema managed via Supabase dashboard)
```

---

## 5. Implemented Features

### 5.1 Authentication & Authorization
- **Phone/Password Registration**: Landlords and agents register with phone + password
- **Phone/Password Login**: Credentials-based authentication via Supabase Auth
- **OTP-Based Login**: Legacy OTP system (mostly superseded by password login)
- **Role-Based Access Control**: Four roles (landlord, agent, tenant, caretaker) with granular permissions
- **Session Management**: Auth state stored in cookies, validated on each request
- **Logout**: Clear session and redirect to login

### 5.2 Property Management
- **Create Property**: Landlords add buildings/compounds with name, address, state, LGA, property type
- **Edit Property**: Update property details (name, address, location)
- **View Properties**: List all landlord properties with unit count and status
- **Archive Property**: Soft-delete properties (archive_at timestamp)
- **Property Types**: Residential, residential compound, flat complex, mixed-use

### 5.3 Unit Management
- **Create Unit**: Add rental units within a property (rooms, flats, shops, etc.)
- **Edit Unit**: Update unit identifier, type, status
- **View Units**: List units per property with occupancy status
- **Unit Status Tracking**: vacant, occupied, maintenance, reserved
- **Archive Unit**: Soft-delete units

### 5.4 Tenant Management
- **Invite Tenant**: Create tenant record with name, phone, optional email
- **Tenant Onboarding**: Two-tier verification (KYC + landlord approval)
- **Approve Tenant**: Landlord approves KYC submission
- **Reject Tenant**: Landlord rejects with reason
- **Tenant Profile**: Full details (DOB, address, occupation, guarantor)
- **Update Tenant**: Edit tenant information
- **Archive Tenant**: Soft-delete tenant records
- **Tenant Activation**: Generate activation link after payment; tenant sets password

### 5.5 Tenancy/Lease Management
- **Create Tenancy**: Link tenant to unit with rent amount, payment frequency, start date
- **Tenancy Frequencies**: Monthly, quarterly, biannual, annual
- **Calculate End Date**: Auto-calculated based on start date + frequency
- **Opening Balance**: Set starting balance (arrears or deposit)
- **Renew Tenancy**: Extend lease with new dates
- **Terminate Tenancy**: End lease early (soft-delete)
- **Status Tracking**: draft, active, expired, terminated, archived

### 5.6 Rent Payment Tracking
- **Record Manual Payment**: Log cash, bank transfer, or offline payments
- **Payment Methods**: bank_transfer, cash, other, paystack_gateway
- **Payment Verification**: Landlord can verify/confirm payments
- **Payment Date**: Flexible payment dating (can record historical payments)
- **Period-Based Payments**: Record which rent period payment covers
- **Partial Payments**: Support split payments across periods
- **Balance Tracking**: Running balance (balance_before/after) per payment
- **Idempotency**: Prevent duplicate payment recording via idempotency keys
- **Reverse Payment**: Undo recorded payments (soft-delete with status=reversed)

### 5.7 Rent Payment Gateway Integration
- **Paystack Integration**: Initialize payment links via Paystack API
- **Payment Intent Tracking**: Track payment status (initialized, pending, paid, failed)
- **Webhook Verification**: Verify Paystack webhooks for payment confirmation
- **Auto-Recording**: Automatically record payment upon verification
- **App Fee Deduction**: Calculate & deduct platform fee from rent

### 5.8 Receipt Management
- **Generate Receipt**: Create PDF receipt after payment verification
- **Receipt Numbering**: Auto-generated receipt numbers (REC-{id})
- **Receipt Content**: Amount, dates, property, unit, payment method, tenant info
- **WhatsApp Delivery**: Send receipt download link via WhatsApp message
- **Receipt Status**: pending, generated, failed, voided
- **Signed URLs**: Generate time-limited download links for PDFs

### 5.9 Tenancy Agreements
- **Generate Agreement**: Create PDF agreement from template
- **Agreement Template**: Dynamic template with property rules & tenant details
- **Guarantor Requirement**: Optional guarantor based on property rules
- **Tenant Acceptance**: Tenant signs agreement via secure link
- **Token-Based Access**: Time-limited acceptance links
- **Agreement States**: draft, finalized, accepted
- **Auto-Rent Init**: Initialize first payment after acceptance
- **Guarantor Management**: Add/replace guarantor for tenant

### 5.10 Quit Notices & Move-Out
- **Create Quit Notice**: Landlord issues notice to tenant with vacate date
- **Quit Notice Types**: landlord_quit_notice, tenant_move_out_request
- **Generate PDF**: Formal quit notice PDF with all terms
- **WhatsApp Draft**: Open pre-formatted WhatsApp message to send notice
- **Tenant Acknowledgment**: Tenant can acknowledge notice
- **Confirm Move-Out**: Record actual move-out date
- **Status Tracking**: drafted, issued, acknowledged, move_out_confirmed, withdrawn

### 5.11 Renewal Management
- **Renewal Notices**: Notify tenants of upcoming lease expiration
- **Renewal Workflow**: Initiate new tenancy or end lease
- **Reminder System**: Daily cron job sends renewal reminders
- **Renewal Status**: Pending renewal, renewed, or expired

### 5.12 Agent Features
- **Agent Profile Setup**: Business name, phone, location, address
- **Bank Account Setup**: Connect Paystack account for payouts
- **Property Listings**: Submit properties for landlord verification
- **Tenant Onboarding**: Facilitate tenant KYC and landlord approval
- **Earnings Tracking**: View agent commissions & payouts
- **Listing Status**: Pending, verified, converted, rejected, archived
- **Commission Calculation**: Auto-calculated % of rent per tenant

### 5.13 Tenant Portal (Self-Service)
- **View Lease Details**: See active tenancy & property info
- **Payment History**: View all recorded payments
- **Ledger Balance**: Current balance, arrears, or deposit status
- **Move-Out Request**: Notify landlord of intention to vacate
- **Account Activation**: Set password after landlord activation

### 5.14 Audit Logging
- **Comprehensive Audit Trail**: Every mutation logged with actor, action, timestamp
- **Audit Fields**: actor_role (landlord/tenant/system), entity_type, event_type, metadata
- **Query Auditlog**: Landlord can view activity log with filters
- **Business Events**: Tracked events include creation, updates, approvals, rejections, terminations

### 5.15 Notifications
- **WhatsApp Integration**: Send notifications via WhatsApp
- **Notification Types**: Onboarding invites, rent due, overdue, receipts, renewals
- **Channels**: WhatsApp, SMS (framework ready; SMS not yet implemented)
- **Notification Queue**: Background processing for batch notifications

### 5.16 Property Rules
- **Create Property Rules**: Define rules per property (e.g., guarantor required)
- **Rule Metadata**: Flexible metadata for complex conditions
- **Agreement Rules**: Rules affect agreement requirements
- **Archive Rules**: Soft-delete old rules

### 5.17 Caretaker Features (Framework; Largely Unimplemented)
- **Role Definition**: Caretaker = property manager for landlord
- **Caretaker Invit**: Link caretaker to property
- **Permission Delegation**: Caretaker can record payments, view records
- **Status**: Coming soon in UI

### 5.18 Onboarding System
- **Multi-Step Onboarding**: Profile → Property rules → Agreement → Payment
- **KYC Flow**: Tenant submits ID, address, guarantor info
- **Landlord Review**: Approve or reject with feedback
- **Token-Based Links**: Secure, time-limited onboarding URLs

### 5.19 Tenant-Specific Charges
- **Rent Charges**: Daily cron job creates tenant charge entries
- **Balance Updates**: Updates tenant ledger with current period charge
- **Frequency-Aware**: Posts charges based on payment frequency
- **Automatic Posting**: Fires daily; skips non-active tenancies

### 5.20 Landlord Overview/Dashboard
- **Key Metrics**: Rent collected (YTD), total units, occupied, vacant, pending renewals
- **Quick Actions**: Contextual buttons (add first property → add first tenant → record payment)
- **Setup Guidance**: Special onboarding card for new landlords
- **Links to Details**: Navigate to payment records, renewal list, etc.

---

## 6. In-Progress / Partial Features

### 6.1 Caretaker Management (80% scaffolded, not implemented)
- UI skeleton exists
- Permission model defined but not enforced
- **Status**: Framework ready; needs role delegation logic

### 6.2 Reports & Analytics (0% complete)
- UI placeholder exists ("coming soon")
- No report generation or export logic
- **Status**: Designed but not started

### 6.3 WhatsApp Integration (Framework incomplete)
- WhatsApp service file exists but is empty
- Uses Supabase messaging/webhooks (needs config)
- **Status**: Template defined; integration TBD

### 6.4 SMS Notifications (0% complete)
- Notification type exists in constants
- No SMS dispatch service implemented
- **Status**: Designed; not implemented

### 6.5 Multi-Currency Support (Partial)
- Schema supports currency codes
- Only NGN validated/formatted
- No conversion logic
- **Status**: Extensible; single-currency for now

### 6.6 Advanced Payment Allocation (Partial)
- Partial payment support exists
- No automatic period-based allocation
- Ledger service handles balances
- **Status**: Manual allocation works; auto-allocation not implemented

---

## 7. Core Reusable Patterns

### 7.1 Component Composition Patterns

**Server Component Fetching:**
```typescript
// Page component (server component)
export default async function Page() {
  const user = await requireLandlord();
  const data = await getCurrentLandlordProperties();
  
  return <PropertyList properties={data} />;
}
```

**Client Component with Action State:**
```typescript
"use client";

export function PropertyForm() {
  const [state, formAction, isPending] = useActionState(
    createPropertyAction,
    initialPropertyActionState
  );

  return (
    <form action={formAction}>
      {state.message && <ErrorAlert>{state.message}</ErrorAlert>}
      <Input name="propertyName" error={state.fieldErrors?.propertyName?.[0]} />
      <Button type="submit" isLoading={isPending}>Save</Button>
    </form>
  );
}
```

**UI Component Composition:**
- Props for label, error, helperText, disabled, required
- Consistent styling via Tailwind classes
- Accessibility: aria-invalid, aria-describedby
- No logic; pure presentation

### 7.2 Hook Patterns

**useActionState (React 19):**
- Standard hook for form submission
- Returns [state, formAction, isPending]
- State includes ok, message, fieldErrors
- formAction passed to form's action prop

**usePathname:**
- Get current route path
- Used for active nav item highlighting

**useState:**
- Minimal use; only for UI state (dropdown open, selected option)
- Not for data (data fetched server-side)

**No custom hooks:**
- Framework leverages server actions and built-in hooks
- Data fetching happens in async server components

### 7.3 Utility/Helper Patterns

**Money Formatting:**
```typescript
// src/server/utils/money.ts
formatNaira(1000) // "₦1,000.00"
formatNairaCompact(1000) // "₦1,000"
convertNairaToKobo(100) // 10000
```

**Phone Normalization:**
```typescript
// src/server/utils/phone.ts
normalisePhoneNumber("07012345678")
// { e164: "+2347012345678", local: "07012345678", national: "2347012345678" }

maskPhoneNumber("+2347012345678")
// "+2347012****56"
```

**Date Calculations:**
```typescript
// src/lib/tenancy-period.ts
calculateTenancyEndDate("2024-01-15", "annual") // "2025-01-14"
getRentAnchorDay("2024-01-15") // 15
```

**CSS Utility (cn):**
```typescript
import { cn } from "@/lib/cn";

cn("base-class", condition && "conditional-class", customClass)
// Uses clsx for truthiness, tailwind-merge for duplication
```

**Status/Copy Mapping:**
```typescript
// src/lib/status-copy.ts
TENANCY_STATUS_COPY["active"]
// { label: "Active", tone: "success" }
```

### 7.4 Service Abstraction Patterns

**Three-Layer Pattern (Repository → Service → Action):**

1. **Repository (Data Access):**
   ```typescript
   // src/server/repositories/properties.repository.ts
   export async function createProperty(
     supabase: SupabaseClient,
     landlordId: string,
     input: CreatePropertyInput,
   ) {
     const { data, error } = await supabase.from("properties").insert(...);
     if (error) throw error;
     return data;
   }
   ```

2. **Service (Business Logic):**
   ```typescript
   // src/server/services/properties.service.ts
   export async function createPropertyForCurrentLandlord(
     input: CreatePropertyInput
   ) {
     const landlord = await requireLandlord();
     const supabase = await createSupabaseServerClient();
     const property = await createProperty(supabase, landlord.id, input);
     
     await writeAuditLog({
       landlordId: landlord.id,
       eventType: "property.created",
       entityId: property.id,
       // ...
     });
     
     return property;
   }
   ```

3. **Action (Form Handler):**
   ```typescript
   // src/actions/properties.actions.ts
   export async function createPropertyAction(
     _previousState: PropertyActionState,
     formData: FormData,
   ): Promise<PropertyActionState> {
     try {
       const parsed = createPropertySchema.parse({
         propertyName: formData.get("propertyName"),
         // ...
       });
       const property = await createPropertyForCurrentLandlord(parsed);
       revalidatePath("/properties");
       redirect(`/properties/${property.id}`);
     } catch (error) {
       const result = errorResult(error);
       return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
     }
   }
   ```

**Key Separation:**
- Repositories: Supabase queries only
- Services: Auth checks, permission checks, workflows, audit logging
- Actions: FormData parsing, error handling, revalidation

### 7.5 Form Handling Patterns

**Server Action with Zod Validation:**
```typescript
"use server";

export async function submitAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = mySchema.parse({
      field1: formData.get("field1"),
      field2: formData.get("field2"),
    });
    
    const result = await myService.process(parsed);
    revalidatePath("/page");
    return { ok: true, message: "Success" };
  } catch (error) {
    return { ok: false, message: "Error", fieldErrors: {...} };
  }
}
```

**Client Form Component:**
```typescript
"use client";

export function MyForm() {
  const [state, formAction, isPending] = useActionState(
    submitAction,
    initialState
  );

  return (
    <form action={formAction}>
      <Input
        name="field1"
        error={state.fieldErrors?.field1?.[0]}
      />
      <Button type="submit" isLoading={isPending}>Submit</Button>
      {state.message && (
        state.ok ? <SuccessAlert /> : <ErrorAlert />
      )}
    </form>
  );
}
```

**Key Patterns:**
- No client-side validation (validation is server-side)
- FormData passed directly (no JSON serialization)
- Field errors keyed by field name
- Single form action function per form

### 7.6 Table/List Rendering Patterns

**Server-Side Data Fetching:**
```typescript
export default async function PropertiesPage() {
  const properties = await getCurrentLandlordProperties();

  return (
    <div className="space-y-4">
      {properties.length === 0 ? (
        <EmptyState title="No properties" />
      ) : (
        properties.map(property => (
          <PropertyCard key={property.id} property={property} />
        ))
      )}
    </div>
  );
}
```

**No Client-Side Pagination:**
- Lists fetch all data at once
- Page loads with complete dataset
- No lazy-loading or pagination UI

### 7.7 Modal/Dialog Patterns

**Uses form actions + action state:**
```typescript
// Client component with modal UI
const [state, formAction, isPending] = useActionState(modalAction, initialState);

return (
  <dialog open={isOpen}>
    <form action={formAction}>
      {/* form fields */}
      <button type="submit" disabled={isPending}>Save</button>
    </form>
  </dialog>
);
```

**No separate modal library:**
- Uses native HTML `<dialog>` or custom div with visibility state
- Form submission triggers action
- Success closes modal + revalidates data

### 7.8 Offline/Queue/Sync Patterns

**Idempotency Key Pattern:**
```typescript
// Client generates UUID
const idempotencyKey = crypto.randomUUID();

// Server action receives it
export async function recordPaymentAction(...) {
  const idempotencyKey = formData.get("idempotencyKey");
  
  // Pass to service
  const paymentId = await recordManualRentPaymentViaRpc(supabase, {
    idempotencyKey,
    // ...
  });
}

// RPC function ensures duplicate requests don't create duplicate records
```

**Background Job Pattern (Inngest):**
```typescript
// Scheduled cron job
// POST /api/cron/rent-charges → triggers rent charge posting
// POST /api/cron/renewal-reminders → triggers renewal notifications

// Run daily via Vercel cron (vercel.json)
```

**No offline support:**
- All operations require server
- No service worker/background sync
- Network dependency assumed

---

## 8. Styling / Design System Rules

### 8.1 Theme Philosophy

**Color System (Tailwind Custom Colors):**
- **Primary**: #1B4FD8 (strong blue for CTAs, navigation)
- **Gold**: #F6B73C (accent, success-adjacent)
- **Success**: #16A34A (positive actions, confirmations)
- **Warning**: #D97706 (caution, attention-needed)
- **Danger**: #DC2626 (destructive actions, errors)
- **Text**:
  - Strong: #111827 (headings, primary text)
  - Normal: #374151 (body text)
  - Muted: #6B7280 (helper text, metadata)
- **Background**: #F8F7F4 (page background, warm off-white)
- **Surface**: #FFFFFF (cards, panels, input backgrounds)
- **Border**: #E7E5DF (soft borders, dividers)

**Soft Variants:**
- primary-soft, gold-soft, success-soft, warning-soft, danger-soft
- 10-15% opacity overlays for backgrounds

### 8.2 Color Usage Rules

- **Primary Blue**: Main CTAs (Save, Submit), navigation active states, focus rings
- **Gold**: Secondary emphasis, statistic highlights, success tones for gold-related (earnings, bonuses)
- **Success Green**: Positive statuses (Active, Approved), checkmarks
- **Warning Amber**: Caution statuses (Pending, Renewal Soon), alert backgrounds
- **Danger Red**: Destructive actions (Delete, Archive), error states, danger statuses (Rejected, Failed)
- **Text Colors**: Use text-strong for headings, text-normal for body, text-muted for hints
- **Backgrounds**: Background for page, surface for cards/inputs, soft variants for highlighted sections

### 8.3 Typography Rules

**Font Family**: Plus Jakarta Sans (Google Fonts, 400/500/600/700/800 weights)

**Hierarchy:**
- **Page Titles**: text-4xl/5xl/6xl, font-extrabold, text-text-strong
- **Section Headers**: text-lg, font-bold, text-text-strong
- **Card Headers**: text-lg, font-bold
- **Body Text**: text-base/sm, font-normal, text-text-normal
- **Helper/Meta**: text-xs/sm, text-text-muted
- **Button**: text-sm, font-semibold

**Font Weights:**
- 400: Body text
- 500: Emphasized body, labels
- 600: Card titles, button text
- 700/800: Headings, strong emphasis

### 8.4 Spacing Conventions

**Scale** (Tailwind default):
- xs: 0.5rem (8px)
- sm: 1rem (16px)
- md: 1.5rem (24px)
- lg: 2rem (32px)
- xl: 2.5rem (40px)
- 2xl: 3rem (48px)

**Layout Spacing:**
- **Page Padding**: px-4 md:px-8 (mobile vs desktop)
- **Page Top/Bottom**: py-8 lg:py-10
- **Card Padding**: p-5 md:p-6
- **Section Gap**: gap-4 or gap-6
- **Form Fields**: space-y-4
- **Card Footer Border**: border-t border-border-soft pt-5 mt-6

### 8.5 Layout/Grid Rules

**Responsive Breakpoints** (Tailwind sm/md/lg/xl/2xl):
- **Mobile**: Default (full width)
- **Tablet** (md): 2-column grids
- **Desktop** (lg): 3-5 column grids
- **Wide** (xl): Sidebar + content (fixed sidebar width)

**Sidebar Width**: w-72 (18rem)

**Max Width**: max-w-7xl for main content container

**Grid Patterns:**
- Properties: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Stats: `grid-cols-1 md:grid-cols-2 xl:grid-cols-5`
- Form inputs: `md:grid-cols-2` for grouped fields

### 8.6 Card/Button/Input Styles

**Card:**
- Base: `rounded-card bg-surface p-5 shadow-card md:p-6`
- Sections: `rounded-card border border-border-soft bg-white px-5 py-6 lg:px-8`
- Hover cards: `rounded-card transition hover:-translate-y-0.5` (lift on hover)

**Button:**
- **Variants**:
  - Primary: `bg-primary text-white shadow-soft hover:bg-primary-hover`
  - Secondary: `bg-surface text-text-strong shadow-soft ring-1 ring-border-soft hover:bg-primary-soft`
  - Danger: `bg-danger text-white shadow-soft hover:bg-red-700`
  - Ghost: `bg-transparent text-text-normal hover:bg-primary-soft`
- **Sizes**:
  - sm: `min-h-10 px-4 py-2 text-sm`
  - md: `min-h-11 px-5 py-2.5 text-sm`
  - lg: `min-h-12 px-6 py-3 text-base`
- **States**:
  - Loading: Shows spinner, disabled
  - Disabled: opacity-50, cursor-not-allowed

**Input:**
- Base: `min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3 text-base text-text-strong`
- Focus: `focus:border-primary focus:ring-2 focus:ring-primary-soft`
- Error: `border-danger focus:border-danger focus:ring-danger-soft`
- Disabled: `disabled:cursor-not-allowed disabled:bg-background disabled:text-text-muted`

**Select/Textarea:**
- Match input styles (same border, focus, error states)

### 8.7 Responsive Design Approach

**Mobile-First:**
- Default styles are mobile
- Use `md:`, `lg:`, `xl:` for larger screens
- No mobile-only classes (use responsive visibility rarely)

**Layout Adjustments:**
- Sidebar: Hidden on mobile (lg:block), replaced with mobile menu
- Grids: 1 column on mobile, 2-3 on tablet, 3-5 on desktop
- Padding: Smaller on mobile, larger on desktop
- Text: Default sizes fine; no text-shrinking on mobile

### 8.8 Animation/Motion Conventions

**Subtle Transitions:**
- `transition duration-200` on interactive elements
- Hover states: `-translate-y-0.5` (lift), `bg-color` change
- Focus: Ring with 2px offset
- Loading: Spinner (border-2 border-current border-t-transparent animate-spin)

**No Heavy Animations:**
- No animations on page load
- No confetti, pop-ins, or slide-ins
- Transitions are 200ms or less

**Disabled State Animation:**
- All buttons show disabled state smoothly
- Loading spinner indicates pending action

---

## 9. Naming Conventions

### 9.1 File Naming Conventions

**Server Actions:**
- `{domain}.actions.ts` (e.g., `properties.actions.ts`)
- Function: `{verb}{domain}{context}Action` (e.g., `createPropertyAction`)
- State: `{domain}.state.ts`, type: `{Domain}ActionState`

**Services:**
- `{domain}.service.ts` (e.g., `properties.service.ts`)
- Function: `{verb}{domain}For{context}` (e.g., `createPropertyForCurrentLandlord`)

**Repositories:**
- `{domain}.repository.ts` (e.g., `properties.repository.ts`)
- Function: `{verb}{domain}` (e.g., `createProperty`)
- Row type: `{Domain}Row` (e.g., `PropertyRow`)

**Validators:**
- `{domain}.schema.ts` (e.g., `property.schema.ts`)
- Schema: `{create|update}{domain}Schema` (e.g., `createPropertySchema`)
- Type: `{Create|Update}{domain}Input` (e.g., `CreatePropertyInput`)

**Components:**
- `{domain}-{sub}.tsx` (e.g., `property-form.tsx`, `property-card.tsx`)
- PascalCase: `export function PropertyForm()`
- Props: `{Domain}{Sub}Props` (e.g., `PropertyFormProps`)

**Utils:**
- `{purpose}.ts` (e.g., `money.ts`, `phone.ts`)
- Function: `{verb}{purpose}` or `{purpose}{verb}` (e.g., `formatNaira`, `normalisePhoneNumber`)

### 9.2 Component Naming Conventions

- PascalCase function/export name
- `Props` interface: `{ComponentName}Props`
- No "Component" suffix (use "Form", "Card", "List", etc.)
- UI components: Simple names (Button, Input, Card)
- Feature components: Descriptive (PropertyCard, TenantForm, PaymentModal)

### 9.3 Hook Naming Conventions

- Start with `use` prefix
- Examples: `useActionState`, `usePathname`, `useState`, `useEffect`
- Custom hooks rare (framework uses server-side data fetching)

### 9.4 Variable/Function Naming Rules

**Constants:**
- UPPER_SNAKE_CASE (e.g., `OTP_LENGTH`, `MAX_REQUESTS`)

**Types/Interfaces:**
- PascalCase (e.g., `UserRole`, `PropertyRow`, `ActionResult`)

**Variables/Functions:**
- camelCase (e.g., `landlordId`, `createProperty`, `formatNaira`)

**Private Functions (Services/Utils):**
- Prefix with underscore if truly internal (rare; prefer clear exports)
- More common: prefix with `to` or `get` (e.g., `toActionError`, `getPostLoginRedirect`)

**Event Handlers:**
- `handle{Event}` (e.g., `handleSubmit`, `onClick`) in client components
- In server actions: function name is sufficient (e.g., `createPropertyAction`)

**Boolean Variables:**
- Prefix with `is`, `has`, `can`, `should` (e.g., `isActive`, `hasError`, `canDelete`)

### 9.5 Database/Table Naming Rules

- **Tables**: snake_case, plural (e.g., `properties`, `tenants`, `rent_payments`)
- **Columns**: snake_case (e.g., `landlord_id`, `property_name`, `created_at`)
- **Foreign Keys**: `{table}_id` (e.g., `property_id`, `tenant_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at`, `archived_at`, `verified_at`
- **Status Columns**: `status` (enum), e.g., `status: 'active' | 'archived'`
- **Soft Deletes**: `deleted_at` (null = active), `archived_at` (null = active)
- **Numeric Types**: Balance fields as `numeric(19,2)` for currency

---

## 10. Data Models / Schemas

### 10.1 Core Entities & Relationships

**Profiles Table:**
```sql
profiles (
  id UUID primary key (Supabase auth user),
  role: 'landlord' | 'tenant' | 'agent' | 'caretaker',
  full_name VARCHAR,
  phone_number VARCHAR (E.164 format),
  email VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Properties Table:**
```sql
properties (
  id UUID primary key,
  landlord_id UUID (FK profiles),
  property_name VARCHAR,
  address VARCHAR,
  state VARCHAR (e.g., "Lagos"),
  lga VARCHAR (Local Government Area, e.g., "Lagos Island"),
  property_type: 'residential' | 'residential_compound' | 'flat_complex' | 'mixed_use',
  country_code VARCHAR(2) default 'NG',
  currency_code VARCHAR(3) default 'NGN',
  created_at TIMESTAMP,
  archived_at TIMESTAMP (null = active),
  deleted_at TIMESTAMP (null = active)
)
```

**Units Table:**
```sql
units (
  id UUID primary key,
  property_id UUID (FK properties),
  landlord_id UUID (FK profiles),
  unit_identifier VARCHAR (e.g., "Flat A", "Room 101"),
  building_name VARCHAR (optional),
  unit_type VARCHAR (e.g., "flat", "room", "shop"),
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved',
  created_at TIMESTAMP,
  archived_at TIMESTAMP (null = active)
)
```

**Tenants Table:**
```sql
tenants (
  id UUID primary key,
  landlord_id UUID (FK profiles),
  full_name VARCHAR,
  phone_number VARCHAR (E.164),
  email VARCHAR (optional),
  date_of_birth DATE (optional),
  home_address VARCHAR (optional),
  occupation VARCHAR (optional),
  employer VARCHAR (optional),
  landlord_notes TEXT (optional),
  onboarding_status: 'invited' | 'profile_complete' | 'approved' | 'rejected' | 'token_expired',
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  archived_at TIMESTAMP (null = active)
)
```

**Tenancies Table (Leases):**
```sql
tenancies (
  id UUID primary key,
  tenancy_reference VARCHAR (optional, e.g., "TEN-001"),
  landlord_id UUID (FK profiles),
  tenant_id UUID (FK tenants),
  unit_id UUID (FK units),
  rent_amount NUMERIC(19,2),
  payment_frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual',
  currency_code VARCHAR(3) default 'NGN',
  start_date DATE,
  end_date DATE (calculated from start + frequency),
  move_out_date DATE (optional),
  renewal_notice_date DATE (optional),
  rent_due_day INT (1-31; day of month payment is due),
  rent_anchor_month INT (optional; month for non-monthly frequencies),
  current_period_start DATE,
  current_period_end DATE,
  next_rent_charge_date DATE,
  opening_balance NUMERIC(19,2) default 0,
  opening_balance_note TEXT (optional),
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'archived' | null,
  agreement_notes TEXT (optional),
  archived_at TIMESTAMP (null = active),
  created_at TIMESTAMP
)
```

**Rent Payments Table:**
```sql
rent_payments (
  id UUID primary key,
  landlord_id UUID (FK profiles),
  tenant_id UUID (FK tenants),
  tenancy_id UUID (FK tenancies),
  receipt_number VARCHAR (optional, generated),
  amount_paid NUMERIC(19,2),
  expected_period_amount NUMERIC(19,2),
  currency_code VARCHAR(3),
  payment_method: 'bank_transfer' | 'cash' | 'other' | 'paystack_gateway',
  payment_reference VARCHAR (optional; bank ref, Paystack ref),
  payment_date DATE,
  payment_for_period_start DATE (optional),
  payment_for_period_end DATE (optional),
  is_partial BOOLEAN,
  balance_before NUMERIC(19,2),
  balance_after NUMERIC(19,2),
  verified_by_landlord BOOLEAN,
  verified_at TIMESTAMP (optional),
  receipt_status: 'pending' | 'generated' | 'failed' | 'voided',
  receipt_generated BOOLEAN,
  receipt_path VARCHAR (optional; S3 path),
  notes TEXT (optional),
  idempotency_key UUID (unique; prevents duplicates),
  status: 'posted' | 'reversed',
  created_at TIMESTAMP
)
```

**Tenancy Agreements Table:**
```sql
tenancy_agreements (
  id UUID primary key,
  tenancy_id UUID (FK tenancies),
  landlord_id UUID (FK profiles),
  tenant_id UUID (FK tenants),
  agreement_status: 'draft' | 'finalized' | 'accepted',
  document_snapshot JSONB (template + filled values),
  guarantor_required BOOLEAN,
  guarantor_approved BOOLEAN (optional),
  acceptance_token_hash VARCHAR (sha256 hash),
  acceptance_token_expiry TIMESTAMP,
  accepted_at TIMESTAMP (optional),
  created_at TIMESTAMP
)
```

**Quit Notices Table:**
```sql
quit_notices (
  id UUID primary key,
  tenancy_id UUID (FK tenancies),
  tenant_id UUID (FK tenants),
  landlord_id UUID (FK profiles),
  notice_type: 'landlord_quit_notice' | 'tenant_move_out_request',
  notice_date DATE,
  vacate_by_date DATE,
  actual_move_out_date DATE (optional),
  reason TEXT,
  landlord_notes TEXT (optional),
  status: 'drafted' | 'issued' | 'acknowledged' | 'move_out_confirmed' | 'withdrawn',
  delivery_method: 'whatsapp' | 'sms' | 'email' | 'in_person',
  pdf_path VARCHAR (optional; S3 path),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Audit Logs Table:**
```sql
audit_logs (
  id UUID primary key,
  landlord_id UUID (FK profiles, optional),
  tenant_id UUID (FK tenants, optional),
  tenancy_id UUID (FK tenancies, optional),
  property_id UUID (FK properties, optional),
  actor_profile_id UUID (FK profiles; who performed action),
  actor_role: 'system' | 'landlord' | 'tenant',
  event_type VARCHAR (e.g., "property.created", "payment.recorded"),
  entity_type VARCHAR (e.g., "property", "payment", "tenant"),
  entity_id UUID (the affected record),
  description TEXT (human-readable),
  metadata JSONB (additional context),
  created_at TIMESTAMP
)
```

**Ledger Table (Tenant Balance Tracking):**
```sql
ledger_entries (
  id UUID primary key,
  tenancy_id UUID (FK tenancies),
  entry_type: 'charge' | 'payment' | 'adjustment',
  amount NUMERIC(19,2),
  balance_after NUMERIC(19,2),
  transaction_date DATE,
  notes TEXT (optional),
  created_at TIMESTAMP
)
```

**Agent Tables:**
```sql
agent_profiles (
  id UUID primary key (= profile.id),
  business_name VARCHAR,
  business_phone VARCHAR,
  service_state VARCHAR,
  service_lga VARCHAR,
  business_address VARCHAR,
  profile_complete BOOLEAN,
  created_at TIMESTAMP
)

agent_property_listings (
  id UUID primary key,
  agent_id UUID (FK profiles),
  property_id UUID (FK properties),
  status: 'pending' | 'landlord_verified' | 'converted' | 'rejected' | 'archived',
  created_at TIMESTAMP
)

agent_paystack_accounts (
  id UUID primary key,
  agent_id UUID (FK profiles),
  bank_code VARCHAR,
  bank_name VARCHAR,
  account_number VARCHAR,
  business_name VARCHAR,
  created_at TIMESTAMP,
  verified_at TIMESTAMP (optional)
)
```

**Gateway Payment Intents (Paystack):**
```sql
gateway_payment_intents (
  id UUID primary key,
  reference VARCHAR (unique; Paystack reference),
  landlord_id UUID (FK profiles),
  tenant_id UUID (FK tenants),
  tenancy_id UUID (FK tenancies),
  status: 'initialized' | 'pending' | 'paid' | 'failed' | 'abandoned',
  amount_naira NUMERIC(19,2),
  amount_kobo INT (amount * 100; Paystack units),
  metadata JSONB (tenancy_id, tenant_id, landlord_id, etc.),
  payment_url VARCHAR (Paystack checkout URL),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 10.2 Key Relationships

```
Profiles (landlord, tenant, agent, caretaker)
  ├── Properties (1:many landlord)
  │   └── Units (1:many property)
  │       └── Tenancies (1:many unit)
  │           ├── Rent Payments (1:many)
  │           ├── Tenancy Agreements (1:1)
  │           ├── Quit Notices (1:many)
  │           └── Ledger Entries (1:many)
  │
  ├── Tenants (1:many landlord)
  │   ├── Tenancies (1:many)
  │   ├── Guarantors (1:many)
  │   └── Tenant Activation (1:1)
  │
  ├── Audit Logs (1:many landlord)
  │
  └── Agent-Specific Tables
      ├── Agent Profiles
      ├── Property Listings
      └── Paystack Accounts
```

---

## 11. Important Constraints / Non-Negotiables

### 11.1 Architecture Decisions

1. **Server-First by Default**: Page components are server components. Components must prove they need interactivity before becoming client components.

2. **No State Management Library**: Use server actions + `useActionState` for all form mutations. Data flows server→client as props.

3. **Server Actions as API**: No separate REST/GraphQL API. Server actions are the only mutation interface.

4. **Zod for All Validation**: Every form input must be validated with a Zod schema. Client-side validation is optional; server validation is mandatory.

5. **Three-Layer Service Pattern**: Repository → Service → Action. DO NOT call repositories from actions directly; always route through services.

6. **Audit Everything Critical**: Properties, tenants, tenancies, payments, approvals, rejections, terminations, agreements must be logged.

7. **Role-Based Access Control (RBAC)**: Every service function accessing user data must call `requireLandlord()`, `requireAgent()`, `requireTenant()`, etc. first.

8. **Soft Deletes**: Never hard-delete records. Use `archived_at` or `deleted_at` timestamps. Query filters must check `.is("archived_at", null)`.

9. **Idempotency Keys**: Payment operations must use idempotency keys to prevent duplicate recording.

10. **Supabase Client Setup**: Use `createSupabaseServerClient()` for authenticated requests; `createSupabaseAdminClient()` only for system/background operations.

11. **FormData-Based Forms**: All forms submit FormData, not JSON. Actions parse FormData with Zod.

12. **Revalidation on Mutation**: Every successful mutation must call `revalidatePath()` to refresh server-rendered data.

13. **WhatsApp-First Communication**: Tenant notifications prioritize WhatsApp; SMS/email are fallbacks.

14. **Nigeria-Centric**: Assume NGN currency, Nigerian states, E.164 phone numbers (+234), WhatsApp as primary channel.

15. **Permissions Matrix**: Permissions are tied to roles. Check APP_PERMISSIONS constants; don't hardcode permission logic.

### 11.2 Code Style & Quality Standards

1. **TypeScript Strict Mode**: `strict: true` in tsconfig.json. No `any` types unless absolutely necessary.

2. **ESLint/Prettier**: All code must pass ESLint + Prettier checks. Use `npm run lint` before commit.

3. **Error Messages for Users**: `errorResult()` returns user-friendly messages. Never expose stack traces.

4. **Consistent Error Handling**: Use `AppError` for app-level errors, throw for repository errors, catch and transform in actions.

5. **Descriptive Variable Names**: No single-letter variables except loops. `landlordId` not `lId`.

6. **Immutable State**: Don't mutate objects; use spread operator or create new objects.

7. **Server-Only Marker**: Services must have `import "server-only"` at the top.

8. **Function Overloading**: Prefer optional parameters over function overloads.

9. **Comments for Why, Not What**: Code should be self-documenting; comments explain "why" decisions, not "what" code does.

10. **Consistent Formatting**: 2-space indentation, semicolons at end of statements.

### 11.3 Database Constraints

1. **Primary Keys**: Always UUID, never auto-increment.

2. **Timestamps**: `created_at` (required, immutable), `updated_at` (optional), `deleted_at`/`archived_at` for soft deletes.

3. **Foreign Keys**: Always include, with cascade delete if appropriate (mostly use "no action" for audit trail).

4. **Unique Constraints**: Idempotency keys must be unique; phone numbers must be unique per context.

5. **Check Constraints**: Validate domain rules at database level (e.g., rent_amount > 0).

6. **Indexes**: Landlord ID, tenant ID, created_at should be indexed for fast queries.

### 11.4 Security & Privacy

1. **Password Hashing**: Supabase Auth handles hashing; never hash manually.

2. **Sensitive Data**: Never log passwords, OTP codes, payment tokens, SSNs.

3. **Row-Level Security (RLS)**: Supabase RLS policies must enforce landlord data isolation.

4. **Session Validation**: Call `requireUser()` in every service that accesses user data.

5. **Rate Limiting**: OTP requests limited to 3 per 15 minutes. Payment initialization throttled.

6. **Secure Tokens**: Use `generateSecureToken()` for sensitive operations (agreement acceptance, tenant activation).

7. **Signed URLs**: All S3/storage URLs must be signed with expiry.

8. **Environment Variables**: Never commit secrets. Use `.env.local`, never `.env`.

---

## 12. Known Technical Debt / Caveats

### 12.1 Incomplete Features

1. **Renewals Service**: `renewals.service.ts` is empty. Renewal workflows partially scaffolded in components but lack business logic.

2. **WhatsApp Integration**: `whatsapp.service.ts` is empty. WhatsApp delivery uses Supabase messaging (TBD) instead of dedicated service.

3. **Notification Queue**: `notification-queue.service.ts` is empty. Notifications are sent inline; should be queued for reliability.

4. **Caretaker Workflow**: Permission model exists but enforcement not implemented. Caretaker data access not fully authorized.

5. **Reports**: UI placeholders exist; no report generation or export logic.

6. **SMS Notifications**: Type exists in constants; no SMS dispatch service.

7. **Multi-Currency**: Schema supports it; only NGN validated/tested.

### 12.2 Known Bugs / Limitations

1. **Large Dataset Handling**: Lists load all records at once (no pagination). May slow with thousands of records.

2. **Payment Period Allocation**: Partial payments aren't automatically allocated to periods. Manual mapping required.

3. **Renewal Calculation**: Renewal dates calculated simply (startDate + frequency). Complex scenarios (midyear start, leap years) not thoroughly tested.

4. **Offline Support**: No offline mode. All operations require network.

5. **Email Delivery**: Resend integration exists but not fully utilized. Most notifications via WhatsApp.

### 12.3 Technical Debt

1. **Database Migrations**: Migrations folder empty. Schema managed via Supabase dashboard. Should migrate to migration files for versioning.

2. **Inngest Jobs**: Framework set up but only 2 cron jobs implemented. More async workflows should use Inngest.

3. **Type Safety in Repositories**: Supabase queries use `.returns<RowType>()` to specify return type. Type inference could be improved.

4. **Error Messages**: Some generic "Something went wrong" messages. Should map more database errors to user-friendly descriptions.

5. **Form Validation**: Client-side validation optional; leads to unnecessary server round trips for obvious errors.

6. **Component Composition**: Some form components have deep prop drilling. Could benefit from compound component pattern.

7. **PDF Services**: Receipt, agreement, quit notice PDFs are React components (TSX). Should consider templating language for maintainability.

8. **Testing**: No unit, integration, or E2E tests. QA is manual.

### 12.4 Performance Caveats

1. **N+1 Queries**: Some services fetch parent, then loop to fetch children. Could optimize with nested queries.

2. **Memory in Server Actions**: Large datasets loaded into memory before filtering. Should paginate or stream.

3. **Image Optimization**: No image optimization (no next/image). Static images in public folder.

4. **Font Loading**: Plus Jakarta Sans loaded via Google Fonts. Consider self-hosting for faster load.

5. **CSS Optimization**: Tailwind full config sent to client. Could enable JIT purging further.

### 12.5 Deployment Caveats

1. **Cron Jobs**: Vercel cron requires paid plan. Free tier won't execute cron jobs.

2. **Environment Variables**: All required env vars must be set in Vercel dashboard. Check `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

3. **Supabase RLS**: Database requires RLS policies to be enabled. Must be configured in Supabase dashboard.

4. **Storage Policies**: Supabase storage must have policies allowing authenticated users to upload/download files.

5. **Email/WhatsApp Secrets**: Resend API key, WhatsApp business account token must be in environment.

---

## 13. Pending Roadmap

### Phase 1 (Foundation - Complete)
- ✅ Authentication (phone/password + OTP)
- ✅ Property & unit management
- ✅ Tenant onboarding & approval
- ✅ Tenancy/lease creation & tracking
- ✅ Manual payment recording
- ✅ Receipt generation & delivery
- ✅ Audit logging

### Phase 2 (Payment Gateway - Partial)
- ✅ Paystack integration
- ✅ Payment initialization & verification
- ✅ App fee deduction
- ⚠️ Bulk payment batch (designed, not implemented)
- ⚠️ Payment reversal (designed, not fully tested)

### Phase 3 (Advanced Workflows - Partial)
- ✅ Tenancy agreement generation
- ✅ Tenant acceptance workflow
- ✅ Quit notice & move-out
- ⚠️ Renewal management (scaffolded, logic missing)
- ⚠️ Caretaker delegation (framework only)

### Phase 4 (Agent Features - Partial)
- ✅ Agent profile setup
- ✅ Bank account linking
- ✅ Property listing submission
- ✅ Tenant onboarding facilitation
- ⚠️ Commission tracking (basic)
- ⚠️ Earnings payout (Paystack transfer, not implemented)

### Phase 5 (Enhancements - Not Started)
- ☐ Reports & analytics dashboard
- ☐ SMS notifications
- ☐ Email notifications
- ☐ Bulk invite tenants
- ☐ Export data (CSV/Excel)
- ☐ Recurring payment rules
- ☐ Property rules enforcement
- ☐ Advanced ledger/balance reports
- ☐ Mobile app (React Native)
- ☐ Multi-property dashboard for caretakers

### Recommended Implementation Order
1. **Fix Renewals Service**: Complete renewal workflow logic (high priority, partially done)
2. **WhatsApp Integration**: Complete message delivery service
3. **Notification Queue**: Implement background job processing for reliability
4. **Database Migrations**: Migrate to versioned migration files
5. **Caretaker Workflows**: Implement authorization & data access for caretakers
6. **Reports Dashboard**: Add reporting & export features
7. **Bulk Operations**: Add bulk tenant invite, bulk payment recording
8. **Testing**: Add unit & integration test coverage
9. **Performance**: Optimize N+1 queries, pagination for large lists
10. **Mobile App**: Extend to React Native for tenant/agent mobile access

---

## 14. Continuation Instructions For Next AI

### 14.1 What to Preserve

1. **Architecture Pattern**: Server actions + service + repository pattern is non-negotiable. Do not introduce Redux, Zustand, or context-based state.

2. **RBAC**: Permission checking in services (not client) is mandatory. Do not move permission logic to frontend.

3. **Audit Logging**: All critical mutations must be logged. Do not skip audit logs for brevity.

4. **Error Handling**: Use `AppError` and `errorResult()` consistently. Do not expose stack traces to users.

5. **Zod Validation**: All form inputs validated server-side with Zod. Do not trust client-side validation.

6. **Soft Deletes**: Never hard-delete. Always use `archived_at`/`deleted_at`. Always filter soft-deleted records in queries.

7. **Idempotency**: Payment operations use idempotency keys. Do not remove them.

8. **Styling System**: Color, typography, spacing rules are defined. Maintain consistency; don't invent new patterns.

9. **Naming Conventions**: Follow established patterns (camelCase functions, snake_case tables, PascalCase components).

10. **Database Schema**: Existing table structure and relationships. Do not rename tables/columns without migration.

### 14.2 What to Avoid Changing

1. **Don't introduce a state manager** (Redux, Zustand, Jotai). Server actions are sufficient.

2. **Don't add client-side data fetching** (SWR, React Query). Server components handle data.

3. **Don't hardcode strings**. Use constants for status values, permissions, routes.

4. **Don't add new UI libraries** without strong justification. Tailwind + existing components sufficient.

5. **Don't split large forms into multi-step without clear UX benefit**. Keep forms simple.

6. **Don't remove audit logging** for performance. It's critical for compliance.

7. **Don't bypass permission checks**. Even "obvious" operations need `requireLandlord()`, etc.

8. **Don't store sensitive data in localStorage**. Supabase auth handles session.

9. **Don't use REST API routes** for data access. Use server actions.

10. **Don't remove type safety**. Keep TypeScript strict; avoid `any`.

### 14.3 Coding Standards to Maintain

1. **Server-First Mentality**: Default to server components. Prove client-side necessity.

2. **Clear Error Messages**: Every error must have a user-friendly message (not a code).

3. **Explicit Permissions**: Always call `requireLandlord()`, etc., even if you "know" the user is landlord.

4. **Descriptive Commits**: Commit messages explain "what" and "why", not "fixed bug".

5. **Code Review Checklist**:
   - [ ] Is this a server or client component? (correct choice justified)
   - [ ] Are all required permissions checked?
   - [ ] Is error handling appropriate?
   - [ ] Are field names follow conventions?
   - [ ] Is this change tested manually?
   - [ ] Does the audit log capture this action (if relevant)?
   - [ ] Is the change isolated (not a monolithic refactor)?

6. **Test Before Merge**: Manually test the feature end-to-end.

### 14.4 Refactor Philosophy

1. **Refactor Incrementally**: Make small, testable changes. Large refactors risk breaking existing functionality.

2. **Preserve Behavior**: Refactoring should not change what the app does, only how.

3. **Add Tests First**: Write tests before refactoring to ensure behavior is preserved.

4. **Communicate Changes**: Document why a refactor was needed (performance, maintainability, clarity).

5. **Avoid Premature Optimization**: Don't optimize until there's evidence of a problem.

6. **Extract When Duplication Appears**: DRY principle: extract utilities when logic repeats 3+ times.

### 14.5 Error Prevention Requirements

1. **Never Trust FormData**: Always validate with Zod; assume malicious input.

2. **Never Assume Session**: Always call `requireUser()` or role-specific require function.

3. **Never Skip Soft Delete Checks**: Queries must filter `.is("archived_at", null)`.

4. **Never Log Sensitive Data**: Don't log passwords, OTP codes, payment tokens.

5. **Never Break Backward Compatibility**: If changing a table schema, create a migration.

6. **Never Leave TODO Comments**: Address them before committing or create a GitHub issue.

7. **Never Disable TypeScript**: Keep `strict: true`.

8. **Never Commit Secrets**: Use `.env.local` only; never commit to git.

9. **Never Ignore Type Errors**: Fix them; don't suppress with `@ts-ignore`.

10. **Never Create Dead Code**: Remove unreachable code, unused variables, dead imports.

### 14.6 Feature Development Checklist

When adding a new feature, ensure:

- [ ] **Schema**: Database table designed (columns, types, constraints)
- [ ] **Types**: TypeScript types defined (Row type, Input type, State type)
- [ ] **Repository**: Data access functions (create, read, update, archive)
- [ ] **Service**: Business logic, auth checks, audit logging
- [ ] **Validator**: Zod schema for input validation
- [ ] **Action**: Server action handler parsing FormData
- [ ] **Component**: Form component + display component
- [ ] **Page**: Route created, integrated with layout
- [ ] **Tests**: Manual end-to-end test performed
- [ ] **Audit**: Critical mutations logged
- [ ] **Errors**: Appropriate error messages for user
- [ ] **Styling**: Component follows design system
- [ ] **Documentation**: Code comments for complex logic
- [ ] **Permissions**: RBAC properly enforced

### 14.7 Common Pitfalls & Solutions

**Pitfall**: Adding state manager for "ease"
**Solution**: Use server actions + server props. If UI state needed, use `useState`.

**Pitfall**: Bypassing permission checks for "admin" operations
**Solution**: RBAC always; create explicit admin role if needed.

**Pitfall**: Hardcoding status strings
**Solution**: Use constants (e.g., `TENANCY_STATUS_COPY`).

**Pitfall**: N+1 queries in loops
**Solution**: Use nested Supabase queries (e.g., `.select('*, units(*)')`) or batch operations.

**Pitfall**: Form field errors not displayed
**Solution**: Always pass `error={state.fieldErrors?.fieldName?.[0]}` to Input.

**Pitfall**: Soft-delete logic forgotten in queries
**Solution**: Add `.is("archived_at", null)` to all queries by default.

**Pitfall**: Audit log missing for important actions
**Solution**: Call `writeAuditLog()` after every mutation.

**Pitfall**: User-facing error message is a code
**Solution**: Use `AppError` with `userMessage`; map database codes to friendly messages.

---

## Appendix: Quick Reference

### File Structure Quick Lookup

```
Need to modify...            → File location
────────────────────────────────────────────────
Form submission logic        → src/actions/{domain}.actions.ts
Business logic               → src/server/services/{domain}.service.ts
Database queries             → src/server/repositories/{domain}.repository.ts
Input validation schema      → src/server/validators/{domain}.schema.ts
UI component                 → src/components/{domain}/{name}.tsx
Role/permission check        → src/server/constants/permissions.ts
Status display mapping       → src/lib/status-copy.ts
Formatting utilities         → src/server/utils/{purpose}.ts
Page/route                   → src/app/{route}/page.tsx
Layout/shell                 → src/components/layout/{name}-shell.tsx
```

### Key Imports Reference

```typescript
// Authorization
import { requireLandlord, requireAgent, requireTenant, requireCaretaker } from "@/server/services/auth.service";
import { assertRole, assertPermission, APP_PERMISSIONS } from "@/server/constants/permissions";

// Database
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

// Errors & Results
import { AppError } from "@/server/errors/app-error";
import { errorResult, successResult } from "@/server/errors/result";

// Validation
import { z } from "zod";

// Actions/Forms
import { useActionState } from "react";
import { revalidatePath } from "next/cache";

// UI
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Utilities
import { cn } from "@/lib/cn";
import { formatNaira } from "@/server/utils/money";
import { normalisePhoneNumber } from "@/server/utils/phone";
```

### Common Code Snippets

**Authorization Check in Service:**
```typescript
export async function myServiceFunction(input: MyInput) {
  const landlord = await requireLandlord();
  // Now use landlord.id for data access
}
```

**Audit Logging:**
```typescript
await writeAuditLog({
  landlordId: landlord.id,
  actorProfileId: landlord.id,
  actorRole: AUDIT_ACTOR_ROLES.landlord,
  eventType: AUDIT_EVENT_TYPES.propertyCreated,
  entityType: AUDIT_ENTITY_TYPES.property,
  entityId: property.id,
  description: "Property created.",
  metadata: { property_name: property.property_name },
});
```

**Server Action with Validation:**
```typescript
export async function myAction(_prev, formData): Promise<ActionState> {
  try {
    const parsed = mySchema.parse(Object.fromEntries(formData));
    const result = await myService.process(parsed);
    revalidatePath("/page");
    return { ok: true, message: "Success." };
  } catch (error) {
    const result = errorResult(error);
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
}
```

**Permission Check:**
```typescript
assertPermission(user.role, APP_PERMISSIONS.PROPERTY_CREATE);
// Throws AppError if user lacks permission
```

---

**END OF HANDOFF SPECIFICATION**

This document is comprehensive and self-contained. A new AI model should have sufficient detail to:
- Understand the architecture and data flow
- Implement new features following established patterns
- Maintain consistency with existing code
- Avoid architectural pitfalls
- Extend the system responsibly

**Last Updated**: May 10, 2026
**Project Status**: Active Development (70% feature complete)
**Next Priority**: Complete renewals service, finalize WhatsApp integration
