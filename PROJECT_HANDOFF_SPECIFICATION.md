# PROJECT HANDOFF SPECIFICATION

## 1. Project Overview

**Project Name**: BOPA (Boldverse Property App)

**Project URL**: https://boldverseproperty.com

**Core Purpose**: BOPA is a comprehensive property management platform purpose-built for Nigerian landlords to digitize and streamline rental property operations. The platform enables end-to-end management of tenant lifecycles, rent collection, receipt and agreement generation, payment tracking, and regulatory compliance across multi-property portfolios.

**Target Users**:

- **Primary**: Landlords managing single to multiple properties across Nigeria
- **Secondary**: Property managers, caretakers, and agents managing on landlord's behalf
- **Tertiary**: Tenants activating accounts, completing KYC, accepting agreements, making payments
- **Ancillary**: Anonymous public users generating receipts and agreements without accounts

**Business Domain Context**:

- Nigerian property rental market lacks standardized digital tooling
- Rent receipt generation is critical for legal compliance and dispute resolution
- Tenancy agreements require formalization but most landlords lack templates
- Rent payment verification and tracking prevents disputes
- Tenant onboarding/KYC is largely manual, creating friction
- Payment processing requires integration with Nigerian payment providers (Paystack)
- Multi-party commission structures (landlord-tenant-agent-platform) require ledger-based accounting

**Product Philosophy**:

- **Accessibility**: Serve both tech-savvy and non-technical landlords with intuitive UX
- **Compliance-First**: Generate legally-compliant documents (receipts, agreements)
- **Documentation**: Centralize all property/tenant/payment records for dispute prevention
- **Automation**: Reduce manual data entry through smart defaults and templates
- **Trust**: Build user confidence through transparent ledgers, audit trails, and WhatsApp integration
- **Localization**: Nigeria-specific: NGN currency, local phone formats, WhatsApp-first communication
- **Inclusivity**: Support paid features via freemium model; public tools accessible without login

---

## 2. Tech Stack

### **Frontend**

- **Framework**: Next.js 16.2.4 (App Router, React 19.2.4)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 (@tailwindcss/postcss)
- **UI Icons**: Lucide React 1.11.0
- **Font**: Plus Jakarta Sans (Google Fonts via next/font)
- **Form Utilities**: clsx, tailwind-merge

### **Backend**

- **API Layer**: Next.js API Routes + Server Actions
- **Server Actions**: React 19 "use server" pattern for server-side form submission
- **Runtime**: Node.js (Vercel deployment)
- **Job Queue**: Inngest 4.2.4 for scheduled tasks and background jobs

### **Database & Storage**

- **Primary Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (phone + password, email + password, magic link, OTP)
- **File Storage**: Supabase Storage (PDFs, KYC documents, photos)
- **Cache**: Browser cache for form state; ISR for static generation

### **State Management & Forms**

- **Client State**: React hooks (useState, useReducer, useContext)
- **Server State**: React's useActionState for server-side form submission
- **Form Submission**: Native HTML forms + FormData API
- **Form Validation**: Zod 4.3.6 (client-side and server-side)
- **Cache Revalidation**: Next.js revalidatePath and revalidateTag

### **Payment Processing**

- **Primary Gateway**: Paystack for rent payments
- **Webhook Processing**: Inngest for async payment confirmation
- **Verification**: Payment verification service with idempotency keys

### **PDF & Document Generation**

- **PDF Library**: @react-pdf/renderer 4.5.1 (server-side PDF generation)
- **Templates**: JSX-based templates for receipts, agreements, quit notices
- **Watermarking**: Text watermarks applied at generation time

### **Communication**

- **Email**: Resend 6.12.2 for transactional email
- **Phone**: OTP dispatch via Supabase (SMS provider TBD)
- **WhatsApp**: Web-based links (wa.me URLs) for message sharing

### **Date/Time**

- **Utilities**: date-fns 4.1.0 for date calculations and formatting
- **Timezone**: All dates stored in UTC; displayed in user's locale

### **Deployment & Infrastructure**

- **Host**: Vercel (Next.js native deployment)
- **Environment Variables**: .env.local for development
- **Cron Jobs**: Vercel Cron (rent charge generation, renewal reminders)
- **SEO**: Next.js metadata API for dynamic meta tags and Open Graph

### **Development Tools**

- **Linting**: ESLint 9 + ESLint-config-next
- **Formatting**: Prettier 3.8.3
- **Code Quality**: TypeScript strict mode enabled

---

## 3. Architecture Overview

### **High-Level Architecture Pattern: Layered with Clear Separation**

```
┌─────────────────────────────────────┐
│  CLIENT (React 19 + Next.js SSR)    │
│  ├─ App Router (file-based routing) │
│  ├─ Components (server + client)    │
│  └─ useActionState hooks            │
└──────────────┬──────────────────────┘
               │ FormData + HTTP
┌──────────────▼──────────────────────┐
│  SERVER ACTIONS ("use server")      │
│  ├─ Input Parsing (FormData)        │
│  ├─ Zod Validation                  │
│  └─ Error Handling                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  SERVICE LAYER                      │
│  ├─ Business Logic                  │
│  ├─ Workflow Orchestration          │
│  ├─ Ledger Calculations             │
│  ├─ PDF Generation                  │
│  └─ Async Job Dispatch              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  REPOSITORY LAYER                   │
│  ├─ Supabase Client Access          │
│  ├─ Query Building                  │
│  ├─ Type Safety (generated types)   │
│  └─ Transaction Management          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  DATABASE (Supabase PostgreSQL)     │
│  ├─ Core Tables (properties, etc)   │
│  ├─ Ledgers & Transactions          │
│  ├─ Audit Logs                      │
│  └─ RLS Policies                    │
└─────────────────────────────────────┘
```

### **Data Flow Architecture**

1. **User Action** → Component form submission
2. **Client Validation** → Zod schema (optional, mostly on server)
3. **Server Action** → FormData parsed + Zod validated
4. **Authorization Check** → `requireLandlord()`, `requireTenant()`, etc.
5. **Service Layer** → Business logic, calculations, integrations
6. **Repository Access** → Supabase queries with RLS enforcement
7. **Async Jobs** → Inngest for background work (emails, payments)
8. **Response** → ActionResult type (ok: true/false + message + data)
9. **Revalidation** → revalidatePath() invalidates Next.js cache
10. **UI Update** → useActionState updates component state
11. **Toast Notification** → ActionResultToast displays result

### **Component Architecture Philosophy**

**Server Components by Default**:

- All components are server components unless marked with "use client"
- Server components can access databases and secrets directly
- Reduces JavaScript bundle size

**Client Components Reserved For**:

- Forms requiring interactive state (useActionState, useState)
- Rich UI interactions (dropdowns, modals, tooltips)
- Real-time updates or polling
- useContext and client hooks

**Component Hierarchy**:

```
Layout (server)
  └─ PageHeader (ui)
  └─ Card (ui)
    └─ CardHeader, CardTitle, CardContent, CardFooter
  └─ Form (client)
    └─ Input/Select/Textarea (form inputs)
    └─ Button (submission or action)
  └─ List Displays
    └─ StatusPill (badge styling)
    └─ StatCard (metrics)
  └─ Empty/Loading/Error States
```

### **State Management Architecture**

**Primary Pattern: Server Actions + useActionState**

```typescript
// Component uses useActionState hook to manage server action state
const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState,
);

// Server action returns ActionResult<T>
type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>; // Zod field validation errors
  data?: T;
};

// Component submits form via formAction
<form action={formAction}>
  {/* inputs mapped to FormData */}
  <Input error={state.fieldErrors?.fieldName?.[0]} />
  <Button type="submit" isLoading={isPending} />
</form>
```

**Minimal Client State**:

- Form inputs managed by browser (FormData)
- Only UI state (isPending, errors) managed by React
- All business state lives on server (database)

**Cache Invalidation Pattern**:

```typescript
// After mutation completes, invalidate related pages
revalidatePath("/properties");
revalidatePath(`/properties/${propertyId}`);
revalidatePath("/overview");
```

### **API/Service Layer Structure**

**Service Organization**:

- `src/server/services/*`: Business logic, orchestration, integrations
- `src/server/repositories/*`: Database access layer (Supabase queries)
- `src/server/validators/*`: Zod schemas for input validation
- `src/actions/*`: Server Actions (HTTP entry points)

**Service Characteristics**:

- Pure functions with dependencies injected (Supabase client)
- Throw `AppError` for user-facing errors
- Log errors with context for debugging
- Support idempotency for payment-related operations

**Example Service Pattern**:

```typescript
// services/receipts.service.ts
export async function generateReceiptForCurrentLandlord(
  input: GenerateReceiptInput,
): Promise<Receipt> {
  const landlord = await requireLandlord(); // Auth check
  const supabase = createSupabaseServerClient();

  // Fetch related entities
  const payment = await getPaymentById(supabase, input.paymentId);

  // Business logic
  const receiptNumber = generateReceiptNumber();
  const receiptDate = new Date();

  // Persist
  const receipt = await createReceipt(supabase, {
    landlordId: landlord.id,
    paymentId: input.paymentId,
    receiptNumber,
    receiptDate,
  });

  // Async work (dispatch but don't wait)
  await sendReceiptEmailViaInngest(receipt.id);

  return receipt;
}
```

### **Validation & Error Handling Approach**

**Validation Strategy**:

- **Primary**: Server-side Zod validation on all inputs
- **Secondary**: Client-side validation optional (HTML5 + Zod)
- **Database Constraints**: PostgreSQL CHECK constraints for data integrity

**Error Handling Flow**:

1. **Try-Catch**: All actions wrapped in try-catch
2. **AppError Type**: Business errors throw AppError(code, userMessage, httpStatus)
3. **Zod Validation Errors**: Caught and transformed to field errors
4. **Database Errors**: Mapped to user-friendly messages via ERROR_MESSAGES
5. **Response**: ActionResult with ok: false + message + optional fieldErrors

**Error Mapping**:

```typescript
// PostgreSQL error codes mapped to user messages
23505: "This record already exists."
23503: "This action could not be completed because a related record is missing."
23502: "Some required information is missing."
23514: "Some information does not meet the required rule."
42501: "You do not have permission to perform this action."
PGRST116: "We could not find the record you are trying to access."
```

---

## 4. Project Structure

### **Root-Level Organization**

```
tenuro/
├── src/
│   ├── app/                    # Next.js App Router pages and layouts
│   ├── actions/                # Server actions (mutation handlers)
│   ├── components/             # React components (server + client)
│   ├── lib/                    # Shared utilities and helpers
│   ├── server/                 # Backend-only code (never bundled to client)
│   └── proxy.ts                # API request proxying (if needed)
│
├── public/                     # Static assets (images, fonts, etc.)
├── supabase/                   # Database migrations and config
├── .env.local                  # Local environment variables (not in git)
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.ts          # Tailwind CSS theme
├── postcss.config.mjs          # PostCSS configuration
├── eslint.config.mjs           # ESLint rules
├── vercel.json                 # Vercel deployment config (cron jobs)
├── package.json                # Dependencies and scripts
└── README.md                   # Project documentation
```

### **`src/app/` — Next.js App Router Structure**

**Route Organization** (role-based):

```
app/
├── layout.tsx                  # Root layout (metadata, providers, fonts)
├── page.tsx                    # Homepage (marketing or redirect)
├── globals.css                 # Global Tailwind styles
├── robots.ts                   # SEO robots.txt generation
├── sitemap.ts                  # SEO sitemap generation
│
├── (auth)/                     # Public auth routes (not in navbar)
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── verify/
│   └── layout.tsx
│
├── (tenant)/                   # Tenant dashboard and features
│   ├── tenant/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── payments/
│   │   └── [sections...]
│   └── layout.tsx
│
├── (landlord)/                 # Landlord dashboard and features
│   ├── overview/
│   ├── properties/
│   ├── tenants/
│   ├── payments/
│   ├── renewals/
│   ├── caretakers/
│   ├── reports/
│   ├── settings/
│   └── [sections...]
│
├── (agent)/                    # Agent-specific features
│   ├── agent/
│   │   ├── overview/
│   │   ├── commissions/
│   │   └── [agent sections...]
│   └── layout.tsx
│
├── api/                        # API route handlers
│   ├── cron/                   # Scheduled tasks
│   │   ├── rent-charges.ts
│   │   └── renewal-reminders.ts
│   ├── webhooks/               # Third-party webhooks
│   │   ├── paystack/
│   │   └── [other webhooks...]
│   ├── inngest/                # Inngest event handlers
│   ├── files/                  # File upload/download endpoints
│   └── onboarding/             # Onboarding API routes
│
├── a/                          # Public short-link routes (agents, etc.)
│   └── [slug]/page.tsx
│
├── t/                          # Public tenant-facing short links
│   ├── onboarding/[token]/     # Tenant onboarding link
│   └── [path...]/page.tsx
│
├── receipt-generator/          # Public receipt generation (unauthenticated)
│   ├── page.tsx
│   ├── download/[id]/
│   └── claim/[id]/
│
├── agreement-generator/        # Public agreement generation (unauthenticated)
│   ├── page.tsx
│   ├── download/[id]/
│   └── claim/[id]/
│
├── onboarding/                 # Shared onboarding flows
├── auth/                       # Auth pages (redirected from (auth) route)
├── privacy/                    # Legal pages
├── refund-policy/
├── terms/
└── register/                   # Registration landing
```

**Key Pattern**: Parallel route groups like `(auth)`, `(landlord)`, `(tenant)` allow shared layouts and navigation based on role without appearing in URL.

### **`src/actions/` — Server Actions**

**File Naming Convention**:

- `{feature}.actions.ts`: Contains server action functions for a feature
- `{feature}.state.ts`: Contains TypeScript type definitions for action state/results

**Structure Within Action File**:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import { someService } from "@/server/services/...";
import { someSchema } from "@/server/validators/...";

// 1. Define action state type (used by useActionState)
export type FeatureActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  data?: SomeData;
};

// 2. Define individual server action functions
export async function createFeatureAction(
  _previousState: FeatureActionState,
  formData: FormData,
): Promise<FeatureActionState> {
  try {
    // Validate input
    const parsed = someSchema.parse({
      field1: formData.get("field1"),
      field2: formData.get("field2"),
    });

    // Call service
    const result = await someService.doSomething(parsed);

    // Revalidate cache
    revalidatePath("/features");

    return successResult("Feature created successfully.", result);
  } catch (error) {
    const result = errorResult(error);
    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
```

**Actions by Feature** (24 action files + state files):

- `auth.actions.ts`: Login, register, logout, OTP, magic link
- `tenants.actions.ts`: Create, update, approve, reject tenants
- `properties.actions.ts`: Create, update properties
- `units.actions.ts`: Manage property units
- `tenancies.actions.ts`: Create, renew, terminate tenancies
- `tenancy-agreements.actions.ts`: Create, accept agreements
- `payments.actions.ts`: Initialize, verify, record payments
- `receipts.actions.ts`: Generate receipts (auth)
- `public-receipt-generator.actions.ts`: Generate receipts (public)
- `public-agreement-generator.actions.ts`: Generate agreements (public)
- `renewals.actions.ts`: Manage tenancy renewals
- `quit-notices.actions.ts`: Create quit notices
- `property-rules.actions.ts`: Set property rules/restrictions
- `caretakers.actions.ts`: Manage caretakers
- `onboarding.actions.ts`: Tenant onboarding workflows
- `tenant-activation.actions.ts`: Tenant account activation
- `subscriptions.actions.ts`: Manage subscriptions (empty stub)
- `app-fee-payment.actions.ts`: App fee payments
- `landlord-tenancy-charges.actions.ts`: Landlord-specific charges
- `notifications.actions.ts`: Notification preferences
- `agent-profile.actions.ts`: Agent profile management
- `agent-property-listings.actions.ts`: Agent property listings
- `agent-tenant-onboarding.actions.ts`: Agent tenant onboarding

### **`src/components/` — React Components**

**Organization by Feature**:

```
components/
├── ui/                         # Reusable UI primitives (no business logic)
│   ├── button.tsx              # Button (primary, secondary, danger, ghost variants)
│   ├── card.tsx                # Card container with header/title/content/footer
│   ├── input.tsx               # Text input with label, error, disabled state
│   ├── select.tsx              # Dropdown select with options
│   ├── textarea.tsx            # Multi-line text input
│   ├── badge.tsx               # Small label badges
│   ├── status-pill.tsx         # Colored status indicators
│   ├── stat-card.tsx           # Metric display card
│   ├── page-header.tsx         # Page title and description
│   ├── section-card.tsx        # Section divider/card
│   ├── currency-input.tsx      # Number input for money
│   ├── empty-state.tsx         # No data message
│   ├── error-state.tsx         # Error display
│   ├── loading-state.tsx       # Loading skeleton
│   ├── toast.tsx               # Toast notification
│   ├── toast-provider.tsx      # Toast context provider
│   ├── use-toast.ts            # Toast hook
│   ├── action-result-toast.tsx # Auto-display action results
│   ├── whatsapp-send-button.tsx# WhatsApp sharing button
│   └── trust-notice.tsx        # Security/trust messaging
│
├── layout/                     # Layout and navigation components
│   ├── sidebar.tsx
│   ├── navbar.tsx
│   ├── breadcrumbs.tsx
│   └── [layout sections...]
│
├── auth/                       # Authentication components
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── otp-form.tsx
│   └── [auth flows...]
│
├── property/                   # Property management components
│   ├── property-form.tsx
│   ├── property-card.tsx
│   ├── unit-form.tsx
│   └── [property sections...]
│
├── tenant/                     # Tenant management components
│   ├── tenant-shell-form.tsx   # Create minimal tenant
│   ├── tenant-activation-form.tsx # Activate tenant account
│   ├── tenant-onboarding-form.tsx # Full tenant profile
│   ├── tenant-card.tsx         # Tenant display card
│   ├── tenant-status-card.tsx  # Status indicator
│   ├── tenant-kyc-file-upload.tsx # Document upload
│   ├── onboarding-invite-card.tsx # Invitation to complete profile
│   └── [tenant sections...]
│
├── tenancy/                    # Tenancy/lease management
│   ├── tenancy-form.tsx        # Create/update lease
│   ├── tenancy-agreement-document-card.tsx
│   ├── tenant-agreement-acceptance-form.tsx
│   ├── tenant-balance-card.tsx # Outstanding balance display
│   └── [tenancy sections...]
│
├── payment/                    # Payment processing
│   ├── payment-form.tsx
│   ├── payment-initialization.tsx
│   └── [payment sections...]
│
├── public-tools/               # Public receipt/agreement generators
│   ├── receipt-generator-form.tsx
│   ├── agreement-generator-form.tsx
│   ├── generated-receipt-result.tsx
│   ├── generated-agreement-result.tsx
│   ├── public-receipt-signup-form.tsx
│   ├── public-agreement-signup-form.tsx
│   ├── free-tool-account-prompt.tsx
│   ├── claimed-public-receipts-list.tsx
│   └── [public tool sections...]
│
├── property-rules/             # Property restrictions/rules
│   └── [property rule components...]
│
├── quit-notices/               # Move-out notice components
│   └── [quit notice sections...]
│
├── renewal/                    # Tenancy renewal components
│   └── [renewal sections...]
│
├── onboarding/                 # Onboarding flow components
│   ├── onboarding-shell.tsx    # Container
│   ├── onboarding-progress.tsx # Step indicator
│   ├── onboarding-step-card.tsx # Step container
│   └── [onboarding sections...]
│
├── legal/                      # Legal/policy pages
│   ├── privacy-policy.tsx
│   ├── terms-of-service.tsx
│   └── [legal sections...]
│
└── agent/                      # Agent-specific components
    └── [agent sections...]
```

**Component Patterns**:

- All UI primitives (button, card, input) exported from `ui/` folder
- Feature-specific components in their own folder (tenant/, property/, etc.)
- Server components by default unless `"use client"`
- Props typed with TypeScript interfaces
- Accessible markup (ARIA labels, semantic HTML)
- Responsive design (mobile-first Tailwind classes)

### **`src/server/` — Backend-Only Code**

**Structure**:

```
server/
├── services/                   # Business logic layer (52 service files)
│   ├── tenants.service.ts      # Tenant creation, approval, updates
│   ├── tenancies.service.ts    # Tenancy creation, renewal, termination
│   ├── payments.service.ts     # Payment recording and allocation
│   ├── receipts.service.ts     # Receipt generation and retrieval
│   ├── receipts-pdf.service.tsx # PDF rendering for receipts
│   ├── public-receipt-generator.service.ts # Public receipt generation
│   ├── public-receipt-pdf.service.tsx
│   ├── tenancy-agreements.service.ts
│   ├── tenancy-agreement-pdf.service.tsx
│   ├── public-agreement-generator.service.ts
│   ├── public-agreement-pdf.service.tsx
│   ├── quit-notices.service.ts
│   ├── quit-notice-pdf.service.tsx
│   ├── property-rules.service.ts
│   ├── gateway-payment.service.ts  # Paystack integration
│   ├── payment-verify.service.ts
│   ├── paystack.service.ts
│   ├── subscriptions.service.ts    # Subscription management (empty)
│   ├── app-fee-payment.service.ts
│   ├── ledger.service.ts           # Ledger calculations
│   ├── landlord-bank.service.ts
│   ├── landlord-tenancy-charges.service.ts
│   ├── agent-*.service.ts          # Agent-related services
│   ├── otp.service.ts              # OTP generation
│   ├── otp-dispatch.service.ts     # OTP sending
│   ├── session.service.ts
│   ├── session-token.service.ts
│   ├── auth.service.ts             # Auth helpers
│   ├── onboarding.service.ts       # Tenant onboarding flow
│   ├── tenant-activation.service.ts
│   ├── overview.service.ts         # Dashboard data
│   ├── tenant-dashboard.service.ts
│   ├── agent-dashboard.service.ts
│   ├── properties.service.ts
│   ├── units.service.ts
│   ├── notifications.service.ts
│   ├── notification-queue.service.ts
│   ├── renewal-reminders.service.ts
│   ├── renewals.service.ts
│   ├── rent-charges.service.ts     # Scheduled rent charge posting
│   ├── whatsapp.service.ts         # WhatsApp integration
│   ├── pdf.service.ts              # PDF utilities
│   ├── files.service.ts            # File upload/download
│   ├── storage.service.ts          # Supabase storage
│   ├── audit.service.ts            # Audit event logging
│   ├── audit-log.service.ts
│   ├── idempotency.service.ts      # Idempotency keys
│   ├── public-tool-onboarding.service.ts
│   ├── public-agreement-imports.service.ts
│   ├── public-receipt-imports.service.ts
│   ├── tenant-agent-commission.service.ts
│   ├── agent-processing-fee.service.ts
│   ├── agent-profile.service.ts
│   ├── gateway-payment-webhook.service.ts
│   └── [other services...]
│
├── repositories/               # Database access layer (36 repos)
│   ├── profiles.repository.ts
│   ├── properties.repository.ts
│   ├── units.repository.ts
│   ├── tenants.repository.ts
│   ├── tenancies.repository.ts
│   ├── tenancy-agreements.repository.ts
│   ├── payments.repository.ts
│   ├── receipts.repository.ts
│   ├── public-tool-leads.repository.ts
│   ├── public-agreement-generator.repository.ts
│   ├── quit-notices.repository.ts
│   ├── property-rules.repository.ts
│   ├── caretakers.repository.ts
│   ├── subscriptions.repository.ts
│   ├── app-fee-payment.repository.ts
│   ├── audit-log.repository.ts
│   ├── audit.repository.ts
│   ├── ledger.repository.ts
│   ├── notifications.repository.ts
│   ├── gateway-payment.repository.ts
│   ├── gateway-payment-intents.repository.ts
│   ├── gateway-payment-event.repository.ts
│   ├── otp.repository.ts
│   ├── onboarding.repository.ts
│   ├── tenant-activation.repository.ts
│   ├── tenant-dashboard.repository.ts
│   ├── payment-context.repository.ts
│   ├── payment-allocations.repository.ts
│   ├── renewals.repository.ts
│   ├── landlord-paystack.repository.ts
│   ├── agent-paystack.repository.ts
│   ├── agent-profile.repository.ts
│   ├── agent-property-listings.repository.ts
│   ├── agent-tenant-onboarding.repository.ts
│   ├── agent-processing-fee.repository.ts
│   ├── guarantors.repository.ts
│   └── [other repos...]
│
├── validators/                 # Zod validation schemas (23 schema files)
│   ├── common.schema.ts        # Shared schemas (phone, password, date)
│   ├── auth.schema.ts          # Auth input validation
│   ├── tenant.schema.ts
│   ├── tenancy.schema.ts
│   ├── tenancy-agreement.schema.ts
│   ├── payment.schema.ts
│   ├── property.schema.ts
│   ├── unit.schema.ts
│   ├── onboarding.schema.ts
│   ├── public-receipt-generator.schema.ts
│   ├── public-agreement-generator.schema.ts
│   ├── compliance.schema.ts
│   ├── subscription.schema.ts
│   ├── notification.schema.ts
│   ├── renewal.schema.ts
│   ├── property-rule.schema.ts
│   ├── quit-notice.schema.ts
│   ├── caretaker.schema.ts
│   ├── agent.schema.ts
│   ├── agent-property-listing.schema.ts
│   ├── agent-tenant-onboarding.schema.ts
│   ├── file.schema.ts
│   ├── landlord-tenancy-charges.schema.ts
│   └── [other schemas...]
│
├── types/                      # Shared TypeScript types
│   ├── auth.types.ts
│   ├── payment.types.ts
│   ├── entities.types.ts
│   └── [other types...]
│
├── errors/                     # Error handling
│   ├── app-error.ts            # Custom AppError class
│   ├── result.ts               # ActionResult type + errorResult/successResult
│   ├── error-map.ts            # Error code to message mapping
│   └── [error utilities...]
│
├── utils/                      # Helper functions
│   ├── phone.ts                # Phone number normalization
│   ├── date.ts                 # Date utilities
│   ├── money.ts                # Currency formatting
│   ├── validation.ts           # Validation helpers
│   └── [other utilities...]
│
├── constants/                  # Enums and constants
│   ├── audit-events.ts         # Audit event types
│   └── [other constants...]
│
├── supabase/                   # Supabase client initialization
│   ├── admin.ts                # Admin client (server key)
│   └── server.ts               # Server client (user session)
│
└── jobs/                       # Background job definitions (Inngest)
    ├── [...job definitions...]
```

### **`src/lib/` — Shared Utilities**

```
lib/
├── cn.ts                       # clsx + tailwind-merge for conditional classes
├── navigation.ts               # Navigation constants (LANDLORD_NAVIGATION, etc.)
├── status-copy.ts              # Status label mappings
├── receipt-generator-locations.ts # Pre-defined locations for receipts
└── agreement-generator-seo.ts  # SEO metadata for agreement generator
```

### **`supabase/` — Database Migrations**

```
supabase/
└── migrations/
    └── 20260511090715_lead_generation_subscriptions.sql
        ├── Type definitions (enums)
        ├── Table definitions
        │   ├── public_tool_leads
        │   ├── public_generated_receipts
        │   ├── public_generated_agreements
        │   ├── subscriptions
        │   ├── subscription_payments
        │   ├── receipt_usage_events
        │   └── agreement_usage_events
        ├── Index definitions
        ├── Trigger definitions (updated_at)
        ├── RLS policies
        └── [existing tables from prior migrations]
```

---

## 5. Implemented Features

### **Complete/Fully Implemented Features**

#### **Authentication & Authorization**

- ✅ Phone + password registration (SMS OTP optional)
- ✅ Phone + password login
- ✅ Email + password registration
- ✅ Email + password login
- ✅ Magic link authentication (email)
- ✅ Legacy OTP-based login (kept for backward compatibility)
- ✅ Session management (Supabase Auth)
- ✅ Role-based access control (landlord, tenant, agent, caretaker)
- ✅ Profile creation and management
- ✅ Logout and session termination

#### **Property Management**

- ✅ Create properties (name, address, city, state)
- ✅ View properties (list and detail)
- ✅ Update property details
- ✅ Add/manage property units (rooms, flats, sections)
- ✅ Set rent amounts per unit (monthly and annual)
- ✅ Define property rules/restrictions (no pets, no business, generator rules, etc.)
- ✅ Track unit occupancy status (vacant/occupied)

#### **Tenant Management**

- ✅ Create tenant shell (minimal profile: name, phone, email)
- ✅ Full tenant onboarding (KYC: ID, photo, employment, family, etc.)
- ✅ Approve/reject tenant applications
- ✅ Update tenant details (home address, occupation, employer)
- ✅ Add landlord notes to tenant records
- ✅ View tenant list by landlord
- ✅ View individual tenant detail pages
- ✅ Activate tenant accounts (link tenant to user account)
- ✅ Archive/deactivate tenants

#### **Tenancy/Lease Management**

- ✅ Create tenancies (link tenant + unit + rent amount + start date)
- ✅ Define tenancy duration (6 months, 1 year, 2 years)
- ✅ Calculate tenancy end date based on duration
- ✅ View active tenancies by landlord
- ✅ View tenancy details (parties, lease terms, balance)
- ✅ Terminate tenancies
- ✅ Renew tenancies (extend for new period)
- ✅ Track renewal urgency (overdue, due today, within 30/60/90 days)
- ✅ Auto-post rent charges (scheduled via cron)

#### **Rent Payment Processing**

- ✅ Initialize rent payment (create payment record)
- ✅ Paystack payment gateway integration
- ✅ Payment authorization URL generation
- ✅ Webhook processing for payment confirmation (Inngest)
- ✅ Manual payment recording (bank transfer, cash)
- ✅ Payment verification and reconciliation
- ✅ Partial payment support
- ✅ Payment reversal/refund handling
- ✅ Idempotency for duplicate protection

#### **Receipt Generation & Management**

- ✅ Generate receipts for authenticated landlords
- ✅ Public receipt generator (without login)
- ✅ Receipt number generation (auto-increment format)
- ✅ Receipt PDF export with watermark
- ✅ Receipt download link generation (with expiry)
- ✅ WhatsApp sharing of receipt (generic link)
- ✅ Claim public receipt into user account
- ✅ Store claimed receipts in account
- ✅ Receipt usage event tracking (generated, downloaded, shared, claimed)

#### **Tenancy Agreement Management**

- ✅ Generate agreements for authenticated landlords
- ✅ Public agreement generator (without login)
- ✅ Agreement PDF export with watermark
- ✅ Agreement customization (property use, rent frequency, special terms, property rules)
- ✅ Agreement download link generation (with expiry)
- ✅ WhatsApp sharing of agreement (generic link)
- ✅ Tenant acceptance of agreement workflow
- ✅ Claim public agreement into user account
- ✅ Store claimed agreements in account
- ✅ Agreement usage event tracking

#### **Quit Notices / Move-Out Notices**

- ✅ Generate quit notice templates
- ✅ Define notice period (30, 60, 90 days)
- ✅ Quit notice PDF generation
- ✅ WhatsApp sharing
- ✅ Tenant notification tracking

#### **Payment Tracking & Ledgers**

- ✅ Ledger-based accounting system (all payments recorded)
- ✅ Balance calculations (outstanding balance, overpaid, on-time)
- ✅ Payment allocation (auto-allocate to periods)
- ✅ Arrears tracking
- ✅ Payment history view by tenancy
- ✅ Financial overview per property
- ✅ Multi-currency support (NGN default)

#### **Tenant Onboarding Workflow**

- ✅ Generate onboarding link (WhatsApp shareable)
- ✅ Tenant completes profile via link (no login required)
- ✅ KYC document uploads (ID, passport photo)
- ✅ Behavioral questionnaire (pets, occupants, income, business, etc.)
- ✅ Tenant activation (convert to active account)
- ✅ Email notifications after completion

#### **Tenant Activation**

- ✅ Invite tenant to create account
- ✅ Email verification
- ✅ Tenant account creation (phone or email + password)
- ✅ Link tenant to existing profile
- ✅ Tenant dashboard access

#### **Agent Features** (Partial)

- ✅ Agent profile management
- ✅ Agent property listings (manage commissions)
- ✅ Agent tenant onboarding workflows
- ✅ Commission tracking and calculation
- ✅ Processing fee management
- ✅ Paystack integration for agent payouts

#### **Caretaker Management**

- ✅ Assign caretakers to properties
- ✅ Caretaker account creation
- ✅ Caretaker permissions/roles
- ✅ Activity tracking

#### **Public Tools & Lead Generation**

- ✅ Public receipt generator (no auth required)
- ✅ Public agreement generator (no auth required)
- ✅ Lead capture from public tools
- ✅ Lead status tracking (anonymous, account_created, attached, discarded)
- ✅ Lead-to-account conversion (claim receipt/agreement)
- ✅ Usage event tracking (engagement metrics)
- ✅ Subscription prompts for free users

#### **Subscriptions** (Schema/DB exists, API partially complete)

- ✅ Subscription table setup
- ✅ Plan types (free, basic, premium)
- ✅ Subscription payments table
- ✅ Billing period tracking

#### **Dashboard & Reporting**

- ✅ Landlord overview (key metrics: properties, tenants, payments)
- ✅ Tenant dashboard (payments due, agreements, receipts)
- ✅ Agent dashboard (listings, commissions)
- ✅ Activity logs (audit trail of all actions)
- ✅ Reports structure (empty, ready for implementation)

#### **WhatsApp Integration**

- ✅ wa.me link generation for document sharing
- ✅ Pre-filled message templates
- ✅ Tenant contact collection (phone numbers)
- ⚠️ **CAVEAT**: Currently generates generic wa.me link (no recipient pre-filled) — phone data collected but not used in WhatsApp URL

#### **Audit & Compliance**

- ✅ Audit logging (all entity changes tracked)
- ✅ Audit event types (created, updated, deleted, etc.)
- ✅ Actor tracking (who made the change)
- ✅ Timestamp tracking
- ✅ Metadata storage for change details

#### **File Management**

- ✅ File upload to Supabase Storage
- ✅ File type validation
- ✅ File size validation
- ✅ KYC document storage
- ✅ PDF generation and storage

#### **Email Communications** (via Resend)

- ✅ Welcome emails
- ✅ Payment confirmation emails
- ✅ Receipt delivery emails
- ✅ Agreement delivery emails
- ✅ Renewal reminders
- ✅ Onboarding invitations

#### **Scheduled Jobs** (Inngest + Vercel Cron)

- ✅ Rent charge posting (daily at 2 AM)
- ✅ Renewal reminders (daily at 6 AM)
- ✅ Payment webhook processing (async)
- ✅ Email queue processing

#### **Database & Infrastructure**

- ✅ Supabase PostgreSQL setup
- ✅ Row-level security (RLS) policies
- ✅ Database triggers (updated_at)
- ✅ Indexes for query optimization
- ✅ Type generation from Supabase
- ✅ Vercel cron job integration
- ✅ Environment variable management

#### **SEO & Metadata**

- ✅ Dynamic metadata generation (per page)
- ✅ Open Graph tags
- ✅ Twitter card tags
- ✅ robots.txt generation
- ✅ sitemap.ts generation
- ✅ Canonical URL tags

---

## 6. In-Progress / Partial Features

### **Features with Schema but Incomplete Implementation**

#### **Subscription Management**

- **Status**: Database schema exists; service and API mostly empty
- **Current State**:
  - Tables created: `subscriptions`, `subscription_payments`
  - Plan types defined: free, basic, premium
  - Billing period tracking ready
  - Paystack integration structure in place
- **Missing**: Subscription creation, renewal logic, plan enforcement, feature gating per plan
- **Notes**: Free users have access to public tools; paid tiers not yet enforced

#### **Reports & Analytics**

- **Status**: Dashboard structure exists; report generation not implemented
- **Current State**: Reports route exists; placeholder for future implementation
- **Missing**:
  - Revenue reports
  - Property performance reports
  - Tenant payment analytics
  - Payment collection rates
  - Arrears analysis
  - Agent commission reports
- **Design**: Planned as downloadable PDFs or CSV exports

#### **Notifications**

- **Status**: Schema exists; preferences not fully wired
- **Current State**: Notification table created; service for preferences partial
- **Missing**:
  - In-app notification center
  - Email preference management UI
  - SMS notification support
  - Notification scheduling
  - Bulk notification sending

#### **WhatsApp Integration (Recipient Pre-filling)**

- **Status**: **CRITICAL GAP** — Phone numbers collected but not used
- **Current State**:
  - Tenant phone numbers captured in forms ✅
  - FormData transmitted to server ✅
  - Schema includes phone fields ✅
  - Messages generated without phone ❌
  - Frontend receives no phone in state ❌
  - WhatsApp link is generic (wa.me) ❌
- **Issue**: Data collected → discarded in message builder → generic wa.me link built
- **Caveat Note**: See WHATSAPP_AUDIT_PRODUCT_BEHAVIOR.md for detailed analysis
- **Required Fix**:
  1. Pass phone numbers to message builder functions
  2. Include phone in action state response
  3. Build wa.me/[PHONE]?text= URLs in frontend
  4. Test with actual tenant phone numbers

#### **Guarantor Management**

- **Status**: Schema exists; UI not implemented
- **Current State**: Guarantor table created; repository partial
- **Missing**:
  - Guarantor information capture UI
  - Guarantor verification workflow
  - Guarantor notification system
  - Guarantor liability tracking

#### **Multitenancy & Workspace Support**

- **Status**: Single-tenant per profile; no workspace grouping
- **Current State**: All features assume 1-to-1 profile-to-user mapping
- **Missing**:
  - Multi-property portfolio management across regions
  - Team collaboration features
  - Delegated user roles within workspace
  - Audit trail for team activities

---

## 7. Core Reusable Patterns

### **Component Composition Pattern**

**Compound Component Pattern** (Card):

```typescript
// Usage
<Card>
  <CardHeader>
    <CardTitle>Tenant Details</CardTitle>
    <CardDescription>Basic information</CardDescription>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

**Form Component Pattern**:

```typescript
"use client";
import { useActionState } from "react";

export function TenantForm({ tenantId }) {
  const [state, formAction, isPending] = useActionState(
    (prev, fd) => updateTenantAction(tenantId, prev, fd),
    initialState,
  );

  return (
    <form action={formAction}>
      <Input
        name="fullName"
        error={state.fieldErrors?.fullName?.[0]}
      />
      <Button type="submit" isLoading={isPending}>
        Save
      </Button>
    </form>
  );
}
```

**Server Component Data Fetching Pattern**:

```typescript
// app/tenants/page.tsx (server component)
export default async function TenantsPage() {
  const landlord = await requireLandlord();
  const tenants = await getCurrentLandlordTenants();

  return (
    <div>
      {tenants.map(tenant => (
        <TenantCard key={tenant.id} tenant={tenant} />
      ))}
    </div>
  );
}
```

**Empty/Loading/Error State Pattern**:

```typescript
export function TenantList({ tenants, isLoading, error }) {
  if (error) return <ErrorState message={error} />;
  if (isLoading) return <LoadingState />;
  if (tenants.length === 0) return <EmptyState message="No tenants yet" />;

  return (
    <div>
      {tenants.map(tenant => (
        <TenantCard key={tenant.id} tenant={tenant} />
      ))}
    </div>
  );
}
```

### **Hook Patterns**

**useActionState Hook** (React 19):

```typescript
// Component
const [state, formAction, isPending] = useActionState(
  serverAction, // async (prev, fd) => ActionResult
  initialState, // { ok: false, message: "" }
);

// Pros:
// - Manages pending state automatically
// - Handles form submission
// - Provides error display
```

**useToast Hook** (Custom):

```typescript
// Component
const { toast } = useToast();

// Usage
toast({
  message: "Tenant created",
  type: "success",
});
```

**useActionState + ActionResultToast Pattern**:

```typescript
export function ComponentWithAction() {
  const [state, formAction, isPending] = useActionState(
    someAction,
    initialState,
  );

  return (
    <>
      <form action={formAction}>
        {/* form content */}
      </form>
      <ActionResultToast state={state} />
    </>
  );
}
```

### **Utility/Helper Patterns**

**Phone Number Normalization**:

```typescript
// server/utils/phone.ts
import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalisePhoneNumber(input: string) {
  const parsed = parsePhoneNumberFromString(input, "NG");
  return {
    e164: parsed?.format("E.164"), // +2348012345678
    national: parsed?.format("NATIONAL"), // 08012345678
    isValid: parsed?.isValid(),
  };
}
```

**Class Name Merge Pattern**:

```typescript
import { cn } from "@/lib/cn"; // clsx + tailwind-merge

// Usage
export function Button({ className, ...props }) {
  return (
    <button className={cn(
      "px-4 py-2 bg-primary text-white",
      className, // client classes (can override)
    )} {...props} />
  );
}
```

**Money Formatting Pattern**:

```typescript
function formatMoney(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

**Date Formatting Pattern**:

```typescript
function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${dateString}T00:00:00.000Z`));
}
```

**Result Type Pattern** (consistent action responses):

```typescript
// src/server/errors/result.ts
export type ActionResult<T> =
  | {
      ok: true;
      message: string;
      data?: T;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export function successResult<T>(message: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function errorResult(error: unknown): ActionResult {
  // Transform error to ActionResult
  // Handle AppError, ZodError, DatabaseError
}
```

### **Service Abstraction Pattern**

**Service with Dependency Injection**:

```typescript
// services/receipts.service.ts
export async function generateReceiptForCurrentLandlord(
  input: GenerateReceiptInput,
): Promise<Receipt> {
  // Dependencies injected via function calls, not parameters
  const landlord = await requireLandlord();
  const supabase = createSupabaseServerClient();

  // Business logic
  const receipt = {
    id: generateId(),
    receiptNumber: createReceiptNumber(),
    landlordId: landlord.id,
    createdAt: new Date(),
  };

  // Persist via repository
  const saved = await createReceipt(supabase, receipt);

  // Async work (fire and forget)
  await sendReceiptEmailViaInngest(saved.id);

  return saved;
}
```

**Repository Query Building**:

```typescript
// repositories/receipts.repository.ts
export async function getReceiptById(
  supabase: SupabaseClient,
  receiptId: string,
) {
  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_SELECT) // Standard column list
    .eq("id", receiptId)
    .single<ReceiptRow>();

  if (error) throw error;
  return data;
}

// RECEIPT_SELECT constant (string) for consistent field selection
const RECEIPT_SELECT = `
  id,
  receipt_number,
  landlord_id,
  tenant_id,
  property_id,
  amount,
  currency_code,
  payment_date,
  created_at,
  updated_at
`;
```

**Service Error Handling**:

```typescript
export async function updateTenant(input: UpdateTenantInput) {
  try {
    const tenant = await getTenantById(supabase, input.tenantId);

    if (!tenant) {
      throw new AppError("TENANT_NOT_FOUND", "Tenant not found.", 404);
    }

    const updated = await updateTenantInDb(supabase, tenant.id, input);
    return updated;
  } catch (error) {
    if (isAppError(error)) throw error; // Re-throw app errors

    // Log unexpected errors
    console.error("updateTenant failed:", error);

    throw new AppError(
      "UPDATE_FAILED",
      "Could not update tenant. Please try again.",
      500,
    );
  }
}
```

### **Form Handling Pattern**

**FormData Parsing**:

```typescript
// actions/tenants.actions.ts
export async function updateTenantAction(
  tenantId: string,
  _previousState: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    // 1. Parse FormData
    const parsed = updateTenantSchema.parse({
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
    });

    // 2. Call service
    await updateTenantForCurrentLandlord(tenantId, parsed);

    // 3. Revalidate cache
    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenantId}`);

    // 4. Return success
    return successResult("Tenant updated.");
  } catch (error) {
    const result = errorResult(error);
    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
```

**Zod Schema Pattern**:

```typescript
// validators/tenant.schema.ts
export const updateTenantSchema = z.object({
  fullName: z.string().trim().min(2, "Enter full name."),
  phoneNumber: phoneNumberSchema, // Reusable schema
  email: z.string().email().optional().or(z.literal("")),
  occupation: z.string().optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
```

### **Table/List Rendering Pattern**

**Server-Side List Rendering**:

```typescript
// app/tenants/page.tsx (server component)
export default async function TenantsPage() {
  const tenants = await getCurrentLandlordTenants();

  return (
    <div className="space-y-4">
      {tenants.length === 0 ? (
        <EmptyState message="No tenants" />
      ) : (
        tenants.map(tenant => (
          <TenantCard key={tenant.id} tenant={tenant} />
        ))
      )}
    </div>
  );
}
```

**Filter/Sort Pattern** (if needed):

```typescript
// App preserves filter in URL query params
// Next.js reads from searchParams
export default async function TenantsPage({
  searchParams,
}: {
  searchParams: { status?: string; sort?: string };
}) {
  const tenants = await getCurrentLandlordTenants({
    status: searchParams.status,
    sortBy: searchParams.sort,
  });

  return (
    <>
      <TenantFilter currentStatus={searchParams.status} />
      {/* list */}
    </>
  );
}
```

### **Modal/Dialog Pattern**

**Server Action with Redirect**:

```typescript
// Instead of modal state, use form + redirect
export async function createTenantAction(
  _: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  try {
    const tenant = await createTenant(parsed);
    redirect(`/tenants/${tenant.id}`); // Navigate after success
  } catch (error) {
    return { ok: false, message: "Failed" };
  }
}
```

**Toast for Feedback**:

```typescript
// Use ActionResultToast for confirmation
<ActionResultToast state={state} />
// Toast displays state.message automatically
```

### **Validation & Error Handling Pattern**

**Multi-Layer Validation**:

```typescript
// 1. Schema validation (Zod)
const parsed = someSchema.parse(input);

// 2. Business logic validation
if (parsed.endDate < parsed.startDate) {
  throw new AppError(
    "INVALID_DATE_RANGE",
    "End date must be after start date.",
  );
}

// 3. Database constraint validation (PostgreSQL CHECK constraints)
// CREATE TABLE ... CHECK (amount > 0)

// 4. Error response to user
const result = errorResult(error);
return { ok: false, message: result.message };
```

**Centralized Error Messages**:

```typescript
// server/errors/error-map.ts
const ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "Related record is missing.",
  // ...
};

// Used by errorResult function
const userMessage = ERROR_MESSAGES[error.code] || "Unknown error";
```

---

## 8. Styling / Design System Rules

### **Theme Philosophy**

**Design Goals**:

- **Professional**: Finance/property management context requires trust
- **Accessible**: High contrast, semantic color usage
- **Nigerian-Centric**: Warm, inviting palette suitable for Nigerian market
- **Modern**: Clean, minimal design with subtle shadows
- **Performance**: Utility-first (Tailwind) for fast CSS generation

### **Color Palette & Usage**

**Primary Colors**:

```
primary:
  - DEFAULT: #1B4FD8 (trust blue)
  - hover: #153FB0 (darker on interaction)
  - soft: #EAF0FF (light background)

Usage: CTAs, links, highlights, form focus
```

**Accent/Gold Colors** (premium, success):

```
gold:
  - DEFAULT: #F6B73C (warm gold)
  - deep: #D97706 (amber, darker)
  - soft: #FFF4D8 (very light bg)

Usage: Positive actions, premium features, highlights
```

**Status Colors**:

```
success: #16A34A (green) + soft: #EAF7EE
  Usage: Completed, approved, received payment

warning: #D97706 (amber) + soft: #FFF3DF
  Usage: Pending, renewal due soon, review needed

danger: #DC2626 (red) + soft: #FDECEC
  Usage: Errors, declined, arrears, critical issues
```

**Text Colors**:

```
text-strong: #111827 (near black, headings & body)
text-normal: #374151 (standard body text)
text-muted: #6B7280 (secondary text, labels)
```

**Background**:

```
background: #F8F7F4 (warm off-white page bg)
surface: #FFFFFF (card/container bg)
border-soft: #E7E5DF (subtle dividers)
```

### **Typography Rules**

**Font Family**: Plus Jakarta Sans (Google Fonts)

- Fallback: system-ui, sans-serif
- Weights used: 400 (normal), 600 (semibold), 700 (bold)

**Font Sizing Hierarchy**:

```
Page Title: text-3xl font-bold (36px)
Section Heading: text-lg font-bold (18px)
Body Text: text-sm or text-base (14px, 16px)
Small Text/Labels: text-xs or text-sm (12px, 14px)
```

**Line Height**:

```
Headings: leading-tight
Body: leading-6 or leading-7
```

### **Spacing Conventions**

**Tailwind Spacing** (4px base unit):

```
xs: 4px
sm: 8px
md: 16px (3x)
lg: 24px (6x)
xl: 32px (8x)

Component Padding:
- Card: p-5 md:p-6 (20px mobile, 24px desktop)
- Button: px-4 py-2.5 (16px horiz, 10px vert)
- Input: px-3 py-2 (12px horiz, 8px vert)

Component Gaps:
- Card header/content: mb-5, gap-4
- Section spacing: space-y-6
- Grid gaps: gap-4
```

### **Border & Radius**

**Border Radius**:

```
card: 1rem (16px) - containers, cards, modals
button: 0.75rem (12px) - buttons, small elements
input: default 4px - form inputs
```

**Border & Dividers**:

```
Card shadow: shadow-card (0 12px 30px rgba(17,24,39,0.06))
Soft shadow: shadow-soft (0 8px 20px rgba(17,24,39,0.05))
Divider: border border-border-soft
```

### **Layout/Grid Rules**

**Container Widths**:

```
Max width: w-full (let viewport constrain)
Content max: typically < 1280px on Vercel layouts
Padding: px-4 md:px-6 for mobile/desktop padding
```

**Responsive Breakpoints** (Tailwind defaults):

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px

Typical usage:
- Mobile first: hidden md:block (hidden on mobile, shown on md+)
- Stack/Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

**Flex Layout**:

```
Form layouts: flex flex-col gap-4
Button groups: flex gap-3 items-center justify-end
Card footer: flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end
```

### **Card/Button/Input Styles**

**Card Style** (reusable container):

```
<Card className="bg-surface rounded-card shadow-card p-5 md:p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

**Button Variants**:

```
Primary: bg-primary text-white hover:bg-primary-hover
Secondary: bg-surface text-text-strong ring-1 ring-border-soft
Danger: bg-danger text-white
Ghost: bg-transparent text-text-normal hover:bg-primary-soft

Sizes:
sm: min-h-10 px-4 text-sm
md: min-h-11 px-5 text-sm (default)
lg: min-h-12 px-6 text-base

States:
- disabled: opacity-50 cursor-not-allowed
- loading: spinner icon + disabled
```

**Input Style**:

```
Field: border border-gray-200 rounded bg-white
Label: text-xs font-semibold text-text-muted
Error: border-danger text-danger text-xs
```

### **Responsive Design Approach**

**Mobile-First**:

- Default styles for mobile (small screen)
- Use `md:`, `lg:`, `xl:` prefixes to enhance on larger screens
- Example: `w-full md:w-1/2` (full width mobile, half width on tablet+)

**Common Responsive Patterns**:

```
Form layout: flex-col on mobile, flex-row on md+
Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
Navigation: hamburger menu on mobile, full navbar on md+
Padding: px-4 md:px-6 lg:px-8
Font size: text-sm md:text-base
```

### **Animation/Motion Conventions**

**Tailwind Animations**:

```
Transitions: transition duration-200
Hover effects: hover:bg-primary-hover
Focus states: focus-visible:ring-2 focus-visible:ring-primary
Loading spinner: animate-spin (rotating)
```

**Disabled State Animation**:

```
Smooth transition: transition duration-200
Opacity reduction: disabled:opacity-50
Cursor change: disabled:cursor-not-allowed
```

---

## 9. Naming Conventions

### **File Naming Conventions**

**Directories**:

```
Lowercase, kebab-case:
- /src/server/services
- /src/components/payment
- /src/app/agreement-generator

Exception: Feature groups with roles:
- (auth) - route group, parentheses required for Next.js
- (landlord) - role-based grouping
- (tenant) - role-based grouping
```

**Files**:

```
Action files: {feature}.actions.ts, {feature}.state.ts
  - tenants.actions.ts, tenant.state.ts
  - payments.actions.ts, payment.state.ts

Service files: {feature}.service.ts, {feature}.service.tsx (if JSX)
  - receipts.service.ts
  - receipt-pdf.service.tsx (contains JSX for PDF)

Repository files: {feature}.repository.ts
  - receipts.repository.ts
  - public-tool-leads.repository.ts

Validator files: {feature}.schema.ts
  - auth.schema.ts
  - payment.schema.ts

Component files: {ComponentName}.tsx
  - TenantShellForm.tsx
  - PaymentInitializationButton.tsx

Hook files: use{HookName}.ts
  - useToast.ts
  - useActionState (built-in)

Type files: {feature}.types.ts
  - auth.types.ts
  - payment.types.ts
```

### **Component Naming Conventions**

**Compound Components** (export multiple):

```
export function Card({ children }) {}
export function CardHeader({ children }) {}
export function CardTitle({ children }) {}
export function CardContent({ children }) {}
export function CardFooter({ children }) {}

// Exported as Card.Header, Card.Title, etc. (if using namespace)
// Or imported individually: import { Card, CardHeader } from "..."
```

**Feature Component Names**:

```
{Feature}{Purpose}{Type}
- TenantShellForm (tenant creation form)
- TenantStatusCard (tenant status display)
- TenantActivationButton (action button)
- PropertyRulesSelect (rule selection input)
- ReceiptGeneratorForm (full form)
- GeneratedReceiptResult (result display)
```

**UI Component Names** (generic, reusable):

```
{Concept}
- Button
- Card
- Input
- Select
- Badge
- EmptyState
- LoadingState
- ErrorState
```

**Hook Names**:

```
use{Concept}
- useToast
- useActionState (built-in)
- useFormState (deprecated)
```

### **Hook Naming Conventions**

**Custom Hooks** (start with `use`):

```
useToast() // Returns { toast: (msg) => void }
useAuth() // Returns { user, logout }
useFormState() // For complex form state (if needed)
```

### **Variable/Function Naming Rules**

**Functions** (camelCase):

```
// Actions
createTenantShellAction()
updateTenantAction()
generateReceiptAction()

// Services
generateReceiptForCurrentLandlord()
calculateTenancyBalance()
createReceiptPDF()

// Repositories
getTenantById()
createTenant()
updateTenantInDb()
listTenantsForLandlord()

// Utilities
normalisePhoneNumber()
formatMoney()
calculateDaysUntilExpiry()
buildWhatsappMessage()

// Handlers/Callbacks
handleSubmit()
handleClick()
onSuccess()
onError()
```

**Variables** (camelCase):

```
// Booleans (start with is/has/can/will)
const isLoading = true;
const hasError = false;
const canSubmit = true;
const willRetry = false;

// Collections (plural)
const tenants = [];
const properties = [];
const errors = { field: ["message"] };

// Single entities
const tenant = { id, name };
const property = { id, address };

// Temporary/loop vars
let index = 0;
```

**Constants** (UPPER_SNAKE_CASE):

```
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PHONE_REGEX = /^\d{10}$/;
const DEFAULT_PAGINATION_LIMIT = 10;

// Enums-like
const TENANT_STATUSES = ["pending", "active", "archived"];
```

### **Database/Table Naming Rules**

**Tables** (snake_case):

```
public.profiles
public.properties
public.units
public.tenants
public.tenancies
public.payments
public.receipts
public.tenancy_agreements
public.tenancy_agreement_documents
public.public_tool_leads
public.public_generated_receipts
public.public_generated_agreements
public.subscriptions
public.subscription_payments
public.audit_logs
public.caretakers
```

**Columns** (snake_case):

```
id (UUID primary key)
landlord_id, tenant_id, property_id (foreign keys)
full_name, phone_number, email (user info)
amount_naira, currency_code (money)
status (enum or text)
created_at, updated_at (timestamps, UTC)
is_active, has_pets (booleans, prefix is/has)
```

**Enums** (lowercase with underscores):

```
tenant_status: 'pending' | 'active' | 'archived'
payment_status: 'pending' | 'completed' | 'failed'
document_status: 'generated' | 'claimed' | 'expired'
```

**Indexes** (convention):

```
idx_{table_name}_{column}
idx_properties_landlord_id
idx_tenants_phone_number
idx_receipts_status
```

### **Route/URL Naming Conventions**

**File-Based Routes** (Next.js App Router):

```
/tenants → /src/app/(landlord)/tenants/page.tsx
/tenants/[id] → /src/app/(landlord)/tenants/[id]/page.tsx
/tenants/create → /src/app/(landlord)/tenants/create/page.tsx

API Routes:
/api/webhooks/paystack → /src/app/api/webhooks/paystack/route.ts
/api/cron/rent-charges → /src/app/api/cron/rent-charges/route.ts
```

**Query Parameters** (snake_case or camelCase, consistent):

```
/tenants?sort=name&status=active&page=1
/properties?landlord_id=...&search=...
```

**URL-Friendly IDs** (use UUIDs, avoid exposing DB IDs):

```
/receipts/550e8400-e29b-41d4-a716-446655440000
/tenants/550e8400-e29b-41d4-a716-446655440000

Public short links (use tokens):
/t/onboarding/eyJhbGci...  (token, not ID)
/receipt-generator/download/550e8400.../token=...
```

---

## 10. Data Models / Schemas

### **Core Data Models**

#### **Profiles (User Accounts)**

```
profiles {
  id: UUID (PK)
  auth_id: UUID (FK -> auth.users)
  role: 'landlord' | 'tenant' | 'agent' | 'caretaker'
  full_name: text
  phone_number: text (normalized, unique per role)
  email: text (unique)
  avatar_url: text (optional)
  is_active: boolean
  created_at: timestamptz
  updated_at: timestamptz
  metadata: jsonb (extensible data)
}
```

#### **Properties**

```
properties {
  id: UUID (PK)
  landlord_id: UUID (FK -> profiles)
  name: text
  address: text
  city_state: text
  country: varchar(2) default 'NG'
  currency_code: varchar(3) default 'NGN'
  property_type: 'residential' | 'commercial' | 'mixed'
  total_units: integer
  amenities: jsonb (array of strings)
  is_active: boolean
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (landlord_id, is_active)
```

#### **Units (Property Sections)**

```
units {
  id: UUID (PK)
  property_id: UUID (FK -> properties)
  identifier: text (e.g., "Flat 3", "Room A")
  bedrooms: integer (nullable)
  bathrooms: integer (nullable)
  has_kitchen: boolean
  furnished: 'unfurnished' | 'semi' | 'fully'
  annual_rent: numeric(19,2) (nullable)
  monthly_rent: numeric(19,2) (nullable)
  currency_code: varchar(3) default 'NGN'
  status: 'vacant' | 'occupied' | 'maintenance'
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (property_id, status)
```

#### **Tenants**

```
tenants {
  id: UUID (PK)
  landlord_id: UUID (FK -> profiles)
  user_id: UUID (FK -> profiles, nullable - can be unactivated)
  full_name: text
  phone_number: text (normalized)
  email: text (nullable)
  date_of_birth: date (nullable)
  occupation: text (nullable)
  employer: text (nullable)
  home_address: text (nullable)
  id_type: 'national_id' | 'passport' | 'drivers_license' (nullable)
  id_number: text (nullable)
  id_document_path: text (file storage path, nullable)
  passport_photo_path: text (file storage path, nullable)
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'archived'
  rejection_reason: text (nullable)
  landlord_notes: text (nullable)
  has_pets: boolean (nullable)
  occupant_count: integer (nullable)
  property_use: 'residential' | 'commercial' | 'mixed_use' (nullable)
  has_children_under_five: boolean (nullable)
  monthly_income_range: text (nullable)
  can_provide_guarantor: boolean (nullable)
  will_use_shortlet: boolean (nullable)
  will_sublet: boolean (nullable)
  will_run_customer_facing_business: boolean (nullable)
  will_use_heavy_generator_or_equipment: boolean (nullable)
  will_host_large_gatherings: boolean (nullable)
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (landlord_id, status), (phone_number)
```

#### **Tenancies (Leases)**

```
tenancies {
  id: UUID (PK)
  landlord_id: UUID (FK -> profiles)
  tenant_id: UUID (FK -> tenants)
  unit_id: UUID (FK -> units)
  start_date: date
  end_date: date
  status: 'active' | 'terminated' | 'expired'
  monthly_rent_amount: numeric(19,2)
  annual_rent_amount: numeric(19,2)
  currency_code: varchar(3) default 'NGN'
  rent_charge_frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  next_rent_charge_date: date (nullable - calculated, nullable)
  deposit_amount: numeric(19,2) (nullable)
  late_charge_rule: jsonb (penalties for late payment)
  created_at: timestamptz
  updated_at: timestamptz
  terminated_at: timestamptz (nullable)
}

Index: (landlord_id, status), (tenant_id, status), (unit_id)
Constraint: end_date >= start_date
```

#### **Tenancy Agreements**

```
tenancy_agreement_documents {
  id: UUID (PK)
  tenancy_id: UUID (FK -> tenancies)
  title: text (default 'Residential Tenancy Agreement')
  body: text (full agreement document)
  rent_amount: numeric(19,2)
  rent_frequency: 'annual' | 'monthly' | 'quarterly' | 'biannual'
  property_use: 'residential' | 'commercial' | 'mixed_use'
  special_terms: text (nullable)
  property_rules: text (nullable - formatted from rules)
  caution_deposit_amount: numeric(19,2)
  watermark_status: 'watermarked' | 'original'
  document_status: 'draft' | 'final' | 'accepted' | 'archived'
  tenant_acceptance_date: timestamptz (nullable)
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (tenancy_id), (document_status)
```

#### **Rent Payments**

```
rent_payments {
  id: UUID (PK)
  tenancy_id: UUID (FK -> tenancies)
  tenant_id: UUID (FK -> tenants)
  landlord_id: UUID (FK -> profiles)
  amount: numeric(19,2)
  currency_code: varchar(3) default 'NGN'
  payment_method: 'bank_transfer' | 'cash' | 'paystack_gateway' | 'other'
  payment_date: date (actual payment date)
  period_start_date: date (rent period start)
  period_end_date: date (rent period end)
  status: 'pending' | 'completed' | 'failed' | 'reversed'
  receipt_id: UUID (FK -> receipts, nullable)
  gateway_reference: text (Paystack reference, nullable)
  gateway_transaction_id: integer (Paystack transaction ID, nullable)
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (tenancy_id, status), (tenant_id, status)
Constraint: amount > 0
```

#### **Receipts**

```
receipts {
  id: UUID (PK)
  landlord_id: UUID (FK -> profiles)
  tenant_id: UUID (FK -> tenants)
  payment_id: UUID (FK -> rent_payments, nullable)
  receipt_number: text unique (e.g., "BOPA-REC-2026-A1B2C3D4")
  receipt_date: date
  amount: numeric(19,2)
  currency_code: varchar(3) default 'NGN'
  payment_method: 'bank_transfer' | 'cash' | 'paystack_gateway' | 'other'
  period_start: date
  period_end: date
  pdf_path: text (file storage path)
  watermark_text: text
  status: 'generated' | 'voided'
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (landlord_id, receipt_date), (receipt_number)
```

#### **Public Tool Leads**

```
public_tool_leads {
  id: UUID (PK)
  owner_profile_id: UUID (FK -> profiles, nullable - unattached leads)
  landlord_full_name: text
  landlord_phone_number: text (normalized)
  landlord_email: text (nullable)
  source_tool: 'receipt' | 'agreement'
  source_path: text (URL path where generated)
  source_location: text (nullable - city/state)
  signup_status: 'anonymous' | 'account_created' | 'attached' | 'discarded'
  lead_token_hash: text (nullable - secure token hash)
  lead_token_expires_at: timestamptz (nullable)
  user_agent: text (nullable - browser info)
  ip_address_hash: text (nullable)
  metadata: jsonb
  created_at: timestamptz
  updated_at: timestamptz
  claimed_at: timestamptz (nullable)
}

Index: (owner_profile_id), (landlord_phone_number), (source_tool), (created_at)
```

#### **Public Generated Receipts**

```
public_generated_receipts {
  id: UUID (PK)
  lead_id: UUID (FK -> public_tool_leads, nullable)
  owner_profile_id: UUID (FK -> profiles, nullable - unattached)
  existing_property_id: UUID (FK -> properties, nullable)
  existing_tenant_id: UUID (FK -> tenants, nullable)
  existing_payment_id: UUID (FK -> rent_payments, nullable)
  landlord_full_name: text
  landlord_phone_number: text
  landlord_email: text (nullable)
  tenant_full_name: text
  tenant_phone_number: text
  property_name: text (nullable)
  property_address: text
  unit_identifier: text (nullable)
  city_state: text
  rent_amount: numeric(19,2)
  currency_code: varchar(3) default 'NGN'
  payment_date: date
  rent_period_start: date
  rent_period_end: date
  rent_duration_months: integer
  payment_method: 'bank_transfer' | 'cash' | 'paystack_gateway' | 'other'
  payment_reference: text (nullable)
  receipt_number: text
  receipt_snapshot: jsonb (full receipt data)
  pdf_path: text (nullable - file storage)
  watermark_status: 'watermarked' | 'original'
  document_status: 'generated' | 'claimed' | 'expired'
  whatsapp_message: text
  download_token_hash: text (nullable - secure download link)
  download_token_expires_at: timestamptz (nullable)
  claim_token_hash: text (nullable - secure claim link)
  claim_token_expires_at: timestamptz (nullable)
  metadata: jsonb
  created_at: timestamptz
  updated_at: timestamptz
  claimed_at: timestamptz (nullable)
}

Index: (lead_id), (owner_profile_id), (document_status), (landlord_phone_number)
Constraint: rent_amount > 0, rent_period_end >= rent_period_start
```

#### **Public Generated Agreements**

```
public_generated_agreements {
  id: UUID (PK)
  lead_id: UUID (FK -> public_tool_leads, nullable)
  owner_profile_id: UUID (FK -> profiles, nullable)
  existing_property_id: UUID (FK -> properties, nullable)
  existing_tenant_id: UUID (FK -> tenants, nullable)
  existing_tenancy_id: UUID (FK -> tenancies, nullable)
  existing_agreement_id: UUID (FK -> tenancy_agreement_documents, nullable)
  landlord_full_name: text
  landlord_phone_number: text
  landlord_email: text (nullable)
  tenant_full_name: text
  tenant_phone_number: text
  property_name: text (nullable)
  property_address: text
  unit_identifier: text (nullable)
  city_state: text
  rent_amount: numeric(19,2)
  currency_code: varchar(3) default 'NGN'
  tenancy_start_date: date
  tenancy_end_date: date
  tenancy_duration_months: integer
  agreement_title: text
  agreement_snapshot: jsonb (full agreement text)
  pdf_path: text (nullable)
  watermark_status: 'watermarked' | 'original'
  document_status: 'generated' | 'claimed' | 'expired'
  download_token_hash: text (nullable)
  download_token_expires_at: timestamptz (nullable)
  claim_token_hash: text (nullable)
  claim_token_expires_at: timestamptz (nullable)
  metadata: jsonb
  created_at: timestamptz
  updated_at: timestamptz
  claimed_at: timestamptz (nullable)
}

Index: Similar to public_generated_receipts
```

#### **Subscriptions**

```
subscriptions {
  id: UUID (PK)
  profile_id: UUID (FK -> profiles, unique with status constraint)
  plan_type: 'free' | 'basic' | 'premium'
  status: 'active' | 'trialing' | 'past_due' | 'cancelled'
  billing_period: 'annual' default 'annual'
  amount_naira: numeric(19,2) default 0
  currency_code: varchar(3) default 'NGN'
  starts_at: timestamptz
  expires_at: timestamptz (nullable - free plans have no expiry)
  cancelled_at: timestamptz (nullable)
  last_renewed_at: timestamptz (nullable)
  paystack_customer_code: text (nullable)
  paystack_plan_code: text (nullable)
  paystack_subscription_code: text (nullable)
  latest_payment_reference: text (nullable)
  metadata: jsonb
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (profile_id), (status), (expires_at)
Unique Index: (profile_id) WHERE status IN ('active', 'trialing', 'past_due')
```

#### **Subscription Payments**

```
subscription_payments {
  id: UUID (PK)
  subscription_id: UUID (FK -> subscriptions, nullable)
  profile_id: UUID (FK -> profiles)
  plan_type: 'free' | 'basic' | 'premium'
  status: 'initialized' | 'completed' | 'failed'
  amount_naira: numeric(19,2)
  amount_kobo: integer (for Paystack API)
  currency_code: varchar(3) default 'NGN'
  billing_period: 'annual' default 'annual'
  payment_reference: text unique
  authorization_url: text (nullable)
  paystack_access_code: text (nullable)
  paystack_transaction_id: integer (nullable)
  paystack_paid_at: timestamptz (nullable)
  metadata: jsonb
  created_at: timestamptz
  updated_at: timestamptz
}

Index: (profile_id), (subscription_id), (status), (created_at)
```

#### **Audit Logs**

```
audit_logs {
  id: UUID (PK)
  actor_id: UUID (FK -> profiles)
  actor_role: 'landlord' | 'tenant' | 'agent' | 'caretaker' | 'admin'
  entity_type: 'property' | 'tenant' | 'tenancy' | 'payment' | 'receipt' | ...
  entity_id: UUID
  event_type: 'created' | 'updated' | 'deleted' | 'accepted' | 'rejected' | ...
  old_values: jsonb (previous state)
  new_values: jsonb (new state)
  metadata: jsonb (extra context)
  created_at: timestamptz
}

Index: (actor_id, created_at), (entity_id, entity_type)
```

#### **Ledger (for balance calculations)**

```
ledger {
  id: UUID (PK)
  tenancy_id: UUID (FK -> tenancies)
  transaction_type: 'charge' | 'payment' | 'adjustment' | 'refund'
  amount: numeric(19,2) (can be negative for credits)
  balance_after: numeric(19,2) (running total)
  notes: text (nullable)
  related_payment_id: UUID (FK -> rent_payments, nullable)
  created_at: timestamptz
}

Index: (tenancy_id, created_at)
```

### **Relationship Diagram**

```
profiles (users)
  ├── 1:N → properties (landlord_id)
  │         └── 1:N → units (property_id)
  │                   └── 1:N → tenancies (unit_id)
  ├── 1:N → tenants (landlord_id)
  │         └── 1:N → tenancies (tenant_id)
  │         └── 1:N → rent_payments (tenant_id)
  └── 1:N → subscriptions (profile_id)

tenancies (leases)
  ├── N:1 → tenants
  ├── N:1 → units
  ├── N:1 → properties (via units)
  ├── 1:N → rent_payments (tenancy_id)
  ├── 1:N → tenancy_agreements (tenancy_id)
  └── 1:N → ledger entries

rent_payments
  ├── N:1 → tenancies
  ├── N:1 → tenants
  ├── 1:1 → receipts (receipt_id, optional)

public_tool_leads (entry points from public tools)
  ├── 1:N → public_generated_receipts
  ├── 1:N → public_generated_agreements
  └── N:1 → profiles (owner_profile_id, when claimed)

Claimable items:
  public_generated_receipts → receipts (can be claimed)
  public_generated_agreements → tenancy_agreements (can be claimed)
```

---

## 11. Important Constraints / Non-Negotiables

### **Architecture Decisions (DO NOT CHANGE)**

1. **Server Actions + FormData Pattern**: All mutations must use Next.js server actions with FormData-based submission. Do NOT introduce external state management (Redux, Zustand) or GraphQL.

2. **Repository Pattern**: Database access must ALWAYS go through the repository layer (`src/server/repositories/`). Direct Supabase queries in services or actions are prohibited.

3. **Service Layer Orchestration**: Business logic belongs in services (`src/server/services/`), not in actions or components. Actions parse input and call services.

4. **Zod Validation**: All user inputs must be validated with Zod schemas before business logic execution. Server-side validation is mandatory.

5. **AppError Exception Handling**: Use `AppError` class for all user-facing errors. Never throw generic Error objects. AppError includes code, userMessage, and HTTP status.

6. **Server Components by Default**: All components are server components unless marked with `"use client"`. Minimize client component usage.

7. **No Page-Level API Routes for Mutations**: Use server actions, not POST/PUT endpoints, for state changes. API routes are only for webhooks and external integrations.

8. **Supabase RLS Enforcement**: Row-level security policies MUST be defined for all tables. Authentication checks happen both in RLS and in service layer (`requireLandlord()`, `requireTenant()`).

9. **Timezone Handling**: All dates stored in UTC (PostgreSQL default). Formatting/display logic converts to user's locale on the frontend. Never store timezone-converted times in DB.

10. **Ledger-Based Accounting**: Rent payment tracking MUST use a ledger table. Do NOT calculate balances from raw transactions. Ledger provides audit trail and prevents reconciliation errors.

### **Data Integrity Constraints (ENFORCE IN DB)**

1. **Rent Amounts**: PostgreSQL CHECK constraint `amount > 0` on all monetary columns.

2. **Date Ranges**: Tenancy `end_date >= start_date` enforced via CHECK constraint. Agreement `tenancy_end_date >= tenancy_start_date`.

3. **Phone Numbers**: Non-empty, normalized format. Minimum 10 digits for Nigerian numbers.

4. **Unique Constraints**:
   - Email + role combination (user can't have duplicate email per role)
   - Receipt number must be globally unique
   - Payment reference (Paystack) must be globally unique
   - Only one active subscription per profile (unique index with status filter)

5. **Foreign Key Cascades**:
   - Profile deletion cascades to dependent tables (properties, subscriptions, audit logs)
   - Unit deletion cascades to tenancies (soft delete preferred)
   - Tenancy deletion cascades to payments and ledger entries

### **Authentication & Authorization Rules**

1. **Session Requirement**: All authenticated routes require valid Supabase session. Use `createSupabaseServerClient()` to check auth.

2. **Role-Based Access**:
   - Landlords only access their own properties, units, tenants, payments
   - Tenants only access their own tenancies and payments
   - Agents access assigned properties/tenants
   - Service functions enforce via `requireLandlord()`, `requireTenant()`, etc.

3. **Cross-Tenant Isolation**: Query filters ALWAYS include the user's ID (e.g., `WHERE landlord_id = current_user_id`). Never return data without ownership check.

4. **Public Tool Tokens**: Generated tokens (for receipt/agreement download/claim) are hashed before storage. Comparison uses `crypto.timingSafeEqual()` to prevent timing attacks.

### **Payment Processing Rules**

1. **Idempotency**: All payment initiation and confirmation must be idempotent. Use idempotency keys to prevent duplicate charges.

2. **Webhook Verification**: Paystack webhooks must verify signature before processing (`verifyPaystackSignature()`).

3. **Transaction Atomicity**: Payment creation + ledger entry + receipt generation should be atomic (use Supabase transactions or Inngest for async reliability).

4. **Currency Consistency**: All monetary values use NGN (default). Multi-currency support requires explicit currency_code field.

### **Document Generation Rules**

1. **Watermarking**: All PDFs must include watermark text (e.g., "Generated on [date]", "Unclaimed", "Claimed").

2. **Token Expiry**: Download and claim tokens expire after 30 days. Expired tokens return 403/404 errors.

3. **Snapshot Storage**: Generated receipts/agreements store a JSON snapshot of input data for reproducibility (in case template changes later).

4. **PDF Preservation**: Never modify generated PDFs after creation. If template changes, new PDFs are generated with new receipts/agreement IDs.

### **Audit & Compliance Rules**

1. **Immutable Audit Trail**: Audit logs are append-only. Never update or delete audit records.

2. **Actor Attribution**: Every action must attribute to a profile. Anonymous actions (public tool generation) log as null actor with special handling.

3. **PII Protection**: Phone numbers, emails, and ID numbers in audit logs should be masked or hashed (currently stored in plaintext; consider encryption for future).

4. **Retention Policy**: Audit logs retained indefinitely for compliance (Nigerian property laws require 7+ years record retention).

### **UI/UX Rules**

1. **Toast Notifications**: All action results must display via ActionResultToast component for consistency.

2. **Empty States**: Lists with zero items display EmptyState component, not blank screen.

3. **Error Messages**: User-facing errors come from AppError.userMessage, mapped via ERROR_MESSAGES. Never expose raw SQL or stack traces.

4. **Loading States**: Forms show loading spinner on buttons during submission. Disable form inputs during submission.

5. **Responsive Design**: Mobile-first approach. All pages must work on 375px+ width.

### **Performance & Scalability Rules**

1. **Database Indexes**: Query-critical columns must have indexes (landlord_id, status, created_at, phone_number).

2. **Pagination**: Large lists (payments, properties) must paginate. Default limit 10-20 items per page.

3. **Query Optimization**: Use `select()` to specify needed columns. Avoid N+1 queries (use batch fetching where possible).

4. **Cache Invalidation**: Use `revalidatePath()` after mutations. Invalidate both specific and parent routes.

5. **File Storage**: Large PDFs stored in Supabase Storage, not in database. Database stores file paths only.

### **Third-Party Integration Rules**

1. **Paystack Integration**:
   - Live mode for production, test mode for development
   - Webhook signature verification mandatory
   - Access code + public key authentication

2. **Resend Email**:
   - Use Resend for all transactional email
   - Email templates managed in code or Resend dashboard
   - Track delivery status for audit

3. **Supabase OTP**:
   - SMS OTP via Supabase phone auth (if provider configured)
   - OTP expiry 10-15 minutes
   - Rate limit OTP requests (max 3 per 15 minutes)

### **Git & Deployment Rules**

1. **Environment Variables**:
   - `.env.local` for development (not in git)
   - Vercel project env vars for production
   - Never commit secrets (API keys, database URLs)

2. **Migrations**:
   - All schema changes via Supabase migrations
   - Migrations versioned by timestamp
   - No manual SQL execution; use migrations

3. **Cron Jobs**:
   - Defined in `vercel.json`
   - Schedule rent charges at 2 AM UTC (covers African time zones)
   - Renewal reminders at 6 AM UTC

---

## 12. Known Technical Debt / Caveats

### **Critical Issues**

#### **WhatsApp Recipient Pre-filling NOT IMPLEMENTED** ⚠️ CRITICAL

- **Issue**: Tenant phone numbers are collected in forms but NOT passed to WhatsApp URL builder
- **Symptom**: Users see generic `wa.me` link instead of `wa.me/[PHONE]?text=message`
- **Root Cause**: Phone data discarded in message builder function (not included in function signature)
- **Impact**: Users must manually enter recipient phone in WhatsApp; friction in workflow
- **How to Fix**:
  1. Add `landlordPhoneNumber` and `tenantPhoneNumber` to `buildReceiptWhatsappMessage()` function signature
  2. Update action state type to include phone numbers
  3. Update frontend to build `wa.me/${phoneNumber}?text=...` URLs
  4. See `WHATSAPP_AUDIT_PRODUCT_BEHAVIOR.md` for full audit trail
- **Status**: BACKLOG - scheduled for future sprint

### **Incomplete Features**

#### **Subscriptions API Not Wired**

- Tables exist, business logic mostly absent
- Subscription enforcement (feature gating per plan) not implemented
- Renewal logic not automated
- Status: Placeholder for future implementation

#### **Reports Not Implemented**

- Route exists; generation logic missing
- No revenue, property, or tenant analytics
- Status: Placeholder for future phases

#### **Notifications Center**

- Preference schema exists; UI not built
- Email preferences configurable in backend but not exposed
- In-app notifications not implemented
- Status: Partial

#### **Agent Features Incomplete**

- Agent profile management works
- Commission tracking partially implemented
- Bulk tenant onboarding by agents not tested
- Status: POC/beta

#### **Guarantor System**

- Schema defined; no UI or workflow
- Status: Not started

#### **Multitenancy/Workspace Support**

- Current design assumes 1 profile = 1 user = 1 property portfolio
- No team collaboration or delegated roles
- Status: Future architecture enhancement

### **Known Bugs**

#### **Phone Number Formatting Inconsistency**

- Some places normalize to E.164 (`+2348012345678`)
- Others use national format (`08012345678`)
- Comparison logic handles both, but display is inconsistent
- **Fix**: Centralize phone formatting utility; always display national format to users, always store E.164 in DB

#### **Date Calculation Edge Cases**

- Leap year handling in `addMonths()` may be off by 1 day
- Timezone-aware date comparisons may fail if user/server timezones differ
- **Fix**: Use date-fns library consistently; test edge cases in February

#### **Ledger Balance Calculation Race Condition**

- If multiple payments submitted in rapid succession, ledger balance calculation may be stale
- **Fix**: Use database transaction or add row-level lock on tenancy record during balance calculation

### **Architectural Compromises**

1. **In-Memory OTP Dispatch** (if implemented): No persistence, so OTP lost on server restart
   - **Fix**: Store OTP in Redis or Supabase, not memory

2. **No Real-Time Updates**: No WebSocket/polling for live payment status
   - Workaround: Manual page refresh or cron job for updates
   - **Fix**: Add Supabase real-time subscriptions if real-time needs arise

3. **Synchronous PDF Generation**: PDFs generated during request (can timeout on large documents)
   - **Fix**: Move to async job queue (Inngest) for documents >10MB

4. **No Distributed Session Management**: Session tied to single server instance
   - Works for Vercel because each request may hit different instance (uses Supabase for session)
   - **Fix**: Already using Supabase auth; no issue in current architecture

### **Performance Caveats**

1. **Query N+1 Problem**: List pages may fetch related data one-by-one
   - Current: Landlord retrieves all tenants, then loops to fetch each tenant's active tenancy
   - **Fix**: Use batch queries or SQL joins

2. **No Query Result Caching**: Each request re-queries database
   - **Fix**: Implement Redis cache layer or ISR for less-frequently-updated pages

3. **Pagination Not Enforced**: Some queries return all results
   - **Fix**: Add `limit` and `offset` to all list queries; set default to 10-20 items

### **Security Caveats**

1. **No Rate Limiting on API Endpoints**: Webhook endpoints and cron could be hammered
   - **Fix**: Add rate limiting via Vercel middleware or service-level guards

2. **Phone Number Not Encrypted in DB**: Stored in plaintext
   - **Fix**: Encrypt phone numbers at rest (Supabase PGP extension or application-level encryption)

3. **Audit Logs Include PII**: User names, emails, phone numbers logged
   - **Fix**: Mask or hash sensitive fields in audit logs

4. **No CSRF Protection on Forms**: Relies on Supabase session + Next.js server actions
   - Status: Adequate for current setup (server actions are POST-only and session-protected)
   - **Fix**: Add explicit CSRF token if moving to traditional form submissions

### **Testing & Documentation Gaps**

1. **No E2E Tests**: Critical user flows (tenant onboarding, payment) not tested end-to-end
   - **Fix**: Implement Playwright or Cypress tests for happy paths

2. **No API Documentation**: Service functions not documented (no JSDoc comments)
   - **Fix**: Add JSDoc to all services and repositories

3. **Incomplete Type Coverage**: Some `any` types in utility functions
   - **Fix**: Audit and fix all `any` types; enable `noImplicitAny` in tsconfig

4. **No Migration Rollback Strategy**: Supabase migrations are forward-only
   - **Fix**: Document rollback procedures or maintain separate dev/prod migration branches

### **Future Tech Debt to Monitor**

1. **React 19 Stability**: Using cutting-edge React 19; future versions may introduce breaking changes
2. **Next.js 16 EOL**: Plan upgrade to Next.js 17+ within 12 months
3. **Tailwind CSS 4 Adoption**: Relatively new; may have undiscovered issues
4. **Inngest Vendor Lock-in**: Migrating background jobs to self-hosted solution will require rewrite

---

## 13. Pending Roadmap

### **Priority 1: Critical Gaps (Do First)**

1. **WhatsApp Recipient Pre-filling**
   - Effort: 2-3 hours
   - Impact: HIGH (fixes broken user workflow)
   - Steps:
     - Refactor message builder functions to accept phone numbers
     - Update action state types
     - Build wa.me URLs with phone parameter
     - Test with real Whatsapp links

2. **Subscription Enforcement & Gating**
   - Effort: 8-12 hours
   - Impact: HIGH (necessary for revenue model)
   - Steps:
     - Implement subscription creation workflow
     - Auto-renew subscriptions before expiry
     - Add plan type checks to features (receipts, agreements, payments)
     - Show plan limits in UI
     - Implement upgrade/downgrade flows

3. **Fix Phone Number Inconsistency**
   - Effort: 4-6 hours
   - Impact: MEDIUM (prevents bugs)
   - Steps:
     - Standardize phone formatting across codebase
     - Always display national format (08012345678)
     - Always store E.164 in database
     - Create consistent normalization utility

### **Priority 2: Feature Completeness (Then)**

4. **Reports & Analytics Dashboard**
   - Effort: 16-20 hours
   - Impact: HIGH (core feature for landlords)
   - Features:
     - Revenue by property/period
     - Collection rate (payments on-time, late, pending)
     - Arrears analysis
     - Tenant occupancy rates
     - PDF/CSV export
   - Data sources: ledger, tenancies, payments tables

5. **Notifications & Preferences**
   - Effort: 10-14 hours
   - Impact: MEDIUM (improves engagement)
   - Features:
     - Email preference center (opt-in/out per event type)
     - In-app notification center
     - SMS notifications (if SMS provider available)
     - Notification scheduling (batch daily at 8 AM, etc.)

6. **Guarantor Management**
   - Effort: 8-12 hours
   - Impact: MEDIUM (required for compliance)
   - Features:
     - Capture guarantor info in tenant onboarding
     - Guarantor verification workflow
     - Guarantor liability tracking
     - Landlord dashboard of guarantors

7. **Multitenancy & Workspace Support**
   - Effort: 20-30 hours
   - Impact: MEDIUM (supports team collaboration)
   - Features:
     - Workspace/portfolio concept
     - Invite team members to workspace
     - Delegated roles (view-only, manager, admin)
     - Audit trail per user
   - Breaking change: Requires DB schema updates

### **Priority 3: Quality & Scale (Then)**

8. **E2E & Integration Tests**
   - Effort: 20-30 hours
   - Impact: MEDIUM (prevents regressions)
   - Test scenarios:
     - Complete landlord onboarding + property setup
     - Tenant invitation + onboarding + payment
     - Rent charge posting + receipt generation
     - Paystack payment flow (using test mode)

9. **Performance Optimization**
   - Effort: 12-16 hours
   - Impact: MEDIUM (improves UX on large portfolios)
   - Tasks:
     - Add Redis cache layer for frequently-accessed data
     - Optimize N+1 queries (batch fetching)
     - Implement pagination for all lists
     - Profile pages with slow queries

10. **Security Hardening**
    - Effort: 12-16 hours
    - Impact: HIGH (protects user data)
    - Tasks:
      - Encrypt sensitive columns (phone, ID numbers)
      - Implement rate limiting on API endpoints
      - Mask PII in audit logs
      - Implement CORS restrictions
      - Security header audit (CSP, X-Frame-Options, etc.)

### **Priority 4: Enhancements (Later)**

11. **Agent Commission Automation**
    - Effort: 8-12 hours
    - Features:
      - Auto-calculate commissions after payment
      - Payout scheduling (weekly, monthly)
      - Commission statements
      - Agent dashboard with earnings

12. **Advanced Payment Processing**
    - Effort: 10-14 hours
    - Features:
      - Partial payment tracking (split rent across multiple dates)
      - Automatic reminder for late payments (SMS/Email)
      - Late charge calculation & application
      - Overpayment handling (credit to next period or refund)

13. **Tenant Guarantor Verification**
    - Effort: 12-16 hours
    - Features:
      - Guarantor document upload (ID, employment letter)
      - Reference checks (email/SMS verification)
      - Guarantor acceptance workflow
      - Guarantor liability display in tenancy

14. **Mobile App (Native)**
    - Effort: 60+ hours (new project)
    - Features:
      - Tenant mobile experience (pay, view receipt, accept agreement)
      - Landlord dashboard (quick view, payments, alerts)
      - Push notifications for payments/renewals

### **Priority 5: Experimental (Future Sprints)**

15. **AI-Powered Tenant Screening**
    - Auto-review tenant KYC documents
    - Flag high-risk applications
    - Similarity checks (cross-reference guarantors)

16. **Blockchain Receipt Notarization**
    - Hash receipts on blockchain for legal proof
    - Immutable audit trail

17. **Property Valuation AI**
    - Recommend rent price based on market data
    - Occupancy prediction

### **Roadmap Timeline** (Estimated)

- **Weeks 1-2**: Priority 1 (WhatsApp, Subscriptions, Phone formatting)
- **Weeks 3-6**: Priority 2 (Reports, Notifications, Guarantors)
- **Weeks 7-10**: Priority 3 (Tests, Performance, Security)
- **Weeks 11+**: Priority 4 & 5 (Agent features, Mobile, AI)

---

## 14. Continuation Instructions For Next AI

### **Critical Rules to Preserve**

🚫 **NEVER DO THIS**:

1. Introduce Redux, Zustand, or other state management libraries
2. Replace server actions with traditional API endpoints (POST /api/...)
3. Skip Zod validation on any user input
4. Write direct Supabase queries outside the repository layer
5. Use generic `Error` instead of `AppError`
6. Mix client and server logic in components
7. Add business logic to action handlers (keep actions thin)
8. Commit `.env.local` or other secrets to git
9. Modify existing migrations (create new ones instead)
10. Change the folder structure without updating this handoff

✅ **ALWAYS DO THIS**:

1. Create server actions for all mutations
2. Validate with Zod before calling services
3. Use repositories to access Supabase
4. Return `ActionResult<T>` from actions
5. Catch errors and return `errorResult(error)`
6. Call `revalidatePath()` after mutations
7. Use `"use client"` only when necessary
8. Add JSDoc comments to functions
9. Test on mobile (375px+) before considering complete
10. Check audit trail for security implications

### **Coding Standards to Maintain**

**TypeScript**:

- Strict mode enabled (`strict: true` in tsconfig.json)
- No `any` types; use explicit types
- Export types alongside implementations
- Use `type` for type aliases, `interface` for object shapes (preferred)

**Formatting**:

- Prettier config: single quotes, no semicolons (wait, config shows defaults; check actual)
- Verify prettier config before running formatter

**Naming**:

- camelCase for functions/variables
- PascalCase for components/classes
- UPPER_SNAKE_CASE for constants
- Descriptive names (no single-letter vars outside loops)

**Comments**:

- JSDoc for public functions
- Inline comments for "why", not "what"
- Update comments if logic changes

**File Organization**:

- One component per file (unless compound components)
- Group related utilities in same folder
- Import order: React → Next → @/ paths → relative paths

### **Testing Before Commit**

1. **Type Checking**: `npx tsc --noEmit`
2. **Linting**: `npm run lint`
3. **Manual Testing**:
   - Test on mobile (DevTools 375px viewport)
   - Verify form validation error messages
   - Check toast notifications appear
   - Confirm revalidation clears old data
4. **Behavior Testing**:
   - Does form submission clear after success?
   - Do empty states display correctly?
   - Do loading spinners appear during submission?

### **Debugging Strategies**

**Server Actions Not Firing**:

- Check for `"use server"` directive at top of file
- Verify form action is passed correctly to `<form action={formAction}>`
- Check browser console for JavaScript errors
- Verify Supabase session is valid

**Database Errors**:

- Check PostgreSQL error code (23505 = duplicate, 23503 = foreign key missing, etc.)
- Verify RLS policy allows the operation
- Check record exists before updating

**Type Errors**:

- Verify action state type matches `useActionState` expectation
- Check FormData.get() returns correct type (always string or null)
- Verify Zod schema matches input structure

**Performance Issues**:

- Check for N+1 queries (use browser DevTools Network tab)
- Verify indexes exist on frequently-filtered columns
- Profile with Vercel Analytics if deployed

### **Extending Features: Checklist**

When adding a new feature, follow this checklist:

- [ ] Create validator schema in `src/server/validators/{feature}.schema.ts`
- [ ] Create repository functions in `src/server/repositories/{feature}.repository.ts`
- [ ] Create service functions in `src/server/services/{feature}.service.ts`
- [ ] Create action functions in `src/actions/{feature}.actions.ts`
- [ ] Create action state type in `src/actions/{feature}.state.ts`
- [ ] Create components in `src/components/{feature}/{ComponentName}.tsx`
- [ ] Create or update page in `src/app/(role)/{path}/page.tsx`
- [ ] Add navigation link if needed (update `LANDLORD_NAVIGATION`, `TENANT_NAVIGATION`, etc.)
- [ ] Test on mobile
- [ ] Test error states (validation errors, network errors, business logic errors)
- [ ] Add audit log if entity is created/updated
- [ ] Update RLS policy if new table
- [ ] Document in this handoff if architectural decision made

### **Common Pitfalls to Avoid**

1. **Forgotten revalidatePath()**: Action completes, but page doesn't update. Always revalidate affected routes.

2. **Validation Errors Not Displayed**: Forgot to check `state.fieldErrors` in component. Always map Zod errors to form fields.

3. **Type Mismatch Between Schema and Component**: Zod schema defines string[], component expects string. Ensure types align.

4. **RLS Policy Preventing Legitimate Access**: Forgot to allow current user in policy. Test with actual user role.

5. **Circular Dependencies**: Action imports service that imports action. Keep action → service → repository direction (no back-references).

6. **Hardcoded URLs**: Used hardcoded URLs instead of `process.env.NEXT_PUBLIC_APP_URL`. Always use env var for URLs.

7. **Forgetting Timezone Handling**: Stored user's timezone-adjusted date instead of UTC. Always store UTC; convert on display.

8. **Missing Error Handling**: Assumed API call succeeds. Always wrap in try-catch and return `errorResult()`.

9. **Breaking Changes to Existing Features**: Changed existing table schema without migration. Always create new migration; never alter existing.

10. **No Audit Trail for Sensitive Operations**: User deleted payment without audit log. Always log sensitive changes via `writeAuditLog()`.

### **Documentation to Update**

When making changes, update:

- [ ] This handoff spec (add/update section if architectural change)
- [ ] JSDoc comments (function parameters, return types, example usage)
- [ ] CHANGELOG or COMMITS (describe what changed and why)
- [ ] If database schema changed: add entry to this handoff's "Data Models" section

### **Refactor Philosophy**

**When to refactor**:

- Code is duplicated (DRY principle)
- Function is >50 lines (too complex)
- Component has >3 levels of nesting
- Type any is discovered

**How to refactor**:

1. Write tests first (or manual test steps)
2. Refactor small pieces (don't rewrite entire feature)
3. Run tests after each step
4. Commit small, logical changesets
5. Update handoff if architectural change

**What NOT to refactor**:

- Working features close to deadline
- Entire feature at once (too risky)
- Without understanding why current way exists (may have reason)

### **Escalation & Questions**

If you encounter:

- **"I don't know what this code does"** → Add JSDoc comment explaining. Future AI will thank you.
- **"This seems wrong but I'm not sure"** → Document the assumption. Add a TODO comment.
- **"Multiple ways to do this, which is right?"** → Follow the pattern used elsewhere in codebase.
- **"This is broken but fixing it requires major refactor"** → Document as known debt (Section 12) with priority.
- **"I'm stuck on X"** → Review error logs, check browser DevTools, verify assumptions with console.log.

### **Success Criteria for New AI Continuing Project**

✅ **You've succeeded if**:

1. You can explain the architecture in 5 minutes (layers, data flow)
2. You can add a new feature without asking "where does this go?"
3. You don't modify `.gitignore`, `package.json` basics, or `tsconfig.json`
4. You don't introduce new dependencies without justifying
5. Existing features still work after your changes
6. New code follows naming, structure, and error handling patterns
7. You've added JSDoc to your functions
8. You've tested on mobile before committing
9. You've updated this handoff if you made architectural decisions
10. You can point to a test (manual or automated) proving your feature works

---

# END OF HANDOFF SPECIFICATION

**Last Updated**: May 14, 2026  
**Next AI**: Use this document as your single source of truth. If something isn't covered, add it to this document after implementation. Future AI builds on your knowledge.

**Key Contacts / References**:

- Supabase Docs: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- React 19: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- Zod: https://zod.dev
- Vercel Docs: https://vercel.com/docs
