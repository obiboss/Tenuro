# PROJECT HANDOFF SPECIFICATION

## 1. Project Overview

**Project Name:** Tenuro

**Core Purpose:** A property and rent management platform designed specifically for Nigerian landlords to manage tenants, track rent payments, generate receipts, and maintain proper rental records without relying on notebooks or scattered WhatsApp messages.

**Target Users:**

- Nigerian landlords with single or multiple properties
- Property managers acting as caretakers
- Tenants activated via the platform
- Payment processors and integrations (Paystack)

**Business/Domain Context:**

- Solves the problem of disorganized rental record-keeping in Nigeria
- Targets informal property rental sector where digital records are lacking
- Integrates with Paystack for payment processing
- Supports multiple rent payment methods: bank transfers, cash, online payments
- Generates and distributes professional receipts via WhatsApp
- Supports rental agreement creation and management

**Product Philosophy/Design Philosophy/UX Principles:**

- **Trust & Clarity:** "Property records made simple" - builds trust with users through clear, organized information
- **Nigerian-First Design:** Uses Nigerian-specific context (phone numbers, states, LGAs, currency)
- **Simplicity Over Complexity:** Focus on core features: properties, tenants, rent, receipts, agreements
- **Mobile-Responsive:** Designed for mobile-first usage with sticky sidebar on desktop
- **Action-Oriented UI:** Each section has clear primary actions (Add Property, Add Tenant, Record Payment)
- **Progressive Disclosure:** Features introduced through onboarding journey and guided setup
- **Professional Appearance:** Modern design system with consistent colors, spacing, and typography

---

## 2. Tech Stack

**Frontend:**

- **Framework:** Next.js 16.2.4 (App Router)
- **Language:** TypeScript 5
- **React:** 19.2.4 (with React DOM 19.2.4)
- **Styling:** Tailwind CSS 4 with custom PostCSS
- **UI Component Library:** Custom components (no external UI library)
- **Icons:** Lucide React 1.11.0
- **Form Handling:** HTML5 forms with Server Actions and useActionState hook
- **PDF Rendering:** @react-pdf/renderer 4.5.1

**Backend:**

- **Runtime:** Node.js (Next.js API routes and Server Actions)
- **Server Framework:** Next.js Server Actions ("use server")
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Email/SMS:** Resend 6.12.2

**State Management:**

- **Client State:** None (form state via HTML forms + useActionState)
- **Server State:** Supabase real-time subscriptions (not currently in use for primary data flow)
- **State Patterns:** Action states (initial state → pending → result)

**Data Management:**

- **Database:** Supabase PostgreSQL
- **ORM/Query:** Supabase JS SDK with direct RPC calls and table queries
- **Data Validation:** Zod 4.3.6 (all inputs validated via schemas)

**Background Jobs:**

- **Job Queue:** Inngest 4.2.4 (configured but not fully active)
- **Scheduled Tasks:** Inngest for payments, receipts, renewals, notifications

**Third-Party Integrations:**

- **Payment Gateway:** Paystack (Nigerian payment processor)
- **Email:** Resend (email service)
- **Notifications:** Custom WhatsApp integration via Paystack
- **Cloud Storage:** Supabase Storage for documents, PDFs, photos

**Deployment/Infrastructure:**

- **Hosting:** Vercel (inferred from Next.js configuration)
- **Database:** Supabase (managed PostgreSQL)
- **Environment Variables:** Managed via Vercel/Supabase configs

**Build & Development:**

- **Build Tool:** Next.js built-in
- **Linting:** ESLint 9 with Prettier 3.8.3
- **TypeScript:** Strict mode enabled
- **Development Server:** Next.js dev server (`npm run dev`)

---

## 3. Architecture Overview

### High-Level Architecture Pattern

**Client → Server Action → Repository/Service → Database**

The application follows a **layered server-centric architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                  │
│  - React Components | Forms | useActionState Hook           │
├─────────────────────────────────────────────────────────────┤
│              Server Actions Layer (/actions)                │
│  - Entry points for all mutations                           │
│  - Form data parsing & validation via Zod schemas          │
│  - Error handling & result transformation                   │
├─────────────────────────────────────────────────────────────┤
│         Business Logic Layer (/server/services)            │
│  - Orchestrate repositories                                 │
│  - Implement business rules & authorization                 │
│  - Handle payment processing, PDF generation, etc.         │
├─────────────────────────────────────────────────────────────┤
│      Data Access Layer (/server/repositories)               │
│  - Type-safe Supabase queries                               │
│  - RPC calls for complex operations                         │
│  - SQL-level data transformations                           │
├─────────────────────────────────────────────────────────────┤
│               Supabase PostgreSQL Database                   │
│  - All data persistence                                     │
│  - RPC functions for complex operations                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

**Read Flow (Server Components):**

1. Server Component calls service directly
2. Service calls repository
3. Repository queries Supabase
4. Data returned and rendered in component

**Write Flow (Form Submission):**

1. Form submits to Server Action via `form action`
2. Server Action validates with Zod schema
3. Server Action calls service
4. Service calls repository for mutations
5. Repository executes RPC or direct insert/update
6. Result (ok/error) returned to client
7. Form state updated via `useActionState`
8. UI updates with ActionResultToast component

**Authentication Flow:**

1. Supabase Auth handles user registration/login
2. Auth creates session via JWT in cookies
3. `requireUser()` service checks session + profile
4. `requireLandlord()` or `requireTenant()` enforces role
5. Unauthorized access → redirect to /login

### Component Architecture Philosophy

**Server Components (Default):**

- Fetch data directly in components
- No JavaScript shipped to client
- Cannot use hooks (except async components)
- Used for: pages, layout, data fetching components

**Client Components ("use client"):**

- Handle interactivity and forms
- Use hooks (useState, useActionState, useEffect)
- Use "use client" directive at top
- Minimal JavaScript sent to client
- Used for: forms, buttons, interactive UI, navigation

**UI Component Pattern:**

- Reusable, presentational components
- Located in `src/components/ui/`
- Accept styled variants and sizes
- Fully styled with Tailwind
- No business logic
- Examples: Button, Input, Card, Badge

### State Management Architecture

**Form State Pattern:**

```typescript
// In actions.ts
export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { ok: false, message: "" };

export async function someAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // ... validation, service call
}
```

```typescript
// In component.tsx
"use client";

const [state, formAction, isPending] = useActionState(
  someAction,
  initialActionState,
);
```

**Why This Pattern:**

- No React state hooks needed for forms
- Server-side validation with Zod
- Automatic error display via fieldErrors
- ActionResultToast shows success/error message
- Idempotent operations via idempotencyKey

### API/Service Layer Structure

**Services Layer:**

- Located in `src/server/services/`
- Pure business logic
- All services prefixed with "use server"
- Handle authorization checks
- Orchestrate repositories
- Implement domain logic
- Examples:
  - `tenants.service.ts` - tenant CRUD logic
  - `payments.service.ts` - payment recording
  - `gateway-payment.service.ts` - Paystack integration
  - `receipts.service.ts` - receipt generation

**Repositories Layer:**

- Located in `src/server/repositories/`
- Data access only
- Type-safe Supabase queries
- SQL RPC calls
- No business logic
- No authorization (delegated to services)
- Examples:
  - `tenants.repository.ts` - tenant queries
  - `payments.repository.ts` - payment queries
  - `properties.repository.ts` - property queries

**Type System:**

- Row types mirror database tables: `TenantRow`, `PropertyRow`, etc.
- Separate input types for mutations: `CreatePropertyInput`, `UpdatePropertyInput`
- Types validated with Zod schemas

### Validation/Error Handling Approach

**Validation Layers:**

1. **Zod Schema Validation** (First Layer)
   - All FormData converted to objects and validated
   - Returns ZodError with fieldErrors
   - Example: `createPropertySchema.parse(data)`

2. **Business Logic Validation** (Second Layer)
   - Services check business rules
   - Example: "Can only record payment for active tenancy"
   - Throws AppError with specific code

3. **Authorization** (Third Layer)
   - `requireLandlord()` checks user is authenticated landlord
   - `requireTenant()` checks user is authenticated tenant
   - Services check landlord owns resource
   - Throws AppError with code "FORBIDDEN"

**Error Handling Pattern:**

```typescript
// In services
if (tenant.landlord_id !== landlord.id) {
  throw new AppError(
    "FORBIDDEN",
    "You do not have permission to view this tenant.",
    403,
  );
}

// In actions
try {
  const parsed = someSchema.parse(data);
  const result = await someService(parsed);
  revalidatePath("/some-path");
  return { ok: true, message: "Success" };
} catch (error) {
  const result = errorResult(error); // Converts AppError/ZodError to result
  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}
```

**Error Result Mapping:**

- `AppError` → user-friendly message + HTTP status
- `ZodError` → field-specific error messages
- Database errors → mapped to specific messages (constraint violations, etc.)
- Unknown errors → generic fallback message

---

## 4. Project Structure

### Root Level

```
tenuro/
├── src/                          # All source code
├── supabase/                     # Database migrations (currently empty)
├── public/                       # Static assets
├── eslint.config.mjs            # ESLint configuration
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS theme & colors
├── postcss.config.mjs           # PostCSS configuration
├── package.json                 # Dependencies and scripts
├── next-env.d.ts                # Next.js TypeScript definitions
├── AGENTS.md                    # AI agent rules (Breaking changes notice)
├── CLAUDE.md                    # References AGENTS.md
└── README.md                    # Basic project info
```

### `/src` Structure

#### `/src/app` - Next.js App Router Pages

```
app/
├── globals.css                  # Global styles (Tailwind imports)
├── layout.tsx                   # Root layout (html, body, fonts)
├── page.tsx                     # Home page (public landing page)
│
├── (auth)/                      # Auth pages group (no layout)
│   ├── layout.tsx              # Auth section layout
│   ├── login/page.tsx          # Login page
│   └── register/page.tsx       # Registration page
│
├── (landlord)/                  # Landlord dashboard group
│   ├── layout.tsx              # Landlord layout (AppShell)
│   ├── overview/page.tsx       # Dashboard overview
│   ├── properties/
│   │   ├── page.tsx            # List properties
│   │   ├── new/page.tsx        # Create property
│   │   └── [propertyId]/page.tsx # Property detail
│   ├── tenants/
│   │   ├── page.tsx            # List tenants
│   │   ├── new/page.tsx        # Create tenant
│   │   └── [tenantId]/page.tsx # Tenant detail
│   ├── payments/
│   │   ├── page.tsx            # Payment list & manual form
│   │   └── verify/page.tsx     # Payment verification
│   ├── renewals/page.tsx       # Renewals dashboard (stub)
│   ├── caretakers/page.tsx     # Caretakers management (stub)
│   ├── reports/page.tsx        # Reports dashboard (stub)
│   └── settings/page.tsx       # Landlord settings
│
├── (tenant)/                    # Tenant dashboard group
│   ├── layout.tsx              # Tenant layout
│   └── tenant/page.tsx         # Tenant dashboard
│
├── api/                        # API routes & webhooks
│   ├── inngest/route.ts        # Inngest jobs endpoint
│   ├── webhooks/
│   │   ├── paystack/route.ts   # Paystack webhook handler
│   │   └── whatsapp/route.ts   # WhatsApp webhook handler
│   ├── files/route.ts          # File uploads/downloads
│   ├── onboarding/route.ts     # Onboarding endpoints
│   └── cron/route.ts           # Scheduled tasks
│
├── app-fees/
│   └── verify/page.tsx         # App fee verification
│
├── auth/
│   └── callback/page.tsx       # OAuth callback handler
│
└── t/                          # Public tenant flows (no auth)
    ├── activate/[token]/page.tsx       # Tenant account activation
    ├── agreement/[token]/page.tsx      # Tenancy agreement signing
    ├── onboarding/[token]/page.tsx     # Tenant profile completion
    └── pay/[reference]/page.tsx        # Tenant payment page
```

#### `/src/actions` - Server Actions

Entry points for all data mutations. Each file handles one domain:

```
actions/
├── auth.actions.ts                     # Login, register, sign out, OTP
├── auth.state.ts                       # Initial auth state
├── tenants.actions.ts                  # Create, update, approve, reject tenant
├── tenant.state.ts                     # Tenant action initial state
├── properties.actions.ts               # Create, update, archive property
├── property.state.ts                   # Property action initial state
├── units.actions.ts                    # Create, update, archive unit
├── unit.state.ts                       # Unit action initial state
├── tenancies.actions.ts                # Create, terminate tenancy
├── tenancy.state.ts                    # Tenancy action initial state
├── payments.actions.ts                 # Record payment, setup bank account
├── payment.state.ts                    # Payment action initial state
├── onboarding.actions.ts               # Tenant onboarding completion
├── onboarding.state.ts                 # Onboarding action initial state
├── tenant-activation.actions.ts        # Tenant account activation
├── tenant-activation.state.ts          # Activation action initial state
├── tenancy-agreements.actions.ts       # Generate, finalize, accept agreements
├── tenancy-agreement.state.ts          # Agreement action initial state
├── receipts.actions.ts                 # Generate receipt, WhatsApp sharing
├── receipt.state.ts                    # Receipt action initial state
├── renewals.actions.ts                 # Renewal management
├── app-fee-payment.actions.ts          # App fee payment
└── app-fee-payment.state.ts            # App fee action initial state
```

**Action Pattern:**

```typescript
export async function someAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = someSchema.parse(Object.fromEntries(formData));
    await someService(parsed);
    revalidatePath("/path");
    return { ok: true, message: "Success" };
  } catch (error) {
    return toActionError(error);
  }
}
```

#### `/src/components` - React Components

Organized by feature domain:

```
components/
├── ui/                         # Reusable UI components
│   ├── button.tsx             # Button (primary, secondary, danger, ghost)
│   ├── input.tsx              # Text input with label & error
│   ├── textarea.tsx           # Textarea with label & error
│   ├── select.tsx             # Select dropdown
│   ├── card.tsx               # Card container with header/footer
│   ├── badge.tsx              # Status badge
│   ├── status-pill.tsx        # Inline status indicator
│   ├── page-header.tsx        # Page title & description
│   ├── section-card.tsx       # Section heading with card
│   ├── stat-card.tsx          # Statistics card (for overview)
│   ├── empty-state.tsx        # Empty state illustration
│   ├── error-state.tsx        # Error state display
│   ├── loading-state.tsx      # Loading skeleton
│   ├── toast.tsx              # Toast notification
│   ├── toast-provider.tsx     # Toast context provider
│   ├── use-toast.ts           # useToast hook
│   ├── action-result-toast.tsx# Integrates action results with toast
│   ├── trust-notice.tsx       # Trust/info notice box
│   └── currency-input.tsx     # Money amount input
│
├── auth/                       # Authentication components
│   ├── login-form.tsx         # Email/password login
│   ├── register-form.tsx      # Email/password registration
│   ├── phone-login-form.tsx   # Phone/password login
│   ├── phone-number-input.tsx # Phone input with validation
│   ├── otp-code-input.tsx     # OTP code entry
│   ├── magic-link-form.tsx    # Magic link request
│   ├── email-fallback-panel.tsx # Email fallback UI
│   ├── landlord-profile-setup.tsx # Post-signup profile completion
│   └── logout-button.tsx      # Sign out button
│
├── layout/                     # Layout components
│   ├── app-shell.tsx          # Main app container with nav
│   ├── landlord-shell.tsx     # Landlord-specific layout
│   ├── sidebar.tsx            # Left navigation (desktop)
│   ├── topbar.tsx             # Top bar with user menu
│   ├── mobile-nav.tsx         # Mobile bottom navigation
│   └── mobile-more-menu.tsx   # Mobile menu for additional items
│
├── property/                   # Property management
│   ├── property-form.tsx      # Create/edit property
│   ├── property-card.tsx      # Property list item
│   ├── unit-form.tsx          # Create/edit unit
│   ├── unit-card.tsx          # Unit list item
│   ├── occupancy-summary.tsx  # Units occupied/vacant
│   └── archive-property-button.tsx # Delete property button
│
├── tenant/                     # Tenant management
│   ├── tenant-form.tsx        # Create/edit tenant
│   ├── tenant-card.tsx        # Tenant list item
│   ├── tenant-activation-form.tsx # Tenant account activation
│   └── [other tenant components]
│
├── tenancy/                    # Tenancy/rental agreement
│   ├── [tenancy agreement components]
│
├── payment/                    # Payment components
│   ├── payment-form.tsx       # Generic payment form
│   ├── manual-payment-form.tsx # Record manual payment
│   ├── bank-setup-form.tsx    # Configure bank account
│   ├── payment-list.tsx       # Payment history table
│   ├── balance-preview.tsx    # Payment balance summary
│   └── [other payment components]
│
├── renewal/                    # Renewal components
│   └── [renewal components]
│
└── onboarding/                 # Onboarding flow
    ├── onboarding-shell.tsx   # Onboarding layout
    ├── onboarding-progress.tsx # Progress indicator
    ├── onboarding-step-card.tsx # Step content card
    └── [other onboarding components]
```

#### `/src/server` - Backend Server Code

```
server/
├── services/                   # Business logic (33 service files)
│   ├── auth.service.ts        # User/role requirements
│   ├── tenants.service.ts     # Tenant CRUD + approval
│   ├── properties.service.ts  # Property CRUD + archiving
│   ├── payments.service.ts    # Payment recording
│   ├── gateway-payment.service.ts # Paystack payment init
│   ├── paystack.service.ts    # Paystack API integration
│   ├── receipts.service.ts    # Receipt generation & WhatsApp
│   ├── receipt-pdf.service.tsx # PDF rendering
│   ├── tenancy-agreements.service.ts # Agreement CRUD
│   ├── tenancy-agreement-pdf.service.tsx # Agreement PDF
│   ├── onboarding.service.ts  # Tenant onboarding flow
│   ├── tenant-activation.service.ts # Account activation
│   ├── storage.service.ts     # File uploads/downloads
│   ├── overview.service.ts    # Dashboard stats
│   ├── whatsapp.service.ts    # WhatsApp messages
│   ├── notification-queue.service.ts # Notification queuing
│   ├── otp.service.ts         # OTP generation/verification
│   ├── session.service.ts     # Session management
│   └── [other services]
│
├── repositories/               # Data access (25 repository files)
│   ├── profiles.repository.ts # Auth profile queries
│   ├── tenants.repository.ts  # Tenant queries
│   ├── properties.repository.ts # Property queries
│   ├── units.repository.ts    # Unit queries
│   ├── payments.repository.ts # Payment queries + RPC
│   ├── tenancies.repository.ts # Tenancy queries
│   ├── tenancy-agreements.repository.ts
│   ├── gateway-payment.repository.ts # Paystack intent tracking
│   ├── receipts.repository.ts # Receipt data
│   ├── guarantors.repository.ts # Guarantor data
│   ├── caretakers.repository.ts
│   ├── notifications.repository.ts
│   ├── landlord-paystack.repository.ts
│   └── [other repositories]
│
├── validators/                 # Zod schema validation
│   ├── common.schema.ts       # Shared schemas (uuid, money, phone, etc.)
│   ├── auth.schema.ts         # Login/register/OTP schemas
│   ├── tenant.schema.ts       # Tenant CRUD schemas
│   ├── property.schema.ts     # Property CRUD schemas
│   ├── unit.schema.ts         # Unit CRUD schemas
│   ├── payment.schema.ts      # Payment schemas
│   ├── tenancy.schema.ts      # Tenancy schemas
│   ├── tenancy-agreement.schema.ts # Agreement schemas
│   ├── onboarding.schema.ts   # Onboarding schemas
│   └── [other validators]
│
├── types/                      # TypeScript types
│   ├── auth.types.ts          # Auth-specific types
│   ├── payment.types.ts       # Payment types
│   ├── paystack.types.ts      # Paystack API types
│   ├── onboarding.types.ts    # Onboarding types
│   └── compliance.types.ts    # KYC/compliance types
│
├── errors/                     # Error handling
│   ├── app-error.ts           # Custom AppError class
│   ├── error-map.ts           # Error code → message mapping
│   └── result.ts              # Result type & helpers
│
├── utils/                      # Utility functions
│   ├── money.ts               # formatNaira, kobo conversion
│   ├── dates.ts               # Date formatting
│   ├── phone.ts               # Phone number normalization
│   ├── crypto.ts              # Hash functions
│   ├── encryption.ts          # Text encryption/decryption
│   ├── tokens.ts              # Secure token generation
│   └── [other utils]
│
├── constants/                  # Application constants
│   ├── routes.ts              # App URL building
│   ├── notification-types.ts  # Notification channels & types
│   ├── permissions.ts         # Role-based permissions
│   ├── session.ts             # Session config
│   └── storage-paths.ts       # Supabase storage paths
│
├── supabase/                   # Database client setup
│   ├── server.ts              # Server client (with cookies)
│   └── admin.ts               # Admin client (for system operations)
│
└── jobs/                       # Inngest background jobs
    ├── inngest.client.ts      # Inngest client setup
    ├── payment.jobs.ts        # Payment-related jobs
    ├── receipt.jobs.ts        # Receipt generation jobs
    ├── notification.jobs.ts   # Notification jobs
    └── renewal.jobs.ts        # Renewal jobs
```

#### `/src/lib` - Helper Functions

```
lib/
├── cn.ts                      # Tailwind className merging (clsx + merge)
├── navigation.ts              # LANDLORD_NAVIGATION constant
├── status-copy.ts             # Status value → display text
```

---

## 5. Implemented Features

### ✅ Authentication & Authorization

**Implemented:**

- Email/password login and registration
- Phone/password login and registration
- Magic link authentication
- OTP-based login (legacy, kept for compatibility)
- Supabase Auth integration
- Role-based access control (landlord, tenant, caretaker)
- Session management via HTTP-only cookies
- Sign out functionality
- Password requirements (8+ chars, max 72 chars)

**How It Works:**

1. User registers with email/phone + password
2. Supabase Auth creates user account
3. Profile created with role (landlord/tenant)
4. Login returns JWT in cookie
5. `requireLandlord()` / `requireTenant()` checks role
6. Unauthorized users redirected to /login

### ✅ Property Management

**Implemented:**

- Create properties (name, address, state, LGA, type)
- Update property details
- Archive properties (soft delete)
- List all properties for landlord
- View property details
- Unit management within properties

**Features:**

- Property types: residential, mixed_use, flat_complex
- Nigerian state/LGA selection
- Multiple units per property
- Occupancy tracking (occupied/vacant)
- Property status & modification timestamps

### ✅ Unit/Room Management

**Implemented:**

- Create units (building name, identifier, type, bedrooms, bathrooms)
- Update unit details
- Archive units
- Set rent amounts (monthly and/or annual)
- Track unit status (vacant, occupied, under_renovation, hold, pending_vacancy, archived)

**Unit Types:**

- single_room, self_contain, room_and_parlour, mini_flat, two_bedroom_flat, three_bedroom_flat, duplex, shop, office_space, other

### ✅ Tenant Management

**Implemented:**

- Create tenant shell (minimal: name, phone, email, unit)
- Update tenant details (name, phone, email, DOB, address, occupation, employer)
- Upload tenant documents (ID, passport photo)
- Approve tenant (landlord action)
- Reject tenant with reason (landlord action)
- Archive tenant (soft delete)
- View tenant details
- List all tenants for landlord
- Landlord notes on tenant

**Tenant Workflow:**

1. Landlord creates tenant shell
2. Tenant activated via token link
3. Tenant completes profile (onboarding)
4. Landlord reviews and approves/rejects
5. Tenant can access dashboard

### ✅ Tenancy/Rental Agreements

**Implemented:**

- Generate tenancy agreement (PDF)
- Save agreement drafts
- Finalize agreement
- Accept agreement by tenant
- Refresh acceptance link (token expires in 7 days)
- Generate agreement PDF for download
- Template-based agreement with customizable terms

**Features:**

- Snapshots of parties (landlord, tenant, property, unit)
- Rent details, payment terms
- Renewal terms, increment percentage
- Professional PDF generation
- WhatsApp-friendly link sharing

### ✅ Rent Payment Recording

**Implemented:**

- Record manual payment (bank transfer, cash, other)
- Initialize gateway payment via Paystack
- Payment verification via webhook
- Payment history with filtering
- Payment status tracking (pending, verified, reversed)
- Payment date and payment method recording
- Period coverage tracking (payment for which months)

**Payment Methods:**

- Bank transfer (with reference)
- Cash (manual entry)
- Online (via Paystack)
- Other (with notes)

### ✅ Receipt Generation

**Implemented:**

- Generate professional PDF receipts
- Receipt numbering (REC-{paymentId first 8 chars})
- Share receipt via WhatsApp link
- Download receipt
- Receipt templates with property/tenant/amount info
- Date formatting for Nigerian locale
- Receipt number storage in database

**Receipt Data:**

- Tenant name, property name, unit, amount paid
- Payment date, receipt number
- Formatted in NGN currency
- WhatsApp-friendly links with message template

### ✅ Payment Gateway Integration

**Implemented:**

- Paystack integration for online rent payments
- Tenant payment links (public, no auth required)
- Payment initialization with metadata
- Payment verification via webhook
- Subaccount setup for landlord payouts
- Payment reference tracking
- Idempotency keys to prevent duplicates

**Features:**

- Configurable Paystack fee (TENURO_GATEWAY_ADMIN_FEE_NAIRA)
- Tenant payment URL vs landlord authorization URL
- Payment context (tenancy, tenant, landlord, property)
- Transaction metadata for reconciliation

### ✅ Tenant Onboarding

**Implemented:**

- Generate onboarding link (token expires in 72 hours)
- Tenant profile completion form
- Document upload (ID, passport)
- Guarantor information capture
- Profile status tracking (invited, profile_complete, approved, rejected)
- Rejection reason storage

**Onboarding Steps:**

1. Landlord invites tenant (generates link)
2. Tenant clicks link, activates account
3. Tenant completes profile (name, DOB, address, occupation)
4. Tenant uploads documents
5. Tenant provides guarantor info
6. Landlord reviews and approves/rejects
7. Approved tenant can sign agreement

### ✅ Tenant Account Activation

**Implemented:**

- Generate activation link (token-based, 72-hour expiry)
- Tenant sets password via activation page
- Account becomes active after password set
- Phone number verified during activation
- Secure token handling

### ✅ Dashboard & Overview

**Implemented:**

- Landlord overview page with key stats
- Rent collected this year (stat card)
- Total units and occupancy
- Total tenants count
- Vacant units indicator
- Upcoming renewals (placeholder - 0)
- Primary action guidance (first setup)

**Stats Calculated:**

- rentCollectedThisYear (filtered by date)
- totalProperties, totalUnits, occupiedUnits, vacantUnits
- totalTenants, upcomingRenewals

### ✅ Settings Page

**Implemented:**

- Bank account setup form
- Landlord profile settings (form structure present)
- Paystack account configuration (if applicable)
- Payment method configuration

### ✅ Notifications System

**Implemented:**

- Notification queuing system
- WhatsApp message support
- Notification types: onboarding_invite, rent_due, overdue, receipt, renewal_notice, etc.
- Notification channels: WhatsApp, SMS, email, in-app
- Notification tracking and status

### ✅ File Management

**Implemented:**

- Upload tenant documents (ID, passport)
- Generate and store PDFs (receipts, agreements)
- Secure file storage via Supabase Storage
- Signed URLs for secure downloads
- File path organization by landlord/tenant/tenancy

---

## 6. In-Progress / Partial Features

### 🔄 Renewals Management

**Current State:** Stub implementation only

- Page exists at `/renewals` but shows placeholder
- `renewals.service.ts` is empty
- Renewal table structure exists in database
- `renewal.jobs.ts` exists but not integrated

**Needed:**

- Renewal reminder notifications
- Automatic renewal creation when tenancy expires
- Rent increment handling
- Agreement renewal process
- Renewal status tracking

### 🔄 Caretakers Management

**Current State:** Stub implementation only

- Page exists at `/caretakers` but shows placeholder
- UI components likely not built
- Database structure for caretakers exists
- Limited functionality

**Needed:**

- Caretaker CRUD operations
- Permission model for caretaker actions
- Rent collection tracking by caretaker
- Communication channels

### 🔄 Reports

**Current State:** Stub implementation only

- Page exists at `/reports` but shows placeholder
- No reporting logic implemented

**Needed:**

- Income reports (yearly, monthly)
- Tenant list reports
- Payment history reports
- Occupancy reports
- PDF export functionality

### 🔄 App Fee Payment Integration

**Implemented:**

- App fee payment initialization
- App fee verification endpoint
- App fee action created (`app-fee-payment.actions.ts`)
- App fee repository exists

**Incomplete:**

- App fee calculation logic
- App fee UI integration with payment flow
- Complete payment workflow

### 🔄 Ledger/Accounting

**Current State:** Partial

- Ledger repository exists (`ledger.repository.ts`)
- Ledger service exists (`ledger.service.ts`)
- Audit service exists (`audit.service.ts`)
- Not fully integrated into UI

### 🔄 Inngest Background Jobs

**Current State:** Scaffolded but inactive

- Inngest client configured
- Job definitions exist (payment, receipt, notification, renewal jobs)
- Route handler returns "scaffolded" message
- Jobs not actively running

**Setup Needed:**

- Inngest backend activation
- Job scheduling configuration
- Error handling and retries
- Job monitoring

### 🔄 SMS Notifications

**Current State:** Partially implemented

- SMS notification type defined
- Notification channel supports SMS
- No SMS provider integrated yet (only WhatsApp via Paystack)

### 🔄 Email Notifications

**Current State:** Partially implemented

- Resend package installed
- Email notification type defined
- Limited integration with actual email sending

---

## 7. Core Reusable Patterns

### Component Composition Patterns

**UI Component Pattern:**

```typescript
// Presentational, reusable UI component
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
};

export function Button({ variant = "primary", size = "md", ...props }) {
  return <button className={cn(variants[variant], sizes[size])} {...props} />;
}
```

**Form Container Pattern:**

```typescript
// Server action + form component
export async function createTenantShellAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // ... validation, service, return result
}

"use client";
export function CreateTenantForm() {
  const [state, formAction] = useActionState(
    createTenantShellAction,
    initialActionState,
  );
  return (
    <form action={formAction}>
      <Input label="Name" name="fullName" error={state.fieldErrors?.fullName?.[0]} />
      <Button type="submit">Save</Button>
      <ActionResultToast ok={state.ok} message={state.message} />
    </form>
  );
}
```

**Page + Server Component Pattern:**

```typescript
export default async function PropertyDetailPage({ params }) {
  const property = await getPropertyForCurrentLandlord(params.propertyId);
  return (
    <div>
      <PageHeader title={property.property_name} />
      <PropertyForm property={property} />
    </div>
  );
}
```

### Hook Patterns

**useActionState Hook:**

```typescript
// Standard form state hook
const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState,
);
```

**useToast Hook:**

```typescript
// Custom hook for showing toasts
const { showToast } = useToast();
showToast({
  title: "Success",
  description: "Tenant created",
  tone: "success", // or "error"
});
```

### Utility/Helper Patterns

**Money Formatting:**

```typescript
formatNaira(100000); // "₦100,000.00"
formatNairaCompact(100000); // "₦100,000"
convertNairaToKobo(1000); // 100000
convertKoboToNaira(100000); // 1000
```

**Phone Normalization:**

```typescript
normalisePhoneNumber("+234 801 234 5678");
// Returns E.164 format: +2348012345678
```

**Date Handling:**

```typescript
// Parse and format dates consistently
const dateSchema = z.coerce.date();
const date = new Date("2024-01-15");
date.toISOString(); // "2024-01-15T00:00:00.000Z"
```

**Token Generation:**

```typescript
const token = generateSecureToken(); // Random secure token
const tokenHash = sha256Hex(token); // Hash for storage
const expiresAt = getExpiryDateFromNow(72); // 72 hours from now
```

### Service Abstraction Patterns

**Service → Repository → Supabase Pattern:**

```typescript
// Service: Orchestrates, checks auth
export async function createPropertyForCurrentLandlord(input) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();
  return createProperty(supabase, landlord.id, input);
}

// Repository: Pure data access
export async function createProperty(supabase, landlordId, input) {
  const { data, error } = await supabase
    .from("properties")
    .insert({ landlord_id: landlordId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

**Authorization Check Pattern:**

```typescript
export async function getCurrentLandlordProperty(propertyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();
  const property = await getPropertyById(supabase, propertyId);

  if (property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this property.",
      403,
    );
  }
  return property;
}
```

### Form Handling Patterns

**Server Action Form Pattern:**

```typescript
// 1. Define Zod schema for validation
const createPropertySchema = z.object({
  propertyName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  // ...
});

// 2. Create server action
export async function createPropertyAction(_prev, formData) {
  try {
    const parsed = createPropertySchema.parse(
      Object.fromEntries(formData),
    );
    await createPropertyForCurrentLandlord(parsed);
    revalidatePath("/properties");
    return { ok: true, message: "Property created" };
  } catch (error) {
    return toActionError(error);
  }
}

// 3. Use in form
<form action={createPropertyAction}>
  <Input label="Name" name="propertyName" error={state.fieldErrors?.propertyName?.[0]} />
  <Button type="submit" isLoading={isPending}>Create</Button>
</form>
```

**FormData Parsing Pattern:**

```typescript
// Extract from FormData and parse
const parsed = someSchema.parse({
  unitId: formData.get("unitId"),
  fullName: formData.get("fullName"),
  phoneNumber: formData.get("phoneNumber"),
  // ...
});
```

### Table/List Rendering Patterns

**List Rendering from Array:**

```typescript
{items.length === 0 ? (
  <EmptyState title="No items" icon={SomeIcon} />
) : (
  <div className="grid gap-5">
    {items.map((item) => (
      <ItemCard key={item.id} item={item} />
    ))}
  </div>
)}
```

### Modal/Dialog Patterns

**No built-in modal library used** - Components use layout changes and page navigation for complex flows

### Offline/Queue/Sync Patterns

**Payment Idempotency Pattern:**

```typescript
// Prevent duplicate payments via idempotency key
const parsed = recordManualPaymentSchema.parse({
  // ...
  idempotencyKey: formData.get("idempotencyKey"),
});

// Repository checks for existing payment with same key
// and returns existing result if found
```

**Notification Queue Pattern:**

```typescript
// Create notification for async processing
await createNotification(supabase, {
  landlordId,
  tenantId,
  channel: "whatsapp",
  notificationType: "onboarding_invite",
  messageBody,
});

// Inngest job picks it up and sends
```

---

## 8. Styling / Design System Rules

### Theme Philosophy

**"Professional, Clear, Nigerian-Focused"**

- Clean, modern design
- High contrast for readability
- Consistent spacing and alignment
- Trust-building through clarity
- Mobile-first responsive design

### Color Usage

**Primary Palette:**

- `primary: #1B4FD8` (Main brand blue)
- `primary-hover: #153FB0` (Darker on hover)
- `primary-soft: #EAF0FF` (Light background)

**Secondary/Status Colors:**

- `gold: #F6B73C` (Accent, highlights)
- `gold-deep: #D97706` (Darker gold)
- `gold-soft: #FFF4D8` (Light gold background)
- `success: #16A34A` (Positive actions)
- `success-soft: #EAF7EE` (Success background)
- `warning: #D97706` (Caution, same as gold-deep)
- `warning-soft: #FFF3DF` (Warning background)
- `danger: #DC2626` (Errors, destructive)
- `danger-soft: #FDECEC` (Error background)

**Neutral Colors:**

- `background: #F8F7F4` (Page background)
- `surface: #FFFFFF` (Card, input background)
- `text-strong: #111827` (Primary text, headings)
- `text-normal: #374151` (Body text)
- `text-muted: #6B7280` (Secondary text, placeholders)
- `border-soft: #E7E5DF` (Dividers, borders)

**Color Usage Rules:**

- Primary blue for: main actions, links, focus states, active nav
- Gold for: stats, highlights, secondary actions
- Success green for: confirmations, approved status
- Danger red for: errors, rejections, destructive actions
- Neutral grays for: text, backgrounds, borders

### Typography Rules

**Font Family:**

- `Plus Jakarta Sans` (Google Font) for all text
- System sans-serif as fallback

**Type Hierarchy:**

- `h1/h2`: Large headings - "text-4xl md:text-5xl font-extrabold"
- `h3`: Medium headings - "text-2xl font-extrabold"
- `body`: "text-base leading-6" for readable body
- `small`: "text-sm" for secondary information
- `label`: "text-sm font-semibold" for form labels
- `input`: "text-base" for user input

**Font Weight Usage:**

- `font-extrabold (800)`: Page titles, stat numbers
- `font-bold (700)`: Section headings, nav items, buttons
- `font-semibold (600)`: Form labels, card titles, emphasis
- `font-normal (400)`: Body text, form values

### Spacing Conventions

**Tailwind spacing scale used throughout:**

- `px-4, px-6, px-8`: Horizontal padding
- `py-3, py-5, py-8`: Vertical padding
- `gap-3, gap-5, gap-6`: Component spacing
- `mt-6, mb-8`: Vertical rhythm
- `max-w-7xl`: Page max width
- `w-72`: Sidebar width (lg devices)

**Spacing Rules:**

- Page sections: `gap-6` or `gap-10`
- Component sections: `gap-5` or `gap-8`
- Form fields: `space-y-2` (label + input)
- Form layout: `space-y-6` (between fields)
- Cards: `p-5` or `p-6`

### Layout/Grid Rules

**Container Layout:**

```typescript
// Standard page container
<section className="mx-auto max-w-7xl px-4 py-8 md:px-8">

// With sidebar (landlord layout)
<main className="px-4 pb-24 pt-6 md:px-8 lg:ml-72 lg:pb-10">
```

**Responsive Grid:**

```typescript
// Stats cards: responsive columns
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

// Two-column with sidebar: lg breakpoint
<div className="grid gap-6 xl:grid-cols-[1fr_420px]">
```

**Breakpoints Used:**

- `sm`: 640px (small phones)
- `md`: 768px (tablets)
- `lg`: 1024px (desktops - sidebar appears here)
- `xl`: 1280px (wide screens)

### Card/Button/Input Styles

**Card Style:**

```typescript
className = "rounded-card border border-border-soft bg-surface p-5 shadow-card";
// rounded-card: 1rem radius
// shadow-card: 0 12px 30px rgba(17, 24, 39, 0.06)
```

**Button Style:**

```typescript
// Primary button
"bg-primary text-white shadow-soft hover:bg-primary-hover";

// Secondary button
"bg-surface text-text-strong shadow-soft ring-1 ring-border-soft";

// Danger button
"bg-danger text-white shadow-soft";

// All buttons
"rounded-button font-semibold transition focus-visible:ring-2";
// rounded-button: 0.75rem
```

**Input Style:**

```typescript
// Consistent input
"min-h-12 w-full rounded-button border border-border-soft bg-white px-4 py-3";
"focus:border-primary focus:ring-2 focus:ring-primary-soft";
"disabled:bg-background disabled:text-text-muted";
```

**Badge/Pill Style:**

```typescript
// Status badge
"inline-flex items-center gap-1 rounded-button px-3 py-1.5 text-xs font-bold";

// Variants: primary, success, warning, danger, gold
```

### Responsive Design Approach

**Mobile-First Philosophy:**

- Default styles optimized for mobile
- `lg:` prefix for desktop-specific changes
- Sidebar hidden on mobile (appears at `lg` breakpoint)
- Bottom navigation on mobile
- Stack layouts on mobile, side-by-side on desktop

**Responsive Patterns:**

```typescript
// Hidden on small screens, visible on desktop
<div className="hidden lg:block">Sidebar</div>

// Full width on mobile, max-width on desktop
className="max-w-7xl mx-auto px-4 md:px-8"

// Responsive grid
className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"

// Responsive text size
className="text-lg md:text-2xl"

// Sticky positioning (desktop only)
className="lg:sticky lg:top-28 lg:self-start"
```

### Animation/Motion Conventions

**Tailwind Motion Defaults:**

- Transitions: `transition duration-200`
- Hover effects: Subtle scale/opacity changes
- Loading spinner: `animate-spin` (rotating border)
- No heavy animations - focus on smoothness

**Hover States:**

```typescript
// Button hover
"hover:bg-primary-hover";

// Card hover (optional)
"hover:-translate-y-0.5";

// Link hover
"hover:text-primary-hover";

// Interactive hover
"transition hover:bg-primary-soft";
```

**Focus States:**

```typescript
// Focus visible (keyboard nav)
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
```

### Shadow System

**Card Shadow:**

- `shadow-card: 0 12px 30px rgba(17, 24, 39, 0.06)` (primary shadow)

**Soft Shadow:**

- `shadow-soft: 0 8px 20px rgba(17, 24, 39, 0.05)` (buttons, badges)

---

## 9. Naming Conventions

### File Naming Conventions

**Components:**

- Kebab-case for file names: `tenant-card.tsx`, `payment-form.tsx`
- PascalCase for exported component: `export function TenantCard`
- One component per file (usually)

**Actions:**

- Kebab-case: `auth.actions.ts`, `payments.actions.ts`
- State files: `auth.state.ts` (paired with actions file)

**Services:**

- Kebab-case: `auth.service.ts`, `payments.service.ts`, `gateway-payment.service.ts`
- Suffix with `.service.ts`
- PDF services use `.service.tsx` (React component)

**Repositories:**

- Kebab-case: `tenants.repository.ts`, `payments.repository.ts`
- Suffix with `.repository.ts`

**Validators:**

- Kebab-case: `auth.schema.ts`, `tenant.schema.ts`
- Suffix with `.schema.ts`
- Group related schemas in one file

**Utilities:**

- Kebab-case: `money.ts`, `phone.ts`, `crypto.ts`
- Group related utilities by domain

**Types:**

- Kebab-case: `auth.types.ts`, `payment.types.ts`
- Suffix with `.types.ts`

**Pages:**

- `page.tsx` for route pages
- `[id]` for dynamic routes
- `(groupName)` for layout groups (no URL segment)

### Component Naming Conventions

**Naming Pattern:**

- PascalCase for all components
- Descriptive, specific names
- Examples: `TenantCard`, `PaymentForm`, `PropertyDetailPage`, `ManualPaymentForm`

**Naming Prefixes:**

- Page components: `{Feature}Page` (e.g., `TenantsPage`, `PaymentDetailPage`)
- Form components: `{Entity}Form` (e.g., `TenantForm`, `PropertyForm`)
- Card/list components: `{Entity}Card` (e.g., `TenantCard`, `PropertyCard`)
- Dialog/modal: `{Action}Dialog` or `{Entity}Modal`
- Provider/wrapper: `{Feature}Provider` or `{Feature}Shell`

### Hook Naming Conventions

**Standard Hooks:**

- `useActionState` (React built-in)
- `useToast` (custom hook)
- `useRouter` (Next.js)
- `usePathname` (Next.js)
- `useSearchParams` (Next.js)

**Custom Hooks:**

- Start with `use`
- `use{Feature}` pattern: `useToast`
- Located in components or `lib/` folder

### Variable/Function Naming Rules

**Variables:**

- camelCase for all variables
- Descriptive, not single letters (except loop indices)
- Boolean prefixes: `is`, `has`, `can`, `should`, `will`
  - `isLoading`, `hasError`, `canSubmit`, `shouldShow`

**Functions:**

- camelCase for regular functions
- Verb-first naming: `get`, `create`, `update`, `delete`, `format`, `fetch`
- Examples:
  - `getTenantById()` (read)
  - `createProperty()` (create)
  - `updateTenant()` (update)
  - `archiveTenant()` (delete/archive)
  - `formatNaira()` (transform)
  - `normalisePhoneNumber()` (normalize)

**Server Actions:**

- Suffix with `Action`: `createTenantShellAction`, `approveTenantsAction`
- Always async functions

**Services:**

- Start with noun/domain: `auth.service.ts`, `payments.service.ts`
- Functions describe operation: `requireLandlord()`, `createProperty()`

**Repositories:**

- Start with domain/table: `tenants.repository.ts`
- CRUD operations: `create`, `update`, `delete`, `getById`, `get{Multiple}For{Context}`
- Examples: `getTenantById()`, `getTenantsForLandlord()`, `createProperty()`

### Database/Table Naming Rules

**Table Names:**

- Snake_case, plural: `tenants`, `properties`, `units`, `payments`, `tenancies`

**Column Names:**

- Snake_case: `landlord_id`, `full_name`, `phone_number`, `created_at`, `updated_at`
- Status columns: `status` (enum values)
- Timestamps: `created_at`, `updated_at`, `deleted_at`, `archived_at`, `approved_at`
- Foreign keys: `{table}_id` (e.g., `landlord_id`, `property_id`)

**Naming Conventions in Database:**

- All lowercase
- Snake_case for multi-word columns
- No abbreviations
- Clear, self-documenting names

---

## 10. Data Models / Schemas

### Core Entities & Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         PROFILES                             │
│  id (PK) | role | full_name | phone_number | email          │
│  (extends Supabase auth.users)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    LANDLORD    TENANT       CARETAKER
        │
        ├─────────────────────────┐
        │                         │
        ▼                         ▼
   PROPERTIES               TENANTS
   (multiple per            (assigned to
    landlord)               one unit)
        │
        ├─────────────┐
        │             │
        ▼             ▼
      UNITS      GUARANTORS
   (rooms,      (tenant
    flats)       guarantors)
        │
        └──────────┬──────────┐
                   │          │
                   ▼          ▼
              TENANCIES  TENANCY_AGREEMENTS
            (active)    (signed)
                │
                ├──────────────────┐
                │                  │
                ▼                  ▼
            PAYMENTS          RECEIPTS
         (per payment)    (PDF + WhatsApp)
                │
                ▼
           LEDGER
        (accounting)
```

### Data Models

#### PROFILES (Supabase Auth Extension)

```typescript
id: string (UUID, PK, from auth.users)
role: "landlord" | "tenant" | "caretaker"
full_name: string
phone_number: string
email: string | null
created_at: timestamp
updated_at: timestamp
```

#### PROPERTIES

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
property_name: string (max 120)
address: string (max 300)
state: string (e.g., "Lagos")
lga: string (Local Government Area)
property_type: "residential" | "mixed_use" | "flat_complex"
country_code: string (default "NG")
currency_code: string (default "NGN")
created_at: timestamp
updated_at: timestamp
deleted_at: timestamp | null (soft delete)
archived_at: timestamp | null
```

#### UNITS

```typescript
id: string (UUID, PK)
property_id: string (UUID, FK → properties)
block_id: string | null (for complex properties)
building_name: string | null (e.g., "Block A")
unit_identifier: string (e.g., "Apt 201")
unit_type: "single_room" | "self_contain" | "room_and_parlour" | ... (8 types)
bedrooms: integer
bathrooms: integer
monthly_rent: decimal | null
annual_rent: decimal | null
currency_code: string (default "NGN")
status: "vacant" | "occupied" | "under_renovation" | "hold" | "pending_vacancy" | "archived"
created_at: timestamp
```

#### TENANTS

```typescript
id: string (UUID, PK)
profile_id: string | null (FK → profiles, null until activated)
landlord_id: string (UUID, FK → profiles)
unit_id: string (UUID, FK → units)
full_name: string
phone_number: string
email: string | null
date_of_birth: date | null
home_address: string | null (max 300)
occupation: string | null
employer: string | null
id_type: "nin" | "passport" | "drivers_license" | "voters_card" | null
id_document_path: string | null (file path in storage)
passport_photo_path: string | null
onboarding_status: "invited" | "profile_complete" | "approved" | "rejected" | "token_expired"
landlord_notes: string | null (max 2000)
rejected_reason: string | null
approved_at: timestamp | null
approved_by: string | null (FK → profiles)
created_at: timestamp
```

#### GUARANTORS

```typescript
id: string (UUID, PK)
tenant_id: string (UUID, FK → tenants)
full_name: string
relationship: string (e.g., "Father", "Employer")
phone_number: string
email: string | null
address: string | null
is_active: boolean (only one active per tenant)
created_at: timestamp
```

#### TENANCIES (Active Rental Agreements)

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
tenant_id: string (UUID, FK → tenants)
unit_id: string (UUID, FK → units)
property_id: string (UUID, FK → properties)
rent_amount: decimal
rent_frequency: "monthly" | "annual"
payment_method: string[] (e.g., ["bank_transfer", "cash"])
start_date: date
end_date: date | null (null if ongoing)
status: "active" | "pending" | "completed" | "terminated"
termination_reason: string | null
created_at: timestamp
updated_at: timestamp
```

#### TENANCY_AGREEMENTS

```typescript
id: string (UUID, PK)
tenancy_id: string (UUID, FK → tenancies)
landlord_id: string (UUID, FK → profiles)
tenant_id: string (UUID, FK → tenants)
status: "draft" | "finalized" | "accepted" | "signed"
template_version: string
agreement_snapshot: jsonb (full agreement data)
landlord_snapshot: jsonb (landlord at time of agreement)
tenant_snapshot: jsonb (tenant at time of agreement)
property_snapshot: jsonb (property at time of agreement)
unit_snapshot: jsonb (unit at time of agreement)
acceptance_token_hash: string | null
acceptance_token_expires_at: timestamp | null
acceptance_url: string | null
accepted_at: timestamp | null
accepted_by: string | null
pdf_path: string | null
created_at: timestamp
updated_at: timestamp
```

#### PAYMENTS (Rent Payments)

```typescript
id: string (UUID, PK)
tenancy_id: string (UUID, FK → tenancies)
tenant_id: string (UUID, FK → tenants)
landlord_id: string (UUID, FK → profiles)
amount_paid: decimal
payment_method: "bank_transfer" | "cash" | "online" | "other"
payment_reference: string | null
payment_date: date
payment_verified_at: timestamp | null
verified_by: string (source, e.g., "manual", "paystack")
status: "pending" | "verified" | "reversed"
period_start: date | null (rent for which period)
period_end: date | null
notes: string | null
receipt_number: string | null
receipt_pdf_path: string | null
gateway_payment_id: string | null (FK → gateway_payments)
idempotency_key: string (for deduplication)
created_at: timestamp
```

#### GATEWAY_PAYMENTS (Paystack Integration)

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
reference: string (unique Paystack reference)
tenant_id: string (UUID, FK → tenants)
tenancy_id: string (UUID, FK → tenancies)
status: "pending" | "success" | "failed"
amount_naira: decimal (rent amount)
tenuro_fee_naira: decimal (app fee)
total_amount_kobo: integer (for Paystack)
metadata: jsonb (Paystack metadata)
paystack_response: jsonb | null
error_message: string | null
idempotency_key: string
created_at: timestamp
updated_at: timestamp
```

#### RECEIPTS

```typescript
id: string (UUID, PK)
payment_id: string (UUID, FK → payments)
landlord_id: string (UUID, FK → profiles)
receipt_number: string
pdf_path: string
download_url: string | null
whatsapp_sent_at: timestamp | null
email_sent_at: timestamp | null
created_at: timestamp
```

#### NOTIFICATIONS

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
tenant_id: string | null (FK → tenants)
channel: "whatsapp" | "sms" | "email" | "in_app"
notification_type: string (e.g., "onboarding_invite", "receipt", "overdue")
message_body: string
status: "queued" | "sent" | "failed"
sent_at: timestamp | null
error_message: string | null
created_at: timestamp
```

#### ONBOARDING_TOKENS

```typescript
id: string (UUID, PK)
tenant_id: string (UUID, FK → tenants)
token_hash: string (hashed token)
expires_at: timestamp
created_at: timestamp
```

#### TENANT_ACTIVATION_TOKENS

```typescript
id: string (UUID, PK)
tenant_id: string (UUID, FK → tenants)
token_hash: string
expires_at: timestamp
created_at: timestamp
```

#### LEDGER (Accounting)

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
entry_type: "credit" | "debit"
amount: decimal
description: string
reference_id: string (payment/receipt ID)
reference_type: string (payment/fee/etc)
created_at: timestamp
```

#### CARETAKERS

```typescript
id: string (UUID, PK)
landlord_id: string (UUID, FK → profiles)
property_id: string | null (FK → properties, null if managing all)
full_name: string
phone_number: string
email: string | null
permissions: jsonb (array of permission strings)
is_active: boolean
created_at: timestamp
```

---

## 11. Important Constraints / Non-Negotiables

### Architecture Constraints

1. **Server-First Architecture**
   - All business logic must be server-side ("use server")
   - Client components only for interactivity and forms
   - Never expose business logic to client
   - Supabase client used only in server context

2. **Form Handling Pattern**
   - All forms must use Server Actions with `useActionState`
   - No React form libraries (Formik, React Hook Form, etc.)
   - HTML forms with standard input elements
   - Zod validation for all form inputs
   - Field errors returned as `fieldErrors` in action result

3. **Authorization Enforcement**
   - All services must check user role via `requireLandlord()` or `requireTenant()`
   - All services must check resource ownership (landlord_id match)
   - Never trust client-provided IDs - always verify ownership
   - AppError("FORBIDDEN") for unauthorized access

4. **Type Safety**
   - Strict TypeScript mode enabled
   - All database rows must have Row types
   - All inputs must have input types (CreateInput, UpdateInput)
   - All inputs validated with Zod schemas
   - No `any` types

5. **No Global State Management Library**
   - No Redux, Zustand, Context API for app state
   - Form state via useActionState only
   - Server-side data fetching in components
   - Each component fetches its own data

### Data Model Constraints

1. **Soft Deletes**
   - Use `deleted_at` timestamp for soft deletes
   - All queries must filter `deleted_at IS NULL`
   - Never hard delete data

2. **Audit Trails**
   - All tables must have `created_at` and `updated_at` timestamps
   - Important actions logged in audit_log table
   - Timestamp recorded for approvals, rejections, payments

3. **Immutable Snapshots**
   - Agreement snapshots are immutable (no updates after creation)
   - Store full copies of tenant/property data in snapshots
   - Never reference foreign keys for historical data

4. **Idempotency Keys**
   - All payment operations must have unique idempotency keys
   - Check key existence before creating duplicate payments
   - Prevent double-charging via gateway

### UI/UX Constraints

1. **Tailwind CSS Only**
   - No CSS-in-JS libraries
   - No shadcn/ui or external component libraries
   - All components custom-built with Tailwind
   - Use clsx + tailwind-merge for className merging

2. **Consistent Component API**
   - All form inputs: label, error, helperText props
   - All buttons: variant, size, fullWidth, isLoading props
   - All cards: title, description props
   - No inconsistent prop interfaces

3. **Responsive Design**
   - Mobile-first default
   - lg: breakpoint for desktop navigation
   - No sm: or md: breakpoint usage except for specific cases
   - Test on both mobile and desktop

### Authentication Constraints

1. **Supabase Auth Required**
   - All user authentication via Supabase
   - JWT stored in HTTP-only cookies
   - No custom authentication logic
   - Session validated via `requireUser()` service

2. **Role-Based Access**
   - Only three roles: landlord, tenant, caretaker
   - Enforced at service layer
   - No permission matrix (roles are binary)

### Integration Constraints

1. **Paystack for Payments**
   - All online payments must go through Paystack
   - Use Paystack subaccounts for landlord payouts
   - Webhook validation required for payment verification
   - Idempotency keys prevent duplicate transactions

2. **Supabase for Database & Auth**
   - Only database provider allowed
   - No other services for user management
   - Use Supabase Storage for files
   - RPC calls for complex operations

3. **No API Polling**
   - Use Supabase realtime subscriptions for live updates
   - Prefer server-side data fetching
   - No setInterval/setTimeout for polling

### Performance Constraints

1. **Revalidation Strategy**
   - Use `revalidatePath()` after mutations
   - Only revalidate affected pages
   - No blanket `revalidateTag()` calls
   - Cache strategies: ISR where applicable

2. **Image Optimization**
   - No large unoptimized images
   - Use appropriate formats (WEBP when possible)
   - Resize images server-side before storage

### Deployment Constraints

1. **Vercel Deployment**
   - Build must succeed with `next build`
   - No uninstalled dependencies
   - Environment variables must be set in Vercel
   - Database migrations must be applied before deploy

2. **Environment Variables Required**
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - NEXT_PUBLIC_APP_URL
   - SUPABASE_SERVICE_ROLE_KEY (admin)
   - PAYSTACK_SECRET_KEY
   - PAYSTACK_PUBLIC_KEY
   - TENURO_GATEWAY_ADMIN_FEE_NAIRA
   - RESEND_API_KEY

---

## 12. Known Technical Debt / Caveats

### Incomplete Features

1. **Renewals System**
   - Service exists but logic not implemented
   - No renewal reminder notifications
   - No automatic renewal creation
   - No rent increment handling
   - Status shows 0 upcomingRenewals always

2. **Reports Dashboard**
   - Page is stub only
   - No reporting logic implemented
   - No PDF export functionality
   - Would require significant work

3. **Caretakers Feature**
   - Basic page exists but no functionality
   - No caretaker CRUD operations
   - No permission model for caretaker actions
   - Needs full implementation

4. **Inngest Background Jobs**
   - Configured but currently inactive
   - Route returns "scaffolded" message
   - Job files exist but not wired up
   - Needs backend activation and integration

### Potential Issues

1. **SMS Notifications Not Integrated**
   - SMS channel defined but no provider integrated
   - Only WhatsApp working (via Paystack)
   - Would need Twilio or similar integration

2. **Email Service Partially Integrated**
   - Resend package installed but not fully used
   - Email notifications not sent in most flows
   - Would need full integration with notification system

3. **No Offline Mode**
   - All operations require active internet
   - No service worker or offline caching
   - No sync queue for offline-first operations

4. **Limited Error Recovery**
   - Network errors sometimes not handled gracefully
   - Failed Inngest jobs would need monitoring
   - No automatic retry logic for failed webhooks

### Workarounds & Temporary Solutions

1. **Payment Verification**
   - Relies on Paystack webhook for verification
   - If webhook fails, payment stays "pending"
   - Manual verification would need to be added

2. **PDF Generation**
   - Uses @react-pdf/renderer (heavy, slow)
   - Could be optimized with server-side PDF library
   - No streaming or progressive generation

3. **WhatsApp Integration**
   - Uses Paystack's WhatsApp feature
   - Limited customization of messages
   - No proper WhatsApp Business API integration

### Code Quality Concerns

1. **No Comprehensive Error Logging**
   - Errors logged to console in development
   - No centralized error tracking (no Sentry/similar)
   - Production errors not monitored

2. **Limited Test Coverage**
   - No unit tests written
   - No integration tests
   - No E2E tests
   - All testing manual currently

3. **Database Migrations Not Tracked**
   - `supabase/migrations/` folder is empty
   - SQL schema exists but not versioned
   - No migration history
   - Hard to track schema changes

4. **Validation Duplication**
   - Some validation logic exists in multiple places
   - Could be consolidated into reusable validators
   - Zod schemas are good but could use shared validation utils

### Performance Considerations

1. **PDF Generation Blocking**
   - Receipt/agreement PDF generation is synchronous
   - Large PDFs could timeout on Vercel
   - Should be moved to background job (Inngest)

2. **Large Data Sets**
   - No pagination on tenant/payment lists
   - Could be slow with thousands of records
   - Would benefit from cursor-based pagination

3. **N+1 Query Problem**
   - Some repository queries might be inefficient
   - Should audit Supabase queries for optimization
   - Could use batch loading for related data

### Security Considerations

1. **No Rate Limiting**
   - No rate limiting on auth endpoints
   - Could be abused for brute force
   - Should add rate limiting middleware

2. **No CSRF Protection**
   - Forms rely on same-site cookies only
   - Next.js provides some protection but could be explicit

3. **Limited Input Sanitization**
   - Zod validates format but not all XSS vectors
   - User-provided content displayed without sanitization
   - Should use DOMPurify or similar if rendering user HTML

---

## 13. Pending Roadmap

### Recommended Implementation Order

**Phase 1: Core Fixes (High Priority)**

1. Enable and integrate Inngest background jobs
   - Receipt generation should be async
   - Payment verification should have retry logic
   - Notification sending should be queued

2. Add database migration tracking
   - Document current schema in migrations folder
   - Set up proper migration workflow
   - Version all schema changes

3. Implement comprehensive error logging
   - Integrate Sentry or similar
   - Log errors with context
   - Set up error alerts

**Phase 2: Critical Features (Medium Priority)**

1. Complete Renewals System
   - Implement renewal logic (end date → new tenancy)
   - Add renewal reminders
   - Handle rent increment
   - Track renewal status

2. Add Test Coverage
   - Write unit tests for services
   - Add integration tests for payment flow
   - Create E2E tests for critical paths

3. Implement Caretakers Feature
   - Full CRUD for caretakers
   - Permission model for actions
   - Caretaker dashboard
   - Caretaker rent collection tracking

**Phase 3: Enhancements (Lower Priority)**

1. Complete Reports System
   - Income reports (monthly, yearly)
   - Tenant roster reports
   - Payment history reports
   - Occupancy reports
   - PDF export functionality

2. Add SMS Notifications
   - Integrate Twilio or Africastalking
   - Send SMS for important events
   - Track SMS delivery status

3. Email Integration
   - Complete Resend integration
   - Send receipts via email
   - Send agreement links via email
   - Notification subscriptions

4. Improve Performance
   - Add pagination to lists
   - Optimize database queries
   - Implement caching strategy
   - Add image optimization

5. Offline Support
   - Add service worker
   - Implement offline queue
   - Sync queued actions when online
   - Work offline for read operations

6. Better Paystack Integration
   - Proper webhook error handling
   - Payment reversal/refund handling
   - Better fee calculation
   - Reconciliation reports

**Phase 4: Nice-to-Haves (Enhancement)**

1. Advanced Reporting
   - Financial reports with charts
   - Tax reporting
   - Payment forecasting
   - Tenant analytics

2. Automation Features
   - Automatic rent reminders
   - Automatic agreement generation
   - Automatic renewal creation
   - Late payment notifications

3. Mobile App
   - React Native version
   - Offline-first sync
   - Push notifications
   - Camera for document upload

4. Multi-Language Support
   - Yoruba, Hausa, Igbo translations
   - RTL support if needed
   - Localized number/date formatting

---

## 14. Continuation Instructions For Next AI

### What to Preserve

1. **Architecture Pattern**
   - Keep server-first, server actions pattern
   - Do not introduce global state management
   - Keep authorization checks in services

2. **Code Organization**
   - Maintain folder structure and naming
   - Keep actions, services, repositories separated
   - One component per file (mostly)

3. **Design System**
   - Use exact color codes from tailwind.config.ts
   - Follow spacing and typography rules
   - Maintain responsive breakpoints (lg: primary)

4. **Database Approach**
   - Use Supabase as primary DB
   - Keep soft deletes pattern
   - Maintain type safety with Row and Input types
   - Use RPC for complex operations

5. **Validation Strategy**
   - All inputs validated with Zod
   - Field errors returned as fieldErrors
   - Business logic errors throw AppError

### What to Avoid Changing

1. **Don't introduce new libraries**
   - No form libraries (Formik, React Hook Form)
   - No state management (Redux, Zustand)
   - No UI component libraries (shadcn, Chakra)
   - No animation libraries (Framer Motion, react-spring)

2. **Don't change the folder structure**
   - Don't move services to different location
   - Don't reorganize repository files
   - Don't flatten actions folder

3. **Don't change authentication approach**
   - Keep using Supabase Auth
   - Don't add alternative auth providers
   - Don't implement custom session logic

4. **Don't refactor without necessity**
   - Code duplication okay if avoids tight coupling
   - Keep patterns consistent even if repetitive
   - Don't over-engineer solutions

### Coding Standards to Maintain

1. **TypeScript Strict Mode**
   - No `any` types
   - All functions must have return types
   - All parameters should be typed

2. **Error Handling**
   - Use AppError for business logic errors
   - Return ActionResult objects from actions
   - Always provide user-friendly error messages

3. **Authorization**
   - Always require user/landlord/tenant at start of service function
   - Always check resource ownership before modifying
   - Throw AppError("FORBIDDEN") for unauthorized access

4. **Naming Consistency**
   - camelCase for variables and functions
   - PascalCase for components and types
   - Kebab-case for files and routes
   - Descriptive, not abbreviated names

5. **Zod Validation**
   - Validate all FormData inputs
   - Provide helpful error messages
   - Reuse common schemas from common.schema.ts
   - Export Zod inferred types

### Refactor Philosophy

**Only refactor when:**

- Adding new similar functionality (consolidate patterns)
- Fixing bugs in implementation
- Improving performance with measurable impact
- Reducing security vulnerabilities

**Never refactor for:**

- Personal style preferences
- Simplification that changes patterns
- Experimental library adoption
- "Code cleanliness" without functionality benefit

### Error Prevention Requirements

1. **Authorization**
   - Every service that modifies data must check landlord_id
   - Every page must call requireLandlord() or requireTenant()
   - Never trust client-provided IDs

2. **Data Validation**
   - All FormData must parse through Zod
   - All RPC calls must validate response
   - All user input must be type-checked

3. **State Consistency**
   - Always revalidatePath() after mutations
   - Always verify related data exists before creating references
   - Maintain referential integrity

4. **Payment Safety**
   - All payments must have idempotency keys
   - Check for existing payment before processing
   - Log all payment attempts
   - Use transactions for complex operations

5. **User Experience**
   - All errors must show user-friendly messages
   - All forms must show field-specific errors
   - Loading states for async operations
   - Toast notifications for confirmations

### Testing Requirements Before Release

1. **Critical Path Testing**
   - Login flow (all methods)
   - Property creation flow
   - Tenant creation and approval flow
   - Payment recording (manual and gateway)
   - Receipt generation and sharing

2. **Security Testing**
   - Try to access landlord data as different landlord
   - Try to modify unit you don't own
   - Try to approve tenant not assigned to your property

3. **Error Case Testing**
   - Invalid form inputs
   - Network failures during payment
   - Webhook failure scenarios
   - Database constraint violations

4. **Mobile Testing**
   - Responsive layout on 375px width
   - Touch-friendly buttons and forms
   - Bottom navigation on mobile
   - Sidebar hidden/shown appropriately

### Common Pitfalls to Avoid

1. **Don't fetch data in client components**
   - Keep data fetching in server components
   - Pass data as props to client components

2. **Don't use fetch in server components**
   - Use Supabase client directly
   - Import database directly in server components

3. **Don't expose secrets to client**
   - API keys must be NEXT*PUBLIC* or server-only
   - Check env variable prefixes

4. **Don't trust client data**
   - Always validate FormData
   - Always check resource ownership
   - Never assume user role

5. **Don't skip authorization checks**
   - Even if UI doesn't show option, API should check
   - Assume users will try to hack
   - Default to deny, explicitly allow

### Documentation to Update

When making changes:

1. Update this handoff document with any architectural changes
2. Add comments to complex business logic
3. Document any new environment variables
4. Record any new database schema changes in migration comments
5. Update README if adding major features

### Communication Standards

For future developers:

- Use clear, descriptive commit messages
- Include issue numbers if available
- Document breaking changes
- Add migration instructions for data changes
- Keep this handoff current

---

## Conclusion

This Tenuro project follows a clean, server-first architecture with a focus on data validation, authorization, and user experience. The codebase is organized into clear layers (actions → services → repositories → database) with strong type safety throughout.

Any continuation work should maintain these architectural patterns, preserve the design system consistency, and prioritize security and data integrity. The pending features (Renewals, Reports, Caretakers, Inngest jobs) represent the next logical development steps.

**Key principle for continuation:** "Preserve the patterns, extend the functionality."
