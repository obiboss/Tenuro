# PROJECT HANDOFF SPECIFICATION

## 1. Project Overview

**Project Name:** Tenuro

**Core Purpose:** A property management and rent payment tracking system specifically designed for Nigerian landlords to maintain proper rental records, track tenant payments, manage properties and units, and generate professional receipts.

**Target Users:**
- Primary: Nigerian landlords managing multiple properties
- Secondary: Tenants (for rent payment and account activation)
- Tertiary: Caretakers/property managers

**Business/Domain Context:**
- Solves the problem of scattered, unorganized rental records in Nigeria
- Enables landlords to track who has paid, who owes rent, and maintain a complete audit trail
- Supports multiple properties, units, tenants, and payment methods
- Integrates with Paystack for secure online rent payments
- Sends professional receipts via WhatsApp to tenants
- Implements a complete tenant onboarding and activation workflow

**Product Philosophy:**
- "Property records made simple" — simplicity and clarity are paramount
- Proper documentation and audit trails are essential for trust
- Mobile-friendly, WhatsApp-first communication with tenants
- Professional receipts and documentation for legal compliance
- Clear, visual hierarchy with proper information architecture

---

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 16.2.4 (React 19.2.4, TypeScript 5)
- **Styling:** Tailwind CSS 4 with custom theme extensions
- **Component Library:** Built-in custom UI components (no external UI framework)
- **Icons:** Lucide React 1.11.0
- **PDF Generation:** @react-pdf/renderer 4.5.1
- **Form State Management:** React's useActionState hook (built-in form actions)
- **Font:** Plus Jakarta Sans (Google Fonts)

### Backend
- **Framework:** Next.js Server Actions ("use server") for backend logic
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (phone + password, email + password, magic links)
- **File Storage:** Supabase Storage (for documents and photos)
- **Validation:** Zod 4.3.6 (runtime validation for all inputs)
- **Error Handling:** Custom AppError class with structured error responses

### Third-Party Integrations
- **Payments:** Paystack (rent payment processing, webhook handling, splits)
- **Email:** Resend 6.12.2 (transactional emails)
- **Background Jobs:** Inngest 4.2.4 (scheduled tasks, webhooks)
- **Utilities:** date-fns 4.1.0 (date manipulation), clsx 2.1.1, tailwind-merge 3.5.0

### Infrastructure & Deployment
- **Hosting:** Vercel (configured via vercel.json)
- **Database:** Supabase (PostgreSQL with RLS)
- **Serverless Functions:** Next.js API Routes and Server Actions
- **Cron Jobs:** Inngest for scheduled tasks

---

## 3. Architecture Overview

### High-Level Architecture Pattern
**Client-Server Architecture with Server Actions:**
- All business logic resides on the server (Next.js Server Actions using "use server")
- React components on the client handle UI, form submission, and display
- Zod validators on the server ensure all inputs are valid before processing
- Error results are structured and returned to the client for display

**Request Flow:**
1. Client renders a form using React components
2. User submits form → form action is triggered (useActionState)
3. Server Action receives FormData, validates with Zod schema
4. Service layer performs business logic with repository access
5. Results are returned as structured ActionResult<T> (success or error)
6. Cache is revalidated (revalidatePath) if needed
7. UI is updated with result message and any field errors

### Data Flow Architecture
- **Repository Layer:** Direct database access via Supabase client
- **Service Layer:** Business logic, authorization checks, audit logging
- **Action Layer:** Form action handlers that orchestrate service calls
- **Validator Layer:** Zod schemas that validate all inputs before processing
- **Error Layer:** Centralized error handling with user-friendly messages and field errors

### Component Architecture Philosophy
- **Functional Components:** All components are function-based React components
- **Server Components:** Most pages and layouts are Server Components (default in App Router)
- **Client Components:** Only components that need interactivity are marked "use client"
- **Composition over Inheritance:** Small, reusable UI components composed together
- **Prop Drilling Minimized:** Use of layout-based context when needed
- **Separation of Concerns:** UI components separate from form logic and data fetching

### State Management Architecture
- **Form State:** React's useActionState hook + Server Actions (no external state library)
- **Page Data:** Server-side data fetching in Server Components (no client-side store)
- **Global State:** Minimal use of context (only for toast notifications)
- **Real-Time Updates:** Cache revalidation via revalidatePath/revalidateTag after mutations

### API/Service Layer Structure
**Service Layer Pattern:**
- Each domain (properties, tenants, payments, etc.) has a `.service.ts` file
- Services contain business logic and authorization checks
- Services call repositories for data access
- Services call other services for complex operations
- Services write audit logs for all state changes
- Services enforce permission checks using auth.service functions (requireLandlord, requireTenant, etc.)

**Repository Layer Pattern:**
- Direct Supabase client access (createSupabaseServerClient)
- Each repository handles a single domain entity
- Repositories use Zod validators for input validation
- Repositories handle database errors and convert to AppError
- Type-safe queries with TypeScript and Zod inferred types
- Helper functions for common queries (e.g., getById, create, update, list)

### Validation/Error Handling Approach
- **Input Validation:** Zod schemas validate all FormData and API inputs
- **Error Types:** AppError for application errors, ZodError for validation errors
- **Error Conversion:** errorResult() converts all errors to structured ActionResult
- **Field Errors:** Validation errors include per-field error messages (fieldErrors)
- **User Messages:** All errors have user-friendly messages (not technical details)
- **Database Errors:** Database errors are mapped to readable user messages via ERROR_MESSAGES map
- **Permission Errors:** 403 AppError for unauthorized access
- **Audit Logging:** All state changes are logged with context (actor, action, entity, metadata)

---

## 4. Project Structure

```
tenuro/
├── src/
│   ├── actions/                          # Server Actions for form handling
│   │   ├── auth.actions.ts               # Auth-related form actions
│   │   ├── auth.state.ts                 # Initial state for auth forms
│   │   ├── properties.actions.ts         # Property CRUD actions
│   │   ├── property.state.ts             # Initial state for property forms
│   │   ├── tenants.actions.ts            # Tenant CRUD actions
│   │   ├── tenant.state.ts               # Initial state for tenant forms
│   │   ├── payments.actions.ts           # Payment-related actions
│   │   ├── tenancies.actions.ts          # Tenancy (rental agreement) actions
│   │   ├── tenant-activation.actions.ts  # Tenant account activation actions
│   │   ├── receipts.actions.ts           # Receipt generation actions
│   │   ├── units.actions.ts              # Unit (flat/room) actions
│   │   ├── renewals.actions.ts           # Tenancy renewal actions
│   │   ├── quit-notices.actions.ts       # Notice to quit actions
│   │   ├── tenancy-agreements.actions.ts # Agreement document actions
│   │   ├── onboarding.actions.ts         # Tenant onboarding actions
│   │   ├── property-rules.actions.ts     # Property rules (charges, fees) actions
│   │   ├── caretakers.actions.ts         # Caretaker management actions
│   │   ├── notifications.actions.ts      # Notification actions
│   │   └── app-fee-payment.actions.ts    # App fee payment actions
│   │
│   ├── app/                              # Next.js App Router directory
│   │   ├── globals.css                   # Global Tailwind CSS imports
│   │   ├── layout.tsx                    # Root layout with font setup
│   │   ├── page.tsx                      # Home page (landing/marketing)
│   │   ├── (auth)/                       # Auth route group
│   │   │   ├── layout.tsx                # Auth layout (centered, no sidebar)
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (landlord)/                   # Protected landlord routes
│   │   │   ├── layout.tsx                # Landlord layout with sidebar
│   │   │   ├── overview/                 # Dashboard
│   │   │   ├── properties/               # Property management
│   │   │   ├── tenants/                  # Tenant management
│   │   │   ├── payments/                 # Payment history and recording
│   │   │   ├── renewals/                 # Tenancy renewal management
│   │   │   ├── activity/                 # Audit log viewer
│   │   │   ├── caretakers/               # Caretaker/property manager management
│   │   │   ├── reports/                  # Reporting and export
│   │   │   └── settings/                 # Landlord settings
│   │   ├── (tenant)/                     # Protected tenant routes
│   │   │   ├── layout.tsx                # Tenant layout
│   │   │   └── tenant/                   # Tenant dashboard
│   │   ├── api/                          # API routes
│   │   │   ├── inngest/                  # Inngest job webhook endpoint
│   │   │   ├── webhooks/                 # Paystack webhook handler
│   │   │   ├── files/                    # File upload endpoints
│   │   │   ├── onboarding/               # Onboarding API endpoints
│   │   │   └── cron/                     # Cron task endpoints
│   │   ├── auth/                         # Special auth routes
│   │   │   └── callback/                 # OAuth callback handling
│   │   ├── app-fees/                     # App fee payment flow
│   │   │   └── verify/
│   │   ├── t/                            # Tenant activation and public links
│   │   │   ├── activate/                 # Tenant account activation
│   │   │   ├── agreement/                # Tenancy agreement view
│   │   │   ├── onboarding/               # Tenant onboarding flow
│   │   │   └── pay/                      # Public rent payment link
│   │
│   ├── components/                       # React UI components
│   │   ├── auth/                         # Auth-related components
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   ├── phone-login-form.tsx
│   │   │   ├── email-login-form.tsx
│   │   │   ├── phone-number-input.tsx
│   │   │   ├── otp-code-input.tsx
│   │   │   ├── magic-link-form.tsx
│   │   │   ├── email-fallback-panel.tsx
│   │   │   ├── logout-button.tsx
│   │   │   └── landlord-profile-setup.tsx
│   │   ├── layout/                       # Layout components
│   │   │   ├── app-shell.tsx             # Main app wrapper
│   │   │   ├── landlord-shell.tsx        # Landlord sidebar layout
│   │   │   ├── sidebar.tsx               # Navigation sidebar
│   │   │   ├── mobile-nav.tsx            # Mobile navigation
│   │   │   └── mobile-more-menu.tsx      # Mobile menu
│   │   ├── onboarding/                   # Tenant onboarding components
│   │   ├── payment/                      # Payment-related components
│   │   │   ├── manual-payment-form.tsx
│   │   │   ├── payment-list.tsx
│   │   │   └── [other payment components]
│   │   ├── property/                     # Property components
│   │   ├── property-rules/               # Property rules components
│   │   ├── quit-notices/                 # Quit notice components
│   │   ├── renewal/                      # Renewal components
│   │   ├── tenancy/                      # Tenancy agreement components
│   │   ├── tenant/                       # Tenant profile components
│   │   └── ui/                           # Reusable UI primitives
│   │       ├── action-result-toast.tsx   # Toast from action result
│   │       ├── badge.tsx                 # Badge component
│   │       ├── button.tsx                # Button component
│   │       ├── card.tsx                  # Card component
│   │       ├── currency-input.tsx        # Money input with formatting
│   │       ├── empty-state.tsx           # Empty state display
│   │       ├── error-state.tsx           # Error state display
│   │       ├── input.tsx                 # Text input with error support
│   │       ├── loading-state.tsx         # Loading state display
│   │       ├── page-header.tsx           # Page title + description header
│   │       ├── section-card.tsx          # Content card with title
│   │       ├── select.tsx                # Dropdown select
│   │       ├── stat-card.tsx             # Statistics card
│   │       ├── status-pill.tsx           # Status badge
│   │       ├── textarea.tsx              # Multiline text input
│   │       ├── toast-provider.tsx        # Toast notification provider
│   │       ├── toast.tsx                 # Toast notification
│   │       ├── trust-notice.tsx          # Info notice component
│   │       ├── use-toast.ts              # Toast hook
│   │       └── whatsapp-send-button.tsx  # WhatsApp message button
│   │
│   ├── lib/                              # Utility functions and helpers
│   │   ├── cn.ts                         # Tailwind class merger
│   │   ├── navigation.ts                 # Navigation helpers
│   │   ├── status-copy.ts                # Status display text
│   │   └── tenancy-period.ts             # Rent period calculations
│   │
│   ├── server/                           # Server-only code
│   │   ├── constants/                    # Application constants
│   │   │   ├── audit-events.ts           # Audit event types and actors
│   │   │   ├── notification-types.ts     # Notification type constants
│   │   │   ├── permissions.ts            # Permission checks
│   │   │   ├── routes.ts                 # Route constants
│   │   │   ├── session.ts                # Session constants
│   │   │   └── storage-paths.ts          # File storage paths
│   │   │
│   │   ├── errors/                       # Error handling
│   │   │   ├── app-error.ts              # AppError class
│   │   │   ├── error-map.ts              # Error code to message mapping
│   │   │   └── result.ts                 # ActionResult type and handlers
│   │   │
│   │   ├── jobs/                         # Background jobs
│   │   │   ├── inngest.client.ts         # Inngest client setup
│   │   │   ├── payment.jobs.ts           # Payment-related jobs
│   │   │   ├── receipt.jobs.ts           # Receipt generation jobs
│   │   │   ├── notification.jobs.ts      # Notification jobs
│   │   │   └── renewal.jobs.ts           # Renewal reminder jobs
│   │   │
│   │   ├── repositories/                 # Database access layer
│   │   │   ├── properties.repository.ts
│   │   │   ├── units.repository.ts
│   │   │   ├── tenants.repository.ts
│   │   │   ├── tenancies.repository.ts
│   │   │   ├── payments.repository.ts
│   │   │   ├── receipts.repository.ts
│   │   │   ├── profiles.repository.ts
│   │   │   ├── tenant-activation.repository.ts
│   │   │   ├── tenancy-agreements.repository.ts
│   │   │   ├── renewal.repository.ts
│   │   │   ├── quit-notices.repository.ts
│   │   │   ├── payment-context.repository.ts
│   │   │   ├── ledger.repository.ts
│   │   │   ├── gateway-payment.repository.ts
│   │   │   ├── caretakers.repository.ts
│   │   │   ├── onboarding.repository.ts
│   │   │   ├── notifications.repository.ts
│   │   │   ├── otp.repository.ts
│   │   │   ├── audit.repository.ts
│   │   │   ├── audit-log.repository.ts
│   │   │   └── [other repositories]
│   │   │
│   │   ├── services/                     # Business logic layer
│   │   │   ├── auth.service.ts           # Auth utilities (requireLandlord, etc.)
│   │   │   ├── properties.service.ts     # Property management logic
│   │   │   ├── units.service.ts          # Unit management logic
│   │   │   ├── tenants.service.ts        # Tenant management logic
│   │   │   ├── tenancies.service.ts      # Tenancy management logic
│   │   │   ├── payments.service.ts       # Payment recording logic
│   │   │   ├── paystack.service.ts       # Paystack API integration
│   │   │   ├── gateway-payment.service.ts # Payment gateway logic
│   │   │   ├── receipts.service.ts       # Receipt generation logic
│   │   │   ├── receipt-pdf.service.tsx   # PDF receipt renderer
│   │   │   ├── tenant-activation.service.ts # Tenant activation workflow
│   │   │   ├── tenancy-agreements.service.ts # Agreement generation
│   │   │   ├── quit-notices.service.ts   # Quit notice logic
│   │   │   ├── renewals.service.ts       # Renewal logic
│   │   │   ├── onboarding.service.ts     # Tenant onboarding workflow
│   │   │   ├── audit-log.service.ts      # Audit logging
│   │   │   ├── landlord-bank.service.ts  # Bank account setup
│   │   │   ├── notification-queue.service.ts # Notification queue
│   │   │   ├── whatsapp.service.ts       # WhatsApp message sending
│   │   │   ├── session.service.ts        # Session management
│   │   │   ├── storage.service.ts        # File storage
│   │   │   ├── idempotency.service.ts    # Idempotency handling
│   │   │   ├── pdf.service.ts            # PDF utilities
│   │   │   └── [other services]
│   │   │
│   │   ├── supabase/                     # Supabase client setup
│   │   │   ├── server.ts                 # Server client (with cookies)
│   │   │   └── admin.ts                  # Admin client (service role)
│   │   │
│   │   ├── types/                        # TypeScript type definitions
│   │   │   ├── auth.types.ts             # Auth-related types
│   │   │   ├── payment.types.ts          # Payment-related types
│   │   │   ├── paystack.types.ts         # Paystack-specific types
│   │   │   ├── onboarding.types.ts       # Onboarding flow types
│   │   │   └── compliance.types.ts       # Compliance-related types
│   │   │
│   │   ├── utils/                        # Utility functions
│   │   │   ├── crypto.ts                 # Crypto utilities (hashing)
│   │   │   ├── dates.ts                  # Date parsing utilities
│   │   │   ├── encryption.ts             # Encryption utilities
│   │   │   ├── money.ts                  # Money/currency formatting
│   │   │   ├── phone.ts                  # Phone number normalization
│   │   │   ├── tokens.ts                 # Secure token generation
│   │   │   └── whatsapp.ts               # WhatsApp message formatting
│   │   │
│   │   └── validators/                   # Zod validation schemas
│   │       ├── auth.schema.ts            # Auth input validation
│   │       ├── common.schema.ts          # Common validators (UUID, money, etc.)
│   │       ├── property.schema.ts        # Property validation
│   │       ├── unit.schema.ts            # Unit validation
│   │       ├── tenant.schema.ts          # Tenant validation
│   │       ├── tenancy.schema.ts         # Tenancy validation
│   │       ├── payment.schema.ts         # Payment validation
│   │       ├── tenancy-agreement.schema.ts # Agreement validation
│   │       ├── onboarding.schema.ts      # Onboarding validation
│   │       ├── compliance.schema.ts      # Compliance/KYC validation
│   │       ├── caretaker.schema.ts       # Caretaker validation
│   │       ├── notification.schema.ts    # Notification validation
│   │       ├── renewal.schema.ts         # Renewal validation
│   │       ├── property-rule.schema.ts   # Property rules validation
│   │       ├── tenant-activation.schema.ts # Tenant activation validation
│   │       └── file.schema.ts            # File upload validation
│   │
│   └── proxy.ts                          # Edge middleware (if used)
│
├── supabase/
│   └── migrations/                       # Database migrations (empty - using Supabase CLI)
│
├── public/                               # Static assets
│
├── package.json                          # Dependencies and scripts
├── tsconfig.json                         # TypeScript configuration
├── next.config.ts                        # Next.js configuration
├── tailwind.config.ts                    # Tailwind CSS theme
├── postcss.config.mjs                    # PostCSS configuration
├── eslint.config.mjs                     # ESLint configuration
├── vercel.json                           # Vercel deployment config
└── README.md                             # Project documentation
```

**Key Structural Principles:**
- **Separation of Concerns:** Actions → Services → Repositories → Database
- **Role-Based Routes:** (auth), (landlord), (tenant) route groups for clear permission boundaries
- **Public Routes:** /t/* routes are public for tenant activation and payment links
- **API Routes:** /api/* routes handle webhooks and special endpoints
- **Colocation:** Related components grouped by feature (payment, property, tenant, etc.)

---

## 5. Implemented Features

### Authentication & Authorization
- **Email/Password Login:** Secure email + password authentication
- **Phone/Password Login:** Nigerian phone number + password authentication
- **Magic Link Login:** Passwordless email login
- **OTP (Legacy):** Phone-based OTP (kept for backward compatibility)
- **Role-Based Access:** Three roles (landlord, tenant, caretaker) with different permission levels
- **Session Management:** Supabase Auth with server-side session verification
- **Protected Routes:** Route guards via requireLandlord(), requireTenant(), requireCaretaker()

### Property Management
- **Create Property:** Add new properties with location details (state, LGA)
- **Update Property:** Edit property details
- **View Properties:** List all properties with unit statistics
- **Archive Property:** Soft delete properties
- **Property Types:** Support residential, mixed_use, flat_complex
- **Location Tracking:** State and LGA (Local Government Area) fields for Nigerian context
- **Unit Management:** Create, update, and manage units within properties

### Tenant Management
- **Tenant Shell Creation:** Create tenant records with basic info (name, phone, email)
- **Tenant Profile Update:** Add detailed tenant information (address, occupation, employer)
- **Tenant Status Tracking:** draft, onboarded, pending_approval, approved, rejected, archived
- **Tenant Onboarding:** Multi-step form for tenant KYC and document collection
- **Tenant Activation:** Generate secure activation links for tenants to set passwords
- **Guarantor Information:** Capture guarantor details and contact information
- **Tenant Rejection:** Reject tenant onboarding with reason
- **Tenant Approval:** Approve tenant profiles after onboarding

### Rental Agreements (Tenancies)
- **Create Tenancy:** Link tenant to unit, set rent amount and payment frequency
- **Tenancy States:** draft, active, expired, terminated, archived
- **Payment Frequency:** Annual, quarterly, biannual, monthly
- **Opening Balance:** Track previous debt/credit from prior agreements
- **Tenancy Period Calculation:** Auto-calculate end dates based on frequency
- **Renewal Notice:** Set renewal reminder dates
- **Tenancy Termination:** End tenancies with reason
- **Tenancy Renewal:** Renew agreements for new period
- **Rental Reference:** Auto-generated tenancy reference numbers

### Payment Management
- **Manual Payment Recording:** Record cash, bank transfer, and other payments
- **Gateway Payment:** Paystack integration for online rent payments
- **Payment History:** View all payments with date, amount, and method
- **Payment Idempotency:** Prevent duplicate payments with idempotency keys
- **Payment Reversals:** Reverse payments with audit trail
- **Payment Filtering:** Filter by date range (this year filter)
- **Receipt Generation:** Generate professional PDF receipts
- **Receipt Distribution:** Send receipts via WhatsApp

### Payment Processing (Paystack)
- **Initialize Rent Payment:** Create Paystack payment links for tenants
- **Webhook Handling:** Process Paystack transaction webhooks
- **Payment Verification:** Verify Paystack transactions
- **Bank Account Setup:** Configure landlord bank account for payouts
- **Payment Splits:** Support Paystack splits for app fee distribution
- **Transaction Metadata:** Capture tenancy and payment context in Paystack metadata

### Receipts & Documents
- **Receipt PDF Generation:** Create professional rent receipts with branding
- **Receipt Distribution:** Send receipts via WhatsApp to tenants
- **Receipt Status Tracking:** pending, generated, failed, voided states
- **Tenancy Agreement PDF:** Generate rental agreement documents
- **Quit Notice PDF:** Generate notice to quit documents
- **Document Storage:** Store documents in Supabase Storage

### Tenant Onboarding Workflow
- **Onboarding Link Generation:** Create secure, time-limited onboarding links
- **Personal Details Collection:** Name, phone, email, date of birth, address, occupation
- **Document Upload:** ID document and passport photo uploads
- **Guarantor Information:** Collect guarantor details
- **Bank Account Details:** Collect tenant bank information
- **Income Verification:** Capture income range for compliance
- **Multi-Step Forms:** Progressive disclosure of onboarding steps
- **Status Tracking:** Tracking through onboarding workflow
- **Data Encryption:** Secure storage of sensitive KYC data

### Renewals & Notifications
- **Renewal Reminder Dates:** Set dates for tenancy renewal reminders
- **Renewal Overview:** Dashboard showing upcoming renewals with urgency levels
- **Renewal Urgency:** Categorized as overdue, due_today, within 30/60/90 days
- **Renewal Notifications:** Automated notifications for renewal deadlines
- **Renewal Processing:** Create new tenancy from renewal

### Quit Notices (Notice to Vacate)
- **Generate Quit Notice:** Create official notice to quit documents
- **Tenancy Termination:** Initiate tenancy termination with quit notice
- **PDF Export:** Generate printable quit notice documents

### Ledger & Accounting
- **Payment Ledger:** Track all payments and credits against tenancy
- **Balance Calculation:** Real-time outstanding balance calculations
- **Opening Balance:** Initial debt/credit on new tenancies
- **Payment Allocation:** Allocate payments to specific periods
- **Rent Charge Dates:** Calculate next rent due dates based on frequency

### Audit Logging
- **Complete Audit Trail:** Log all state changes with actor and timestamp
- **Audit Events:** Detailed events for properties, tenancies, payments, etc.
- **Metadata Logging:** Store change details in structured metadata
- **Activity Viewer:** Frontend display of audit logs
- **Actor Tracking:** Track who (landlord/tenant/system) made each change

### Notifications (SMS/WhatsApp)
- **WhatsApp Integration:** Send messages via WhatsApp API
- **SMS Fallback:** SMS delivery as fallback (if configured)
- **Notification Types:** Payment reminders, receipts, onboarding links
- **Notification Queue:** Queue notifications for async delivery
- **Delivery Tracking:** Track notification delivery status

### Caretaker Management
- **Create Caretaker:** Add property caretakers/managers
- **Caretaker Roles:** Limited permissions for caretaker accounts
- **Property Assignment:** Assign caretakers to specific properties
- **Caretaker Actions:** Limited set of actions (property updates, payment recording)

### App Fee Management
- **App Fee Calculation:** Calculate and track app fees on transactions
- **App Fee Payment:** Separate payment flow for app fees
- **App Fee Paystack Splits:** Split payments between landlord and app

### Public Tenant Links
- **/t/activate/** - Tenant account activation page
- **/t/onboarding/** - Public tenant onboarding form
- **/t/agreement/** - View rental agreement
- **/t/pay/** - Public rent payment link (WhatsApp-shareable)

---

## 6. In-Progress / Partial Features

### Features with Known Gaps or Partial Implementation

1. **Caretaker Dashboard:** Caretaker accounts exist but caretaker-specific dashboard may be incomplete
2. **Report Generation:** Report endpoints exist but comprehensive reporting UI may be in progress
3. **Property Rules/Charges:** Infrastructure for rules exists but full UI/workflow may be incomplete
4. **Compliance Features:** KYC and compliance tracking structures exist but may need enhancement
5. **Multi-Currency Support:** Framework exists (currencyCode field) but primarily tested with NGN
6. **Tenant Dashboard:** Tenant view for payments and profile exists but may need features
7. **Mobile Responsiveness:** Layout components handle mobile but some pages may need optimization

### Features Requiring Completion
- Complete caretaker feature implementation
- Full reporting dashboard and export functionality
- Advanced property rules and automation
- Enhanced compliance and document management
- Comprehensive mobile app testing and optimization
- Landlord profile/settings completion
- Bank account management improvements

---

## 7. Core Reusable Patterns

### Server Action Pattern
```typescript
// 1. Define state type
export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

// 2. Create action function
export async function actionName(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Validate input
    const parsed = someSchema.parse({
      field: formData.get("field"),
    });
    // Process business logic
    const result = await someService.doSomething(parsed);
    // Revalidate cache
    revalidatePath("/route");
    return { ok: true, message: "Success" };
  } catch (error) {
    const result = errorResult(error);
    return { ok: false, message: result.message, fieldErrors: ... };
  }
}

// 3. Initialize state
export const initialActionState: ActionState = {
  ok: false,
  message: "",
};

// 4. Use in component
const [state, formAction, isPending] = useActionState(actionName, initialActionState);
return <form action={formAction}>...</form>;
```

### Service Layer Pattern
```typescript
// 1. Check authorization
export async function serviceFunction(input: InputType) {
  const landlord = await requireLandlord(); // Throws if not landlord
  const supabase = await createSupabaseServerClient();

  // 2. Get data and validate ownership
  const entity = await repository.getById(supabase, id);
  if (entity.landlord_id !== landlord.id) {
    throw new AppError("FORBIDDEN", "No permission", 403);
  }

  // 3. Perform business logic
  const result = await repository.update(supabase, id, input);

  // 4. Write audit log
  await writeAuditLog({
    landlordId: landlord.id,
    actorProfileId: landlord.id,
    eventType: AUDIT_EVENT_TYPES.updated,
    entityId: id,
    description: "Entity was updated",
    metadata: { ...input },
  });

  return result;
}
```

### Repository Pattern
```typescript
export async function getById(
  supabase: SupabaseClient,
  id: string
): Promise<EntityRow> {
  const { data, error } = await supabase
    .from("entities")
    .select("id, name, ...")
    .eq("id", id)
    .single<EntityRow>();

  if (error) throw error;
  return data;
}

export async function create(
  supabase: SupabaseClient,
  input: CreateInput
): Promise<EntityRow> {
  const { data, error } = await supabase
    .from("entities")
    .insert({
      field: input.field,
      ...
    })
    .select("id, name, ...")
    .single<EntityRow>();

  if (error) throw error;
  return data;
}
```

### Form Component Pattern
```typescript
export function MyForm() {
  const [state, formAction, isPending] = useActionState(
    myAction,
    initialState
  );

  return (
    <form action={formAction}>
      {state.message && (
        <div className={state.ok ? "success" : "error"}>
          {state.message}
        </div>
      )}

      <Input
        name="fieldName"
        error={state.fieldErrors?.fieldName?.[0]}
        required
      />

      <Button type="submit" isLoading={isPending}>
        Submit
      </Button>
    </form>
  );
}
```

### Page Data Fetching Pattern
```typescript
export default async function Page() {
  // Fetch in Server Component
  const data = await serviceFunction();

  return (
    <>
      <ClientComponent initialData={data} />
    </>
  );
}

// Client component that can interact
function ClientComponent({ initialData }) {
  const [state, formAction] = useActionState(updateAction, {});
  return <form action={formAction}>...</form>;
}
```

### Zod Validator Pattern
```typescript
export const createEntitySchema = z.object({
  name: z.string().trim().min(2, "Name required").max(120),
  email: z.string().email(),
  amount: z.coerce.number().positive("Must be positive"),
  optional: z.string().optional().or(z.literal("")),
});

// Type inference
export type CreateEntityInput = z.infer<typeof createEntitySchema>;

// Usage
const parsed = createEntitySchema.parse({
  name: formData.get("name"),
  email: formData.get("email"),
  amount: formData.get("amount"),
  optional: formData.get("optional"),
});
```

### List Rendering Pattern
```typescript
export async function ListPage() {
  const items = await getItems();

  if (items.length === 0) {
    return <EmptyState title="No items" description="Create one..." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
            </div>
            <Link href={`/items/${item.id}`}>
              <Button variant="secondary">View</Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Modal/Dialog Pattern
```typescript
export function MyModal({ isOpen, onClose, onConfirm }) {
  return (
    <dialog open={isOpen} className="fixed inset-0">
      <div className="bg-surface rounded-card p-6 shadow-card">
        <h2 className="font-semibold text-text-strong">Confirm Action</h2>
        <p className="mt-2 text-text-muted">Are you sure?</p>

        <div className="mt-6 flex gap-3">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} tone="danger">
            Delete
          </Button>
        </div>
      </div>
    </dialog>
  );
}
```

### Error Handling Pattern
```typescript
try {
  const result = await risky();
  return successResult("Done", result);
} catch (error) {
  const result = errorResult(error);
  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}
```

### Toast Notification Pattern
```typescript
import { useToast } from "@/components/ui/use-toast";

export function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await doSomething();
      toast({
        type: "success",
        title: "Done",
        description: "Action succeeded",
      });
    } catch {
      toast({
        type: "error",
        title: "Error",
        description: "Something went wrong",
      });
    }
  };

  return <button onClick={handleAction}>Action</button>;
}
```

---

## 8. Styling / Design System Rules

### Theme Philosophy
- **Clean and Professional:** Designed for serious business use (property management)
- **Nigerian Context:** Colors and design reflect local preferences
- **Trust-Focused:** Color choices and design convey security and reliability
- **Accessibility First:** Proper contrast ratios and semantic HTML

### Color System
```typescript
// Primary: Professional blue for main CTAs and navigation
primary: {
  DEFAULT: "#1B4FD8",    // Main blue
  hover: "#153FB0",       // Darker on hover
  soft: "#EAF0FF",        // Light background
}

// Gold: Accent color for success, money, highlights
gold: {
  DEFAULT: "#F6B73C",     // Warm gold
  deep: "#D97706",        // Darker for secondary actions
  soft: "#FFF4D8",        // Light background
}

// Status Colors: Semantic meanings
success: {
  DEFAULT: "#16A34A",     // Green for positive
  soft: "#EAF7EE",
}
warning: {
  DEFAULT: "#D97706",     // Orange for warnings
  soft: "#FFF3DF",
}
danger: {
  DEFAULT: "#DC2626",     // Red for destructive
  soft: "#FDECEC",
}

// Text Colors: Clear hierarchy
text: {
  strong: "#111827",      // Headings, important
  normal: "#374151",      // Body text
  muted: "#6B7280",       // Secondary, hints
}

// Backgrounds
background: "#F8F7F4",    // Warm neutral page background
surface: "#FFFFFF",       // Card/surface background

// Borders
border.soft: "#E7E5DF",   // Subtle dividers
```

### Typography Rules
- **Font Family:** Plus Jakarta Sans (Google Fonts) for all text
- **Heading Scale:** Use semantic HTML (h1-h6)
- **Font Weight:** Regular (400), Semibold (600), Extrabold (800)
- **Line Height:** Generous line height for readability
- **Letter Spacing:** Tight tracking for headings

**Typography Classes:**
- Headings: `text-4xl font-extrabold`, `text-3xl font-bold`, `text-lg font-semibold`
- Body: `text-base leading-8`, `text-sm`
- Muted text: `text-text-muted text-sm`

### Spacing Conventions
- **Base Unit:** 4px (Tailwind default)
- **Common Values:** Use Tailwind spacing scale (p-4, gap-6, my-8, etc.)
- **Section Spacing:** py-8 for sections, py-16 for major sections
- **Component Spacing:** gap-3 for tight groups, gap-6 for loose groups
- **Card Padding:** p-6 standard, p-4 compact

### Layout/Grid Rules
- **Container:** max-w-7xl with px-4 (mobile) / px-8 (desktop)
- **Two-Column:** lg:grid-cols-[1fr_420px] for sidebar layouts
- **Three-Column:** md:grid-cols-3 for feature/card grids
- **Responsive:** Mobile-first, add breakpoints: md:, lg:, xl:
- **Flexbox:** Use flex for horizontal layouts, default flex-col for mobile

### Card/Button/Input Styles

**Cards:**
```typescript
className="rounded-card bg-surface p-6 shadow-card"
// Or with title:
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

**Buttons:**
```typescript
// Primary
<Button>Click Me</Button>

// Secondary
<Button variant="secondary">Secondary</Button>

// Danger
<Button tone="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading={true}>Loading...</Button>
<Button disabled>Disabled</Button>

// Full width
<Button fullWidth>Full Width</Button>
```

**Inputs:**
```typescript
<Input
  label="Field Label"
  name="fieldName"
  type="text"
  placeholder="Enter value"
  error="Error message if invalid"
  required
/>

<Select
  label="Choose option"
  name="selectName"
  options={[
    { value: "a", label: "Option A" },
  ]}
/>

<Textarea
  label="Comments"
  name="comments"
  placeholder="Enter text"
  rows={4}
/>
```

### Status/State Indicators
```typescript
// Status Pills
<StatusPill status="active">Active</StatusPill>
<StatusPill status="pending">Pending</StatusPill>

// Badges
<Badge tone="primary">Primary</Badge>
<Badge tone="success">Success</Badge>
<Badge tone="warning">Warning</Badge>
<Badge tone="danger">Danger</Badge>

// Stat Cards
<StatCard
  title="Total Units"
  value="24"
  description="Across properties"
  tone="primary"
/>
```

### Responsive Design Approach
- **Mobile First:** Default styles for mobile, then add breakpoints
- **Breakpoints:** Use Next.js standard (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- **Touch Friendly:** Minimum 44px tap targets on mobile
- **Readable:** Avoid text smaller than 16px on mobile
- **Single Column:** Mobile defaults to single column, desktop uses grids
- **Hidden Elements:** `hidden md:block` for desktop-only, `md:hidden` for mobile-only

### Animation/Motion Conventions
- **Transitions:** Smooth 200-300ms transitions for interactive elements
- **Hover Effects:** Subtle color changes and slight scaling
- **Loading:** Spinner or skeleton loading states
- **No Motion:** Respect `prefers-reduced-motion` media query

**Animation Examples:**
```typescript
// Hover effects
className="hover:bg-primary-hover transition-colors"

// Loading spinner
<Button isLoading={isPending}>Submit</Button>

// Skeleton loading
{isLoading ? <Skeleton /> : <Content />}
```

### Icon Usage
- **Icon Library:** Lucide React (1.11.0)
- **Size:** 18-24px typical, 22px for most icons
- **Stroke Width:** strokeWidth={2.6} standard
- **Alignment:** Inline icons with text use aria-hidden="true"
- **Accessibility:** Always provide label text, don't rely on icon alone

```typescript
<Button>
  <ArrowRight aria-hidden="true" size={18} strokeWidth={2.6} />
  Next
</Button>
```

---

## 9. Naming Conventions

### File Naming Conventions
- **Components:** PascalCase (LoginForm.tsx, PropertyCard.tsx)
- **Pages:** Use directory structure (page.tsx inside directory)
- **Services:** camelCase with .service.ts suffix (propertiesService → properties.service.ts)
- **Repositories:** camelCase with .repository.ts suffix
- **Actions:** camelCase with .actions.ts suffix
- **Validators:** camelCase with .schema.ts suffix
- **Types:** camelCase with .types.ts suffix
- **Utilities:** camelCase with descriptive name (dateUtils.ts, phoneUtils.ts)
- **Styles:** CSS modules use [filename].module.css (rare in this project - using Tailwind)

### Component Naming Conventions
- **React Components:** PascalCase (MyComponent, LoginForm)
- **Client Components:** Start with "use client" directive at top
- **Compound Components:** Related components in same file
- **Props Interface:** ComponentNameProps (LoginFormProps)
- **Hooks:** camelCase with "use" prefix (useToast, useAuth)
- **Higher Order:** descriptive names (withAuth, withPagination)

### Hook Naming Conventions
- **Custom Hooks:** camelCase with "use" prefix (useToast, useAuth, useForm)
- **Hook Return:** Usually object with state, actions, and metadata
- **State Management:** useState inside hooks, expose simplified interface

### Variable/Function Naming Rules
- **Functions:** camelCase (createProperty, updatePayment)
- **Variables:** camelCase (propertyName, rentAmount)
- **Constants:** UPPER_SNAKE_CASE (MAX_FILE_SIZE, DEFAULT_PAGE_SIZE)
- **Boolean Variables:** Start with is/has/should (isLoading, hasError, shouldFetch)
- **Event Handlers:** on + Action (onClick, onChange, onSubmit)
- **Database/SQL:** snake_case (property_name, rent_amount, created_at)
- **Private Functions:** Prefix with underscore (_internalHelper)

### Database/Table Naming Rules
- **Tables:** snake_case, plural (properties, tenancies, payments)
- **Columns:** snake_case (property_name, rent_amount, created_at)
- **Foreign Keys:** entity_id pattern (tenant_id, property_id, unit_id)
- **Timestamps:** created_at, updated_at, deleted_at (soft delete)
- **Status Columns:** status (with enum type)
- **Boolean Columns:** is_ or has_ prefix (is_archived, has_agreement)
- **Amount Columns:** No prefix, assume in base currency (rent_amount, balance)

### API/Route Naming Rules
- **Routes:** kebab-case (properties, tenant-agreements, payment-links)
- **Route Groups:** Parentheses (auth), (landlord), (tenant)
- **Dynamic Routes:** [brackets] (properties/[propertyId], tenants/[tenantId])
- **Catchall Routes:** [...slug] for public URLs
- **API Methods:** Implicit GET, POST, PUT, DELETE via method
- **API Parameters:** camelCase in query (tenantId, rentAmount)
- **Database Parameters:** snake_case in DB layer

### Service/Repository Naming Rules
- **Queries:** get + Entity (getProperty, getPayments, getTenancy)
- **Mutations:** create/update/delete + Entity (createProperty, updateTenant, deleteUnit)
- **Service Methods:** Describe business action (initializePayment, generateReceipt, approveOnboarding)
- **Repository Methods:** Direct DB operation (createProperty, updateProperty)
- **Helper Functions:** Verb + Subject (formatCurrency, normalizePhone, calculateBalance)

### Enum/Type Naming Rules
- **Enums:** PascalCase, singular (Status, PaymentFrequency, RoleType)
- **Union Types:** Descriptive name (UserRole = "landlord" | "tenant")
- **Status Values:** lowercase with underscores (pending, in_progress, completed)
- **Enum Pattern:** Use as discriminated union when possible

```typescript
// Good
type Status = "active" | "inactive" | "archived";
const STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

// Types from enums
type StatusValue = typeof STATUSES[keyof typeof STATUSES];
```

### Action State Naming
- **State Types:** ActionState or specific like PropertyActionState
- **Initial States:** initialActionState or initialPropertyActionState
- **Result Object:** { ok: boolean; message: string; fieldErrors?: ... }
- **Field Errors:** Record<string, string[]> (array for multiple per field)

---

## 10. Data Models / Schemas

### Core Entities & Relationships

#### Profiles Table
```typescript
// All users (landlords, tenants, caretakers)
id: UUID (primary key, from auth.users)
role: "landlord" | "tenant" | "caretaker"
full_name: string
phone_number: string
email: string | null
created_at: timestamp
```

#### Properties Table
```typescript
id: UUID
landlord_id: UUID (foreign key → profiles)
property_name: string
address: string (full address)
state: string (Nigerian state)
lga: string (Local Government Area)
property_type: "residential" | "flat_complex" | "mixed_use"
country_code: string (e.g., "NG")
currency_code: string (e.g., "NGN")
created_at: timestamp
```

#### Units Table
```typescript
id: UUID
property_id: UUID (foreign key → properties)
landlord_id: UUID (foreign key → profiles)
unit_identifier: string (e.g., "Flat A", "Room 1")
building_name: string | null
unit_type: string (e.g., "flat", "room", "house")
description: string | null
created_at: timestamp
```

#### Tenants Table
```typescript
id: UUID
landlord_id: UUID (foreign key → profiles)
unit_id: UUID (foreign key → units) - current unit
full_name: string
phone_number: string
email: string | null
home_address: string | null
date_of_birth: date | null
occupation: string | null
employer: string | null
id_type: "nin" | "passport" | "drivers_license" | "voters_card" | null
id_number: string | null
onboarding_status: "shell" | "in_progress" | "submitted" | "approved" | "rejected" | "archived"
landlord_notes: string | null
created_at: timestamp
```

#### Tenancies Table (Rental Agreements)
```typescript
id: UUID
tenancy_reference: string (e.g., "TN-2024-001")
landlord_id: UUID (foreign key → profiles)
tenant_id: UUID (foreign key → tenants)
unit_id: UUID (foreign key → units)
rent_amount: decimal
payment_frequency: "monthly" | "quarterly" | "biannual" | "annual"
currency_code: string
start_date: date
end_date: date | null
move_out_date: date | null
renewal_notice_date: date | null
rent_due_day: int (day of month, 1-31)
rent_anchor_month: int | null (month anchor for non-monthly)
current_period_start: date | null
current_period_end: date | null
next_rent_charge_date: date | null
opening_balance: decimal (initial debt/credit)
opening_balance_note: string | null
status: "draft" | "active" | "expired" | "terminated" | "archived"
agreement_notes: string | null
archived_at: timestamp | null
created_at: timestamp
```

#### Rent Payments Table
```typescript
id: UUID
tenancy_id: UUID (foreign key → tenancies)
tenant_id: UUID (foreign key → tenants)
landlord_id: UUID (foreign key → profiles)
amount_paid: decimal
payment_method: "paystack_gateway" | "bank_transfer" | "cash" | "other"
payment_reference: string | null
payment_date: timestamp
period_start: date | null
period_end: date | null
notes: string | null
receipt_status: "pending" | "generated" | "failed" | "voided"
receipt_path: string | null
idempotency_key: UUID (prevents duplicates)
created_at: timestamp
posted_at: timestamp | null
voided_at: timestamp | null
```

#### Gateway Payments Table (Paystack Transactions)
```typescript
id: UUID
landlord_id: UUID
tenant_id: UUID
tenancy_id: UUID
reference: string (Paystack reference)
access_code: string
authorization_url: string
status: "pending" | "paid" | "failed" | "abandoned"
amount: decimal (in Naira)
currency_code: string
paid_amount: decimal | null
metadata: jsonb (tenant_id, landlord_id, expected_amount_naira, etc.)
expires_at: timestamp
webhook_status: "pending" | "processed" | "failed"
created_at: timestamp
```

#### Receipts Table
```typescript
id: UUID
payment_id: UUID (foreign key → rent_payments)
landlord_id: UUID
tenant_id: UUID
receipt_number: string (e.g., "RCP-2024-001")
amount: decimal
currency_code: string
generated_at: timestamp
sent_via_whatsapp: boolean
whatsapp_message_id: string | null
file_path: string
pdf_content: bytea | null
status: "pending" | "generated" | "sent" | "failed"
created_at: timestamp
```

#### Tenancy Agreements Table
```typescript
id: UUID
tenancy_id: UUID (foreign key → tenancies)
agreement_number: string
pdf_path: string
generated_at: timestamp
signed_date: date | null
created_at: timestamp
```

#### Tenant Activation Tokens Table
```typescript
id: UUID
tenant_id: UUID (foreign key → tenants)
token: string (secure, unique)
token_hash: string (SHA256 of token)
expires_at: timestamp
used_at: timestamp | null
created_at: timestamp
```

#### Quit Notices Table
```typescript
id: UUID
tenancy_id: UUID (foreign key → tenancies)
landlord_id: UUID
tenant_id: UUID
notice_type: string
pdf_path: string
effective_date: date
generated_at: timestamp
created_at: timestamp
```

#### Onboarding Data Table
```typescript
id: UUID
tenant_id: UUID (foreign key → tenants)
token_hash: string
step_completed: int (0-5 for multi-step form)
personal_details: jsonb | null
documents: jsonb | null
guarantor_details: jsonb | null
bank_details: jsonb | null
income_info: jsonb | null
submitted_at: timestamp | null
approved_at: timestamp | null
rejected_at: timestamp | null
rejection_reason: string | null
created_at: timestamp
```

#### Audit Logs Table
```typescript
id: UUID
landlord_id: UUID
actor_profile_id: UUID (who made the change)
actor_role: "landlord" | "tenant" | "caretaker" | "system"
event_type: string (enum value)
entity_type: string (enum value)
entity_id: UUID
description: string
metadata: jsonb (context-specific data)
property_id: UUID | null
tenant_id: UUID | null
tenancy_id: UUID | null
created_at: timestamp (indexed)
```

#### Ledger Table
```typescript
id: UUID
tenancy_id: UUID (foreign key → tenancies)
transaction_type: "rent_charge" | "payment" | "adjustment"
amount: decimal
period_start: date | null
period_end: date | null
created_at: timestamp
```

#### Caretakers Table
```typescript
id: UUID
landlord_id: UUID (foreign key → profiles)
profile_id: UUID (foreign key → profiles)
property_id: UUID (foreign key → properties) | null
status: "active" | "inactive"
permissions: jsonb (list of allowed actions)
created_at: timestamp
```

#### Notifications Table
```typescript
id: UUID
recipient_id: UUID (foreign key → profiles)
notification_type: string
title: string
message: string
delivery_channel: "whatsapp" | "sms" | "email"
delivery_status: "pending" | "sent" | "failed"
metadata: jsonb
created_at: timestamp
sent_at: timestamp | null
```

### Entity Relationships Diagram
```
Profiles (landlords, tenants, caretakers)
  ├── owns → Properties (landlord_id)
  ├── is → Tenants (profile_id, one-to-one)
  └── manages → Units (landlord_id)

Properties
  └── contains → Units (property_id)

Units
  └── has → Tenancies (unit_id)
      └── has → current Tenant (tenant_id)

Tenancies
  ├── has → Rent Payments (tenancy_id)
  ├── has → Gateway Payments (tenancy_id)
  ├── has → Tenancy Agreements (tenancy_id)
  ├── has → Ledger Entries (tenancy_id)
  └── has → Quit Notices (tenancy_id)

Rent Payments
  └── generates → Receipts (payment_id)

Tenants
  ├── has → Tenant Activation Tokens (tenant_id)
  ├── has → Onboarding Data (tenant_id)
  └── has → Guarantors (tenant_id)

Audit Logs
  └── track all changes to above entities
```

---

## 11. Important Constraints / Non-Negotiables

### Architecture Constraints
1. **Server-Side Business Logic Only:** All business logic MUST reside in Server Actions and Services, never in client components
2. **Zod Validation Required:** ALL external inputs (FormData, API params) MUST be validated with Zod schemas before processing
3. **Permission Checks Mandatory:** Every service function MUST call requireLandlord/requireTenant/requireCaretaker first
4. **Audit Logging Required:** Every state change MUST be logged to audit_logs table with full context
5. **Error Result Pattern:** All errors MUST be caught and converted to ActionResult using errorResult()
6. **Idempotency Keys:** Payment operations MUST use idempotency keys to prevent duplicates

### Database Constraints
1. **Supabase PostgreSQL:** Do NOT change to different database
2. **Row-Level Security (RLS):** RLS policies MUST protect tenant-level data
3. **Soft Deletes:** Use archived_at instead of hard deletes for audit trail preservation
4. **snake_case Columns:** All database column names MUST be snake_case
5. **Foreign Keys:** Foreign key relationships MUST be maintained with proper constraints
6. **Timestamps:** All tables MUST have created_at, and audit-critical tables need updated_at
7. **Idempotency Keys:** Payment tables MUST have idempotency_key columns with unique constraints

### Authentication Constraints
1. **Supabase Auth Only:** Do NOT change to different auth provider
2. **Role-Based Permissions:** User role determines access level (landlord, tenant, caretaker)
3. **Service Role Key:** Only use createSupabaseAdminClient in server-side operations (never expose)
4. **Phone Normalization:** All phone numbers MUST be normalized to E.164 format
5. **Session Validation:** Every protected endpoint MUST validate active session

### Business Logic Constraints
1. **Nigerian Context:** All date/currency operations assume Nigerian context (NGN currency, NG country)
2. **Payment Idempotency:** Same payment cannot be recorded twice (via idempotency keys)
3. **Audit Trail Immutability:** Audit logs cannot be modified or deleted (append-only)
4. **Status Transitions:** Entity status transitions MUST follow defined state machines
5. **Permission Hierarchy:** Caretakers have subset of landlord permissions, tenants have limited access
6. **Landlord Isolation:** Landlords can NEVER see other landlords' data

### UI/UX Constraints
1. **Tailwind Only:** Do NOT add CSS-in-JS or other styling libraries
2. **Plus Jakarta Font:** All text MUST use Plus Jakarta Sans (configured in layout)
3. **Theme Colors:** Color palette MUST match defined primary/gold/success/warning/danger colors
4. **Mobile First:** All layouts MUST be responsive, mobile-first approach
5. **Accessibility:** All form fields MUST have associated labels, all buttons must be tappable
6. **Whatsapp Integration:** Tenant communications MUST go via WhatsApp where possible

### Code Quality Constraints
1. **TypeScript Strict Mode:** tsconfig.json has strict: true, do NOT disable
2. **Server-Only Marker:** Import "server-only" in all server-side modules
3. **No Inline Styling:** All styles MUST use Tailwind classes, no inline style props
4. **ESLint Passing:** All code MUST pass eslint checks (next/core-web-vitals, typescript)
5. **Type Safety:** NEVER use any type, prefer inferred types from Zod
6. **Error Messages:** All error messages MUST be user-friendly, not technical

### Deployment Constraints
1. **Vercel Deployment:** Application targets Vercel platform (see vercel.json)
2. **Environment Variables:** Supabase and Paystack keys MUST be in environment
3. **No Secrets in Code:** Secret keys MUST never be in source code
4. **Build Success:** Project MUST build without errors (npm run build)

### Third-Party Constraints
1. **Paystack Integration:** Payment processing MUST go through Paystack with proper webhooks
2. **Inngest Jobs:** Background tasks MUST use Inngest, not polling or cron
3. **Resend Email:** Transactional emails MUST use Resend service
4. **Lucide Icons:** Icons MUST come from Lucide React, no other icon library

---

## 12. Known Technical Debt / Caveats

### Database/Schema Issues
1. **Empty migrations folder:** Database schema appears to be managed via Supabase CLI/dashboard, not migrations folder
   - *Implication:* Schema changes must be coordinated with Supabase
2. **Tenancy period calculations:** Complex date arithmetic in tenancy-period.ts may have edge cases with non-monthly frequencies
   - *Watch for:* Rent charge dates around month boundaries, leap years
3. **Ledger implementation:** Ledger table exists but reconciliation logic may be incomplete
   - *Caveat:* Balance calculations rely on aggregate queries, consider caching for performance

### Payment Processing
1. **Paystack webhook reliability:** Webhooks are not guaranteed delivery (network issues, timeouts)
   - *Mitigation:* Consider adding webhook retry logic and transaction verification polling
2. **Partial payment handling:** System may not fully support partial rent payments
   - *Feature gap:* Split payments across months not fully tested
3. **Currency conversions:** Multi-currency support framework exists but only NGN is tested
   - *Constraint:* Non-NGN currencies may have untested code paths
4. **App fee distribution:** Paystack splits may have rounding errors on fractional amounts
   - *Watch for:* Test with edge cases (amounts that don't divide evenly)

### File Storage & PDFs
1. **PDF Generation:** @react-pdf/renderer may have compatibility issues with server-side rendering
   - *Known issue:* Some advanced PDF features may not work on server
2. **Document Storage:** Files stored in Supabase Storage with plain file paths
   - *Caveat:* No encryption at rest, consider for sensitive documents
3. **File Upload Limits:** No explicit file size limits visible in validators
   - *Recommendation:* Add file size validation

### Tenant Onboarding
1. **Activation Link Security:** Tokens are SHA256 hashed but stored in database
   - *Caveat:* If database is compromised, tokens cannot be revoked without expiry
2. **KYC Data:** No encryption for sensitive personally identifiable information
   - *Security concern:* Addresses, phone numbers, ID numbers stored plaintext
3. **Multi-step Form State:** Form state lost if user leaves and returns
   - *UX caveat:* Tenant must restart onboarding if closes browser

### State Management
1. **No Offline Support:** Application requires active internet connection
   - *Constraint:* No service workers or offline queue implemented
2. **Form State:** useActionState requires page reload for visible updates
   - *UX:* Consider adding optimistic updates in future
3. **Real-time Updates:** No WebSockets or real-time subscriptions
   - *Caveat:* Users must refresh to see updates from other sessions

### Testing & Quality
1. **No Test Suite:** No unit tests, integration tests, or e2e tests visible
   - *Risk:* Refactoring may introduce regressions
2. **Type Coverage:** Some "unknown" and "passthrough" Zod types allow unvalidated fields
3. **Error Messages:** Some database errors may leak details in development
   - *Security:* Ensure error mapping in production

### Performance Concerns
1. **Large Data Sets:** No pagination visible on many list pages
   - *Risk:* Pages with 1000+ items may be slow
2. **N+1 Queries:** Some repositories may fetch related data inefficiently
   - *Optimization:* Audit select statements for unnecessary joins
3. **Cache Invalidation:** revalidatePath may be too broad, invalidating more than needed
   - *Performance:* Consider more granular cache invalidation

### Incomplete Features
1. **Caretaker Features:** Caretaker permissions framework exists but limited UI implementation
2. **Reports:** Report endpoints may exist but comprehensive reporting UI incomplete
3. **Compliance/KYC:** Compliance frameworks present but enforcement may be incomplete
4. **Mobile Optimization:** Layout responsive but not all pages mobile-optimized

### Browser/Environment
1. **Browser Support:** Tested on modern browsers; old browser support unknown
   - *Caveat:* IE11 likely not supported
2. **Node Version:** No explicit Node version pinned
   - *Recommendation:* Add .nvmrc with target version
3. **Environment Secrets:** .env.example may be out of sync with actual requirements

---

## 13. Pending Roadmap

### Phase 1: Core Feature Completion (Immediate)
1. **Caretaker Dashboard:** Implement full caretaker-specific UI and features
2. **Report Generation:** Complete reporting dashboard and export functionality
3. **Mobile Optimization:** Full mobile testing and responsive improvements
4. **Bug Fixes:** Address any critical issues from testing

### Phase 2: Advanced Features (Short-term)
1. **Property Rules Automation:** Implement property charges and automatic rent calculations
2. **Bulk Operations:** Bulk payment recording, bulk tenant creation
3. **Advanced Analytics:** Charts and trend analysis for rent collection
4. **Scheduled Notifications:** Automated payment reminders to tenants
5. **Document Templates:** Customizable agreement and notice templates

### Phase 3: Compliance & Trust (Medium-term)
1. **Enhanced KYC:** More rigorous identity verification
2. **Document Verification:** Digital signature support for agreements
3. **Tax Reporting:** Generate tax reports for landlords
4. **Data Encryption:** Encrypt sensitive PII at rest
5. **Compliance Dashboard:** Regulatory compliance tracking

### Phase 4: Ecosystem & Integrations (Long-term)
1. **Mobile App:** Native iOS/Android applications
2. **Accounting Integration:** QuickBooks, Xero integration
3. **Bank Integrations:** Direct bank feed for reconciliation
4. **Multi-Landlord Platform:** Marketplace for property management services
5. **Investor Portal:** Enable property investors to view holdings

### Feature Enhancements (Next Development Cycle)
1. **Offline Mode:** Service worker for offline access
2. **Email Templates:** Customizable email notifications
3. **Webhook Retry Logic:** Improve Paystack webhook reliability
4. **Tenant Self-Service:** Tenants can view own payment history, request receipts
5. **Advanced Filtering:** Save and reuse custom filters
6. **Data Export:** Export to CSV, Excel, JSON
7. **API Documentation:** Public API for integrations
8. **Activity Notifications:** Real-time notifications of important events

### Recommended Implementation Order
1. **Highest Priority:** Complete caretaker features, mobile optimization, report generation
2. **High Priority:** Property rules, bulk operations, scheduled notifications
3. **Medium Priority:** Advanced analytics, document templates, KYC enhancement
4. **Lower Priority:** Offline mode, integrations, ecosystem features

---

## 14. Continuation Instructions For Next AI

### What MUST Be Preserved

#### Architecture Patterns
- **Server Actions Pattern:** Client forms → FormData → Server Actions → Services → Repositories
  - Do NOT change to API routes or client-side state management
- **Service Layer Authorization:** Every service MUST start with requireLandlord/requireTenant
  - Do NOT skip permission checks for "trusted" operations
- **Zod Validation Pipeline:** All inputs validated before touching database
  - Do NOT bypass validation in any scenario
- **Audit Logging:** Every state change logged with full context
  - Do NOT skip logging for "small" operations

#### Code Structure
- Keep actions/services/repositories separation strict
- Maintain single responsibility per file
- Preserve Server Component by default approach
- Keep server-only utilities clearly marked with "server-only" imports
- Maintain error handling via errorResult() pattern

#### Database
- Preserve snake_case column naming
- Maintain audit_logs table as append-only history
- Keep soft deletes (archived_at) not hard deletes
- Preserve all existing foreign key relationships
- Do NOT change Supabase provider

#### Styling
- Maintain Tailwind-only CSS approach
- Preserve Plus Jakarta Sans as primary font
- Keep color palette and theme extensions
- Respect responsive design (mobile-first)
- Do NOT add CSS-in-JS libraries

### What MUST NOT Be Changed

1. **Supabase Provider:** Do NOT switch to different database
2. **Authentication Method:** Do NOT change from Supabase Auth
3. **Framework:** Do NOT upgrade Next.js major versions without testing
4. **Core Patterns:** Do NOT refactor to different architecture patterns
5. **Payment Provider:** Do NOT change from Paystack without planning
6. **Styling Library:** Do NOT add Chakra, MUI, or other component libraries
7. **State Management:** Do NOT add Redux, Zustand, or similar
8. **Language:** Do NOT introduce JavaScript or mix TypeScript/JS
9. **Permission Model:** Do NOT weaken landlord isolation constraints
10. **Audit Trail:** Do NOT modify or delete audit logs

### Coding Standards To Maintain

#### TypeScript
```typescript
// ✅ GOOD: Strict typing with inferred types
const parsed = createSchema.parse(input);
type Input = z.infer<typeof createSchema>;

// ❌ BAD: Loose typing
const parsed: any = JSON.parse(input);
const result: unknown = data;
```

#### Error Handling
```typescript
// ✅ GOOD: Structured error handling
try {
  const result = await service.doSomething(input);
  return successResult("Done", result);
} catch (error) {
  return errorResult(error);
}

// ❌ BAD: Unhandled errors
const result = await service.doSomething(input); // might throw
```

#### Permissions
```typescript
// ✅ GOOD: Check permissions first
export async function updateProperty(propertyId, input) {
  const landlord = await requireLandlord(); // Throws if unauthorized
  const property = await getProperty(propertyId);
  if (property.landlord_id !== landlord.id) throw new AppError(...);
  // ... rest of logic
}

// ❌ BAD: Permission check after fetching
export async function updateProperty(propertyId, input) {
  const property = await getProperty(propertyId);
  const landlord = await requireLandlord(); // Too late
  // ...
}
```

#### Validation
```typescript
// ✅ GOOD: Validate immediately
const schema = z.object({ name: z.string().min(1) });
const parsed = schema.parse(formData); // Throws ZodError with field-level errors

// ❌ BAD: Validate later or skip
const name = formData.get("name");
if (!name) throw new Error("Name required"); // Generic error
```

#### Audit Logging
```typescript
// ✅ GOOD: Log all changes
await writeAuditLog({
  landlordId: landlord.id,
  actorProfileId: landlord.id,
  eventType: AUDIT_EVENT_TYPES.propertyCreated,
  entityType: AUDIT_ENTITY_TYPES.property,
  entityId: property.id,
  description: `Property created: ${property.property_name}`,
  metadata: { property_name: property.property_name, ... },
});

// ❌ BAD: Skip logging
// ... property created but no audit log
```

### Refactoring Philosophy

#### What CAN Be Refactored
- Extract common patterns into utilities (DRY principle)
- Optimize N+1 queries with better select statements
- Split large components into smaller reusable pieces
- Improve error messages for better UX
- Add type safety where "unknown" is used
- Optimize page load performance (caching, compression)

#### What CANNOT Be Refactored
- Change from Server Actions to API routes
- Remove type checking or weaken TypeScript
- Skip permission checks for "trusted" operations
- Remove audit logging
- Change database or authentication provider
- Add external state management library
- Change styling approach

### Debugging Approach

**When things break:**
1. Check audit logs for what changed and when
2. Verify permission checks in service layer
3. Check Zod schema validation (review fieldErrors)
4. Trace AppError codes through error-map.ts
5. Review error message for clues (not generic "Something went wrong")
6. Check database foreign key relationships
7. Verify environment variables are set (Supabase, Paystack keys)

**Common issues and solutions:**
- **403 Forbidden:** Missing requireLandlord() check
- **ZodError:** Input doesn't match schema, check fieldErrors
- **Payment failed:** Check Paystack webhook processing and metadata
- **Data not updating:** Check revalidatePath() coverage
- **Audit log missing:** Add writeAuditLog() call
- **File upload failing:** Check storage path and bucket permissions

### Testing Approach (Even Without Test Suite)
1. Create tenant → Create property → Create unit → Create tenancy → Record payment → Verify receipt
2. Test multi-step workflows end-to-end
3. Verify audit logs capture all changes
4. Test permission boundaries (try accessing other landlord's data)
5. Test error paths (invalid inputs, missing data, conflicts)
6. Test edge cases (rent due at month boundaries, leap years, etc.)
7. Load test with large datasets (100+ properties, 1000+ payments)

### Performance Optimization Rules
1. Use select statements with specific columns (not SELECT *)
2. Index frequently filtered columns (landlord_id, status, created_at)
3. Batch related queries (avoid N+1)
4. Cache expensive calculations (rent charges, balance summaries)
5. Paginate large result sets
6. Use revalidateTag for granular cache invalidation
7. Minimize bundle size (analyze next build output)

### Before Committing Code
- [ ] TypeScript compiles (npm run build)
- [ ] ESLint passes (npm run lint)
- [ ] Audit logs are added for state changes
- [ ] Permission checks in place (requireLandlord/requireTenant)
- [ ] Zod validation for external inputs
- [ ] Error handling via errorResult()
- [ ] Mobile responsive (test on mobile viewport)
- [ ] Accessibility basics (form labels, button focus states)
- [ ] Database relationships preserved
- [ ] No console.errors in production code
- [ ] Environment variables documented

### Adding New Features: Checklist
1. [ ] Define database schema/migrations (if needed)
2. [ ] Create Zod validators for inputs
3. [ ] Create repository functions for data access
4. [ ] Create service functions with permission checks and audit logs
5. [ ] Create Server Actions to orchestrate
6. [ ] Create React components for UI
7. [ ] Add routes and navigation
8. [ ] Test permission boundaries
9. [ ] Test error paths
10. [ ] Update this handoff if patterns change

### Documentation To Update
- This handoff specification (if architecture changes)
- Component JSDoc comments (for reusable components)
- Service function comments (for complex business logic)
- README.md (if setup changes)
- .env.example (if new env vars needed)

---

## Summary

**Tenuro** is a property management platform for Nigerian landlords built with Next.js, Supabase, and Tailwind CSS. The architecture emphasizes:
- **Server-side business logic** via Server Actions and Services
- **Type-safe validation** with Zod schemas
- **Permission-first design** with role-based access control
- **Complete audit trails** for all state changes
- **Professional UX** focused on trust and clarity
- **Nigerian context** with proper localization

The codebase is well-structured with clear separation between actions, services, and repositories. Future development should preserve these patterns while adding new features in the same style.

**Key principle for continuation:** When in doubt, copy the pattern from an existing similar feature rather than inventing new approaches.
