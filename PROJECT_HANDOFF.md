# PROJECT HANDOFF SPECIFICATION

## 1. Project Overview

**Project Name:** Tenuro

**Core Purpose:** A comprehensive property and rent management platform designed specifically for Nigerian landlords to manage properties, tenants, track rent payments, generate professional receipts, maintain rental agreements, and streamline the entire rental lifecycle.

**Target Users:**
- Nigerian landlords with single or multiple properties  
- Property managers acting as caretakers
- Tenants activated via the platform 
- Payment processors (Paystack integration)

**Business/Domain Context:**
- Solves disorganized rental record-keeping in Nigeria's informal property sector
- Addresses widespread issue of notebooks/WhatsApp for rent tracking
- Enables professional, legally-valid rental agreements
- Integrates with Paystack for secure payment processing
- Supports multiple payment methods: bank transfers, cash, online via Paystack
- Generates and distributes professional receipts via WhatsApp
- Maintains complete audit trails for compliance and dispute resolution

**Product Philosophy:**
- **Trust & Clarity:** "Property records made simple"
- **Nigerian-First Design:** Phone numbers, states/LGAs, NGN currency, WhatsApp integration
- **Simplicity Over Complexity:** Core features only - properties, units, tenants, payments, agreements, receipts
- **Mobile-Responsive:** Mobile-first with sticky desktop navigation
- **Action-Oriented UI:** Clear primary actions throughout
- **Progressive Disclosure:** Features introduced through onboarding
- **Professional Appearance:** Consistent design system
- **Transparency & Control:** Full visibility of all transactions and communications

---

## 2. Tech Stack

**Frontend:**
- Next.js 16.2.4 (App Router) | TypeScript 5 | React 19.2.4
- Tailwind CSS 4 | Custom components (no external UI library)
- Lucide React 1.11.0 for icons
- @react-pdf/renderer 4.5.1 for PDF generation

**Backend:**
- Node.js | Next.js Server Actions | Supabase PostgreSQL
- Supabase Auth (password + phone/email) | Resend 6.12.2 (email)
- Zod 4.3.6 (validation) | Custom AppError class

**Integrations:**
- Paystack (payment gateway) | WhatsApp (via Paystack) | Resend (email)
- Supabase Storage (documents/PDFs) | Inngest 4.2.4 (background jobs - configured)

**Deployment:**
- Vercel (hosting) | Supabase (managed PostgreSQL)

---

## 3. Architecture Overview

**Layered Server-Centric Architecture:**
```
Client (React) → Server Actions → Services → Repositories → Supabase DB
```

**Data Flow:**
- **Read:** Server Component → Service → Repository → Supabase → Render
- **Write:** Form → Server Action → Validate (Zod) → Service → Repository → Supabase → Result Toast
- **Auth:** Supabase Auth → Session Cookie → requireUser/requireLandlord/requireTenant

**Key Principles:**
- All business logic on server (Server Actions, API routes)
- Client handles UI only
- No direct Supabase access from client
- Form state via useActionState hook
- Cache invalidation via revalidatePath()
- Validation always server-side

---

## 4. Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Public auth routes
│   ├── (landlord)/                   # Protected landlord routes
│   ├── (tenant)/                     # Protected tenant routes  
│   ├── api/                          # API routes
│   │   ├── webhooks/paystack/
│   │   ├── inngest/
│   │   ├── files/
│   │   ├── onboarding/
│   │   └── cron/
│   └── t/                            # Public tenant routes (no auth)
│
├── actions/                          # Server Actions
│   ├── *.actions.ts                  # Action functions
│   └── *.state.ts                    # Initial action states
│
├── components/                       # React components
│   ├── auth/                         # Auth components
│   ├── layout/                       # Layout components (sidebar, topbar)
│   ├── payment/                      # Payment UI components
│   ├── property/                     # Property management components
│   ├── tenancy/                      # Tenancy components
│   ├── tenant/                       # Tenant dashboard components
│   └── ui/                           # Base UI components
│
├── lib/                              # Utilities
│   ├── cn.ts                         # classNameMerge helper
│   ├── navigation.ts                 # Navigation config
│   ├── tenancy-period.ts             # Date calculations
│   └── status-copy.ts                # Status labels
│
└── server/                           # Server-only code
    ├── constants/                    # Constants
    │   ├── audit-events.ts
    │   ├── notification-types.ts
    │   ├── permissions.ts
    │   ├── routes.ts
    │   ├── session.ts
    │   └── storage-paths.ts
    │
    ├── errors/                       # Error handling
    │   ├── app-error.ts
    │   ├── result.ts
    │   └── error-map.ts
    │
    ├── repositories/                 # Data access
    │   ├── profiles.repository.ts
    │   ├── properties.repository.ts
    │   ├── payments.repository.ts
    │   ├── receipts.repository.ts
    │   ├── tenancy-agreements.repository.ts
    │   └── [...25 more files]
    │
    ├── services/                     # Business logic
    │   ├── auth.service.ts
    │   ├── properties.service.ts
    │   ├── payments.service.ts
    │   ├── receipts.service.ts
    │   ├── tenancy-agreements.service.ts
    │   ├── gateway-payment.service.ts
    │   ├── gateway-payment-webhook.service.ts
    │   ├── paystack.service.ts
    │   ├── onboarding.service.ts
    │   ├── tenant-dashboard.service.ts
    │   ├── audit-log.service.ts
    │   └── [...20+ more files]
    │
    ├── jobs/                         # Background jobs (Inngest)
    │   ├── inngest.client.ts
    │   ├── payment.jobs.ts
    │   ├── notification.jobs.ts
    │   └── renewal.jobs.ts
    │
    ├── supabase/
    │   ├── admin.ts                  # Admin client (service role)
    │   └── server.ts                 # Server client (user session)
    │
    ├── types/                        # TypeScript types
    │   ├── auth.types.ts
    │   ├── payment.types.ts
    │   ├── paystack.types.ts
    │   └── [...5+ more]
    │
    ├── validators/                   # Zod schemas
    │   ├── common.schema.ts
    │   ├── auth.schema.ts
    │   ├── property.schema.ts
    │   ├── payment.schema.ts
    │   ├── tenancy.schema.ts
    │   ├── tenant.schema.ts
    │   └── [...10+ more]
    │
    └── utils/                        # Server utilities
        ├── phone.ts
        ├── money.ts
        ├── dates.ts
        ├── crypto.ts
        ├── tokens.ts
        └── encryption.ts
```

---

## 5. Implemented Features

### Complete & Production-Ready

**Authentication & User Management**
- Phone + password authentication
- Email + password authentication (configured)
- Role-based user creation (landlord, tenant, caretaker)
- Session management with Supabase Auth

**Property Management**
- Create/update/archive properties
- Nigerian state/LGA selection
- Multiple property types (residential, mixed-use, flat complex)
- Unit creation and occupancy tracking

**Tenant Management**
- Tenant creation with contact info
- Approval/rejection workflow
- KYC data storage
- Status tracking (pending, approved, active, inactive)

**Tenancy Management**
- Create rental agreements with payment terms
- Support for annual/biannual/quarterly/monthly frequencies
- Auto-calculated tenancy periods
- Opening balance for arrears
- Renewal notice dates

**Tenancy Agreements**
- Template-based document generation
- Draft saving and editing
- Finalization workflow
- Tenant acceptance via secure tokens
- WhatsApp delivery of acceptance links
- PDF generation and storage
- Digital signatures via token acceptance

**Payment Processing**
- Manual rent recording (bank transfer, cash, other)
- Paystack gateway integration
- Payment verification workflow
- Opening balance management
- Payment ledger tracking
- Idempotency key support

**Receipt Management**
- Automatic generation after posting
- Professional PDF formatting
- Receipt number generation
- Secure download URLs
- WhatsApp delivery
- Receipt history tracking

**Audit Logging**
- Comprehensive audit trail
- Actor (landlord/tenant/system) tracking
- Event type documentation
- IP address and user agent capture
- Immutable records

**Notifications**
- WhatsApp message delivery (Paystack)
- Email via Resend
- Payment link delivery
- Agreement acceptance links
- Onboarding invitations
- Receipt delivery

**Tenant Dashboard (Public)**
- View rental agreement
- View agreement PDF
- View rent balance
- View payment history
- Download receipts
- Track payment status

**Onboarding System**
- Tenant invitation links
- Profile completion workflow
- KYC data collection
- Guarantor information
- 72-hour link expiration
- Completion tracking

**Tenant Account Activation**
- Self-registration
- Phone verification
- Password setup
- Account status tracking

**Overview Dashboard**
- At-a-glance statistics
- Vacant units tracking
- Outstanding balance
- First-time setup guidance

---

## 6. Partial/In-Progress Features

**Renewals Management** - Service empty, not fully implemented
**Reports & Analytics** - Basic stats only, no advanced filtering/export
**Background Jobs (Inngest)** - Configured but not actively triggered
**Caretaker Features** - Minimal implementation, permission scoping incomplete

---

## 7. Core Reusable Patterns

### Form Submission Pattern
```typescript
"use client";
const [state, formAction, isPending] = useActionState(featureAction, initialState);
return (
  <form action={formAction}>
    <Input error={state.fieldErrors?.field?.[0]} />
    <Button isLoading={isPending}>Submit</Button>
  </form>
);
```

### Server Action Pattern
```typescript
export async function featureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = featureSchema.parse(Object.fromEntries(formData));
    const landlord = await requireLandlord();
    const result = await featureService.processInput(input);
    revalidatePath("/relevant/path");
    return { ok: true, message: "Success" };
  } catch (error) {
    return { ok: false, message: "Error occurred", fieldErrors: getFieldErrors(error) };
  }
}
```

### Service Layer Pattern
```typescript
export async function performAction(input: ValidatedInput) {
  const user = await requireLandlord();
  const supabase = await createSupabaseServerClient();
  
  const entity = await repository.get(supabase, input.id);
  if (entity.landlord_id !== user.id) throw new AppError("FORBIDDEN", "Unauthorized", 403);
  
  const result = await repository.update(supabase, input);
  
  await writeAuditLog({
    landlordId: user.id,
    eventType: AUDIT_EVENT_TYPES.entityUpdated,
    entityType: AUDIT_ENTITY_TYPES.entity,
    entityId: result.id,
    metadata: { /* details */ }
  });
  
  return result;
}
```

### Authorization Pattern
```typescript
const landlord = await requireLandlord();  // Enforce role
if (entity.landlord_id !== landlord.id) { // Check ownership
  throw new AppError("FORBIDDEN", "Not authorized", 403);
}
```

### Payment Processing Pattern
- Form submission → Payment intent creation → Paystack redirect/link
- Webhook verification → Payment status update → Receipt generation
- Idempotency key prevents duplicate processing

### PDF Generation Pattern
- React component rendered to PDF buffer
- Stored in Supabase Storage
- Signed download URL (24h expiry)
- Shared via WhatsApp

### Notification Pattern
- Create notification record
- Send via Paystack (WhatsApp) or Resend (email)
- Track status (pending/sent/failed)
- Retry on failure

---

## 8. Styling / Design System Rules

### Color System
- **Primary:** #1B4FD8 (blue) - buttons, active states
- **Primary Hover:** #153FB0 | **Soft:** #EAF0FF
- **Gold:** #F6B73C (accent) | **Deep:** #D97706 | **Soft:** #FFF4D8
- **Success:** #16A34A (green) | **Soft:** #EAF7EE
- **Danger:** #DC2626 (red) | **Soft:** #FDECEC  
- **Warning:** #D97706 (orange) | **Soft:** #FFF3DF
- **Text Strong:** #111827 | **Normal:** #374151 | **Muted:** #6B7280
- **Background:** #F8F7F4 | **Surface:** #FFFFFF | **Border:** #E7E5DF

### Typography
- **Font:** Plus Jakarta Sans (Google Font)
- **H1:** 32px, font-extrabold | **H2:** 24px, font-bold
- **H3:** 18px, font-bold | **Body:** 16px, normal
- **Line Height:** Headings 1.2, Body 1.6

### Spacing (Tailwind 4px scale)
- Card padding: 1.25rem (20px) mobile, 1.5rem (24px) desktop
- Form gaps: 1rem (16px)
- Section gaps: 1.5rem (24px) mobile, 2rem (32px) desktop
- Button/input height: min-h-11 (44px) to min-h-12 (48px)

### Layout
- Max-width container: 1280px (xl)
- Responsive grid: 1 col mobile → 2-5 cols desktop
- Sidebar width: 288px (fixed on lg+, hidden on mobile)
- Gap between items: 1.25rem (20px)

### Components
- **Button:** PrimaryBlue, Secondary, Danger, Ghost variants | sm/md/lg sizes
- **Input:** 48px height, blue focus, error state support
- **Card:** 1rem border-radius, shadow, white background
- **Status Pill:** Colored bg, rounded, 12px font

### Responsive
- Breakpoints: sm 640px, md 768px, lg 1024px, xl 1280px
- Mobile-first approach
- Touch targets min 44px x 44px
- 8px spacing between interactive elements

---

## 9. Naming Conventions

**Files:**
- Components: `PropertyForm.tsx` (PascalCase)
- Actions: `properties.actions.ts` (kebab-case, plural)
- Services: `properties.service.ts` (kebab-case, plural)
- Repositories: `properties.repository.ts` (kebab-case, plural)
- Validators: `property.schema.ts` (kebab-case, singular)
- Types: `auth.types.ts` (kebab-case, singular)

**Code:**
- Components: PascalCase (`LoginForm`, `PropertyCard`)
- Variables: camelCase (`propertyId`, `isLoading`)
- Constants: UPPER_SNAKE_CASE (`AUDIT_EVENT_TYPES`)
- Booleans: prefix with `is/has/should` (`isActive`, `hasError`)
- Functions: camelCase verb-first (`createProperty`, `updatePayment`)

**Database:**
- Tables: snake_case plural (`properties`, `rent_payments`)
- Columns: snake_case (`full_name`, `phone_number`)
- ForeignKeys: `{table_singular}_id` (`property_id`, `tenant_id`)
- Timestamps: `created_at`, `updated_at` (ISO 8601)

---

## 10. Data Models / Schemas

**Core Entities:**

**Profiles (Users)** → id (UUID), role, full_name, phone_number, email, created_at

**Properties** → id, landlord_id (FK), property_name, address, state, lga, property_type, is_archived

**Units** → id, property_id (FK), unit_identifier, unit_type, is_occupied

**Tenants** → id, landlord_id (FK), unit_id (FK), full_name, phone_number, email, status, kyc_data

**Tenancies** → id, landlord_id (FK), tenant_id (FK), unit_id (FK), start_date, end_date, payment_frequency, rent_amount, opening_balance, status

**Tenancy Agreements** → id, tenancy_id (FK), agreement_body, status, acceptance_token_hash, pdf_path, tenant_snapshot, property_snapshot

**Payments** → id, tenancy_id (FK), landlord_id (FK), tenant_id (FK), amount_paid, payment_method, status, balance_after, period_start, period_end

**Receipts** → id, payment_id (FK), receipt_number, pdf_path, status

**Gateway Payment Intents** → id, reference, payment_id (FK), landlord_id (FK), tenant_id (FK), tenancy_id (FK), amount_kobo, status, metadata

**Audit Logs** → id, landlord_id (FK), tenant_id (FK), tenancy_id (FK), actor_profile_id (FK), actor_role, event_type, entity_type, entity_id, description, metadata, created_at

**Notifications** → id, landlord_id (FK), tenant_id (FK), notification_type, channel, status, payload

**Relationships:**
- Profile → has many Properties, Tenants, Tenancies, Payments, Audit Logs
- Property → has many Units → has many Tenancies → has many Payments
- Tenant → has Tenancy (current) → has many Payments
- Payment → has Receipt, Gateway Payment Intent

---

## 11. Important Constraints / Non-Negotiables

1. **Server-First Architecture** - All business logic on server, no client-side secrets
2. **Validation Always Server-Side** - Zod validation before service layer, field errors mapped back
3. **Role-Based Access Control** - requireLandlord(), requireTenant(), ownership checks, audit everything
4. **Audit Logging Mandatory** - Every meaningful change logged with actor, action, context, metadata
5. **Next.js App Router** - Use redirect() and revalidatePath(), no custom routing
6. **Server Actions for Forms** - No fetch() calls, use useActionState hook
7. **Database is Source of Truth** - No client caching layer, revalidatePath() for invalidation
8. **Nigerian Context First-Class** - Always include country/state/LGA, Nigerian phone/currency/WhatsApp
9. **Security Practices** - No logging of secrets, hash tokens, 32+ byte randomness, HTTPS, env vars
10. **Error Handling Consistency** - AppError with code/message/status, user-friendly messages

---

## 12. Known Technical Debt / Caveats

**Empty Implementations:**
- renewals.service.ts (empty file)
- receipt.jobs.ts (empty file)

**Not Fully Implemented:**
- Inngest background jobs (configured, not triggered)
- Caretaker features (minimal, incomplete permission scoping)
- Reports & Analytics (basic stats only, no export)

**Workarounds:**
- No transactions in repositories (idempotency key pattern used instead)
- Limited real-time features (no active subscriptions)
- Phone validation Nigeria-only (no libphonenumber)
- Currency NGN only (no multi-currency)
- No offline support

**Should Refactor:**
- Error handling centralization
- Validation schema deduplication
- Split oversized services
- Standardize repository queries
- Extract spacing constants

---

## 13. Pending Roadmap

**Phase 1: Complete Core (Weeks 1-2)**
- Implement renewals service
- Complete reports & analytics
- Activate Inngest jobs
- Add payment reminders

**Phase 2: Enhanced Payments (Weeks 3-4)**
- Add Stripe gateway
- Payment plans/installments
- Reconciliation reports
- Refund workflow

**Phase 3: Caretakers (Weeks 5-6)**
- Complete caretaker role
- Caretaker dashboards
- Activity logging

**Phase 4: Tenant App (Weeks 7-8)**
- Mobile app (React Native)
- Push notifications
- Export functionality

**Phase 5: Advanced Features (Weeks 9-10)**
- Multi-language
- Dark mode
- Maintenance requests
- Utility tracking

**Phase 6: Compliance (Weeks 11-12)**
- PostgreSQL RLS policies
- 2FA support
- GDPR data export
- Compliance reports

**Phase 7: Scale (Week 13+)**
- Database optimization
- Redis caching
- CDN
- Elasticsearch/Meilisearch

---

## 14. Continuation Instructions For Next AI

### Critical Rules

1. **Maintain Patterns** - New features follow established patterns, no exceptions
2. **Server-First** - Business logic on server, UI on client only
3. **Audit Everything** - Every important state change logged
4. **Validate Everything** - Zod schema, validation before service, field errors mapped
5. **Check Authorization** - requireLandlord, ownership checks, AppError on forbidden
6. **Nigerian Context** - State/LGA, phone format, NGN currency, WhatsApp
7. **Test Before Commit** - Happy path, errors, validation, authorization, audit logs
8. **Use App Router** - redirect() and revalidatePath() only

### Code Quality

- TypeScript strict mode, no any types
- Functional components only, all props typed
- Tailwind classes only, no inline styles
- Single responsibility functions (50-line max)
- Clear error handling, no console.log
- Database queries optimized

### Before Committing

- TypeScript clean
- No commented code
- Tests pass
- Naming conventions followed
- Database optimized
- Error handling comprehensive
- Audit logs included
- Mobile responsive
- Accessibility checked

### Adding New Features

1. Understand requirement fully
2. Create database schema
3. Create Zod validators
4. Create repository functions
5. Create service functions
6. Create Server Action(s)
7. Create component(s)
8. Create page/route
9. Add audit logging
10. Error handling
11. Manual testing (all cases)
12. Mobile responsive check
13. Code quality review
14. Commit with clear message

### Refactoring Philosophy

**When:** Services > 300 lines, 3+ repeated patterns, unclear names, complex logic, performance issues

**How:** Extract to utility, create service method, simplify composition, move logic to service

**Never:** During bug fixes, without tests, core auth, without understanding impact

### Common Pitfalls

❌ DON'T: Mix logic in components, skip validation, hardcode values, large components, forget revalidatePath, use client state instead of server

✅ DO: Keep components dumb, write validation first, use constants, break into pieces, revalidatePath, server state

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
RESEND_API_KEY=
INNGEST_API_KEY=
NEXT_PUBLIC_APP_URL=
TENURO_GATEWAY_ADMIN_FEE_NAIRA=50
```

### Key Files to Understand First

1. `src/server/services/auth.service.ts` - User context
2. `src/actions/properties.actions.ts` - Server Action pattern
3. `src/server/repositories/profiles.repository.ts` - Repository pattern
4. `src/server/validators/property.schema.ts` - Validation
5. `src/components/property/property-form.tsx` - Form component
6. `src/server/errors/result.ts` - Error handling
7. `src/server/services/audit-log.service.ts` - Audit logging
8. `tailwind.config.ts` - Design system

---

## APPENDIX A: User Operational Flows & Journey Maps

### User Roles & Their Complete Journeys

#### **ROLE 1: Landlord** (Primary User)

**Initial Setup Journey:**
1. **Registration** → Phone/email + password → Profile creation → Redirect to /overview
2. **First-Time Onboarding** (on /overview if no properties)
   - See guided welcome card: "Start by adding your first property"
   - Click "Add First Property"
   - Enter property details (name, address, state, LGA, type)
   - Property created → Redirect to property detail page
3. **Add First Unit**
   - On property page, click "Add Unit"
   - Enter unit identifier (e.g., "Room 1", "Flat 2A")
   - Unit created and linked to property
4. **Add First Tenant**
   - Click "Add Tenant" from /tenants page or property page
   - Fill tenant form: name, phone, email, landlord notes
   - Tenant created in "pending" status → Can manage KYC from property page
5. **Create Rental Agreement**
   - From property page, select tenant + unit
   - Click "Create Agreement"
   - Enter agreement details: rent amount, payment frequency, start date
   - Agreement generated from template
   - Can edit/finalize agreement
   - Generate acceptance link for tenant
6. **Send Agreement to Tenant**
   - Click "Send to Tenant" on agreement
   - System generates secure token + hashed link
   - WhatsApp link sent to tenant phone
   - Landlord can resend or refresh link if needed
7. **Record First Payment**
   - When tenant pays rent, click "Record Payment"
   - Select payment method (bank transfer, cash, online)
   - Enter amount, date, reference
   - Payment recorded in "pending" status
   - After verification, status changes to "posted"
8. **Generate & Send Receipt**
   - After payment posted, click "Generate Receipt"
   - PDF receipt created and stored
   - WhatsApp link sent to tenant with receipt
   - Tenant can download from their dashboard

**Ongoing Operations:**
```
Daily/Weekly:
└─ Check /overview for outstanding balances
   └─ View tenants with overdue rent
   └─ Send payment reminders

Monthly:
└─ Go to /payments
   └─ Record all rent payments for period
   └─ Generate receipts for all payments
   └─ Review payment history

Quarterly:
└─ Check /renewals for upcoming renewals
   └─ Initiate renewal process 30 days before end date
   └─ Update terms if needed
   └─ Generate new agreement

As-Needed:
└─ /properties → Manage units, tenants
└─ /tenants → Update tenant info, approve/reject tenants
└─ /settings → Update bank account for payouts
└─ /reports → View payment collection reports
```

**Property Lifecycle:**
1. Create property (name, address, state, LGA, type)
2. Add units to property
3. Add tenants to units
4. Create tenancies (rental agreements)
5. Record rent payments
6. Generate receipts
7. Renew tenancies when period ends
8. Archive property when ready (soft delete)

**Payment Processing Flow:**
1. **Manual Payment:**
   - /payments → "Record Payment" button
   - Select tenancy, enter amount, method, date
   - Submit form (Server Action validates)
   - Payment created in "pending" status
   - Landlord confirms payment → status → "posted"
   - Receipt auto-generates
   - WhatsApp sent to tenant

2. **Online Payment (Paystack):**
   - /payments → Click "Send Payment Link"
   - System creates Paystack payment intent
   - Tenant receives WhatsApp with payment link
   - Tenant clicks link → /t/pay/{reference}
   - Tenant sees payment form (amount, property, unit)
   - Tenant redirected to Paystack
   - Tenant completes payment
   - Paystack webhook fires → payment verified
   - Payment status → "posted"
   - Receipt auto-generated
   - Tenant receives WhatsApp with receipt

**Agreement Workflow:**
1. Landlord creates agreement from tenancy
2. System generates from template with dynamic data
3. Landlord can edit agreement body
4. Landlord finalizes agreement
5. System generates secure acceptance token
6. Landlord sends to tenant via WhatsApp
7. Tenant clicks link → /t/agreement/{token}
8. Tenant views agreement, clicks "Accept"
9. Agreement marked as "accepted"
10. Landlord gets notification
11. Audit log created with tenant IP, timestamp

**Caretaker Delegation (Partial):**
1. Landlord goes to /caretakers
2. Click "Add Caretaker"
3. Enter caretaker phone + name
4. Assign to specific properties
5. Caretaker receives onboarding link
6. Caretaker can view assigned properties only
7. Caretaker cannot create new properties

---

#### **ROLE 2: Tenant** (Secondary User)

**Account Activation Journey:**
1. **Landlord Invites Tenant**
   - Landlord creates tenant record in system
   - Landlord clicks "Send Onboarding Link"
   - System generates secure token (72-hour expiry)
   - WhatsApp sent: "Complete your tenant profile for {property/unit}"
2. **Tenant Completes Profile**
   - Tenant clicks WhatsApp link → /t/onboarding/{token}
   - Form appears: full name, phone, email, date of birth, address, occupation, employer
   - KYC data collected
   - Optional: Guarantor information
   - Tenant submits
   - Audit log created (IP, timestamp, data)
   - Profile marked "kyc_submitted"
3. **Landlord Approves Tenant**
   - Landlord sees pending tenant in /tenants
   - Can view submitted KYC data
   - Click "Approve" or "Reject"
   - If approved: tenant status → "approved"
   - If rejected: tenant status → "rejected" + reason shown

**After Approval - Account Activation:**
1. Tenant status must be "approved" to activate account
2. Landlord creates tenancy (rental agreement)
3. System sends agreement acceptance link to tenant
4. Tenant clicks link → /t/agreement/{token}
5. Tenant views agreement, clicks "Accept"
6. Tenant account → "active"
7. Tenant can now access /tenant dashboard

**Tenant Dashboard Operations:**
```
/tenant (Private - requires active tenancy)
├─ View current rental agreement
│  └─ Download agreement PDF
├─ View rent balance
│  └─ Shows opening balance + all posted payments = current outstanding
├─ View payment history
│  └─ Date, amount, method, status
│  └─ Download receipt for each payment
├─ View property & unit details
│  └─ Property name, address
│  └─ Unit identifier
└─ Download receipts
   └─ Secure signed URL (24h expiry)
   └─ Via download button or WhatsApp link
```

**Payment as Tenant:**
1. **Online Payment:**
   - Landlord sends payment link via WhatsApp
   - Tenant clicks → /t/pay/{reference}
   - Sees: Property, Unit, Rent Amount, Balance
   - Clicks "Pay Now"
   - Redirected to Paystack gateway
   - Completes payment
   - Redirected to success page
   - Receives WhatsApp with receipt
   - Can download receipt from /tenant dashboard

2. **Manual Payment:**
   - Tenant transfers via bank or pays cash
   - Tenant provides proof to landlord
   - Landlord records in system: amount, method, date, reference
   - Tenant receives WhatsApp with receipt

**Agreement Acceptance:**
1. Landlord creates & finalizes agreement
2. Landlord sends acceptance link via WhatsApp
3. Tenant clicks → /t/agreement/{token}
4. Agreement content displayed (readonly)
5. "I Agree" button at bottom
6. Tenant clicks → agreement accepted
7. IP address, timestamp recorded
8. Audit log created
9. Landlord notified
10. Tenant sees "Agreement Accepted" on dashboard

---

#### **ROLE 3: Caretaker** (Property Manager)

**Setup Journey:**
1. Landlord goes to /caretakers
2. Clicks "Add Caretaker"
3. Enters caretaker phone + name
4. Selects which properties caretaker manages
5. Caretaker onboarding link sent
6. Caretaker completes profile
7. Account activated

**Caretaker Dashboard (Partial Implementation):**
- View assigned properties only
- View units and current tenants in those properties
- Cannot create new properties or tenants
- Cannot access landlord settings
- View-only access to payments (limited)

---

### Key Operational Workflows

#### **Workflow 1: Complete Rent Collection Process (Start to Finish)**

```
MONTH 1 - January 1st (Rent Due)
│
├─ 1. Landlord checks /overview
│  └─ Sees "Outstanding Rent Balance" stat
│  └─ Finds tenant "John Doe" owes ₦500,000
│
├─ 2. Landlord sends payment link
│  └─ Goes to /payments
│  └─ Clicks "Send Payment Link"
│  └─ Selects John's tenancy
│  └─ System creates Paystack payment intent
│  └─ Sends WhatsApp: "Your rent payment link: https://app.tenuro.com/t/pay/{ref}"
│
├─ 3. Tenant receives link
│  └─ Clicks /t/pay/{reference}
│  └─ Sees: Property "Lekki Apartment", Unit "Flat 2A", Amount "₦500,000"
│  └─ Clicks "Continue to Payment"
│
├─ 4. Tenant pays on Paystack
│  └─ Redirected to Paystack.co
│  └─ Enters card/bank details
│  └─ Payment processed by Paystack
│  └─ Success page shown
│
├─ 5. Webhook received
│  └─ /api/webhooks/paystack receives confirmation
│  └─ Verifies Paystack signature
│  └─ Updates payment status → "posted"
│  └─ Creates receipt PDF
│  └─ Stores in Supabase Storage
│
├─ 6. Audit log created
│  └─ Records: who paid, when, how much, method, status
│  └─ Metadata includes tenant ID, property ID, amount
│
├─ 7. Receipt generated & sent
│  └─ PDF created: "REC-{paymentId}"
│  └─ Includes: amount, date, property, unit, tenant name, landlord name
│  └─ WhatsApp sent to tenant: "Your receipt is ready: https://app.tenuro.com/receipts/{id}"
│  └─ Tenant can download from /tenant or click link
│
├─ 8. Landlord sees update
│  └─ Goes to /payments
│  └─ Payment now shows "Posted" status
│  └─ Balance updated: ₦500,000 - ₦500,000 = ₦0
│  └─ Receipt available to download
│
└─ 9. Audit trail complete
   └─ Shows: payment created, verified, receipt generated
   └─ Used for disputes, reconciliation, compliance
```

#### **Workflow 2: Tenant Onboarding to Agreement Acceptance**

```
PHASE 1: LANDLORD CREATES TENANT
│
├─ Landlord goes to /properties/{propertyId}
├─ Selects unit or clicks "Add Tenant"
├─ Fills form: name, phone, email, notes
└─ Clicks "Create Tenant"
   └─ Tenant created in "pending" status
   └─ Stored in database with landlord_id, unit_id


PHASE 2: LANDLORD SENDS ONBOARDING LINK
│
├─ Landlord goes to /tenants or /properties/{propertyId}
├─ Finds new tenant, clicks "Send Onboarding Link"
├─ System:
│  ├─ Generates random secure token (32 bytes)
│  ├─ Hashes token with SHA256
│  ├─ Stores hash + expiry (72 hours) in database
│  ├─ Creates WhatsApp message
│  └─ Sends: "Hello [Tenant], [Landlord] invited you to complete your profile: https://app.tenuro.com/t/onboarding/{rawToken}"
└─ Landlord sees confirmation: "Onboarding link sent"


PHASE 3: TENANT COMPLETES PROFILE
│
├─ Tenant receives WhatsApp, clicks link
├─ Redirected to /t/onboarding/{rawToken}
├─ System:
│  ├─ Hashes received token
│  ├─ Finds matching onboarding record
│  ├─ Checks expiry (still valid)
│  └─ Shows onboarding form
├─ Tenant fills:
│  ├─ Full name
│  ├─ Phone number
│  ├─ Email
│  ├─ Date of birth
│  ├─ Home address
│  ├─ Occupation
│  ├─ Employer
│  └─ Optional: Guarantor info
├─ Clicks "Complete Profile"
└─ System:
   ├─ Validates all fields (Zod schema)
   ├─ Stores KYC data as JSON in database
   ├─ Sets status → "kyc_submitted"
   └─ Creates audit log: "KYC submitted from {IP}, {user agent}"


PHASE 4: LANDLORD APPROVES/REJECTS
│
├─ Landlord sees notification or checks /tenants
├─ Finds tenant in "kyc_submitted" status
├─ Views submitted KYC data
├─ Clicks "Approve" OR "Reject"
│
├─ If APPROVE:
│  ├─ Status → "approved"
│  ├─ Audit log: "Tenant approved by landlord"
│  └─ Tenant can now be added to tenancy
│
└─ If REJECT:
   ├─ Status → "rejected"
   ├─ Optional rejection reason stored
   ├─ Audit log: "Tenant rejected: {reason}"
   └─ Landlord can invite again


PHASE 5: CREATE TENANCY & SEND AGREEMENT
│
├─ Landlord creates tenancy for approved tenant
│  └─ Links: tenant + unit + rent amount + start date + frequency
├─ System generates agreement from template
├─ Landlord reviews & finalizes agreement
├─ Landlord clicks "Send to Tenant"
├─ System:
│  ├─ Generates new token (for agreement acceptance)
│  ├─ Creates WhatsApp link
│  ├─ Sends: "Hello {Tenant}, {Landlord} sent your tenancy agreement for {Unit}. Review and accept here: https://app.tenuro.com/t/agreement/{token}"
│  └─ Audit log: "Agreement acceptance link sent"
└─ Agreement status → "finalized"


PHASE 6: TENANT ACCEPTS AGREEMENT
│
├─ Tenant receives WhatsApp, clicks link
├─ Redirected to /t/agreement/{token}
├─ System validates token + expiry
├─ Shows agreement content (readonly)
├─ Tenant reviews, clicks "I Agree & Accept"
├─ System:
│  ├─ Records acceptance
│  ├─ Captures: IP address, timestamp, user agent
│  ├─ Status → "accepted"
│  ├─ Activates tenant account
│  ├─ Audit log: "Agreement accepted by tenant from {IP}"
│  └─ Sends WhatsApp to landlord: "Tenant accepted agreement"
└─ Tenant can now access /tenant dashboard


PHASE 7: READY FOR PAYMENTS
│
└─ Tenant sees on /tenant:
   ├─ Agreement (downloadable PDF)
   ├─ Rent amount
   ├─ Payment due dates
   └─ Payment history (when payments come in)
```

#### **Workflow 3: Receipt Distribution**

```
PAYMENT POSTED (Online or Manual)
│
├─ Supabase DB: payment.status = "posted"
├─ Audit log created
│
├─ Receipt Generation Job triggered
│  ├─ Renders receipt PDF using @react-pdf/renderer
│  ├─ Includes: receipt number, date, amount, property, unit, tenant name, landlord name
│  ├─ Uploads PDF to Supabase Storage at: /{landlordId}/{tenantId}/{tenancyId}/{paymentId}.pdf
│  └─ Creates signed download URL (24-hour expiry)
│
├─ Notification Job triggered
│  ├─ WhatsApp sent via Paystack API
│  ├─ Message: "Your rent receipt REC-{id} is ready. Download: {downloadUrl}"
│  └─ Notification record status → "sent"
│
├─ Landlord sees on /payments
│  ├─ Payment shows "Posted" status
│  ├─ "Download Receipt" button available
│  └─ Can resend receipt via WhatsApp
│
└─ Tenant sees on /tenant
   ├─ Payment appears in history
   ├─ "Download Receipt" button
   ├─ Or downloads from WhatsApp link
   └─ Stores copy for record
```

#### **Workflow 4: Monthly/Annual Reporting**

```
End of Period (Month/Quarter/Year)
│
├─ Landlord goes to /reports
├─ Selects:
│  ├─ Date range
│  ├─ Specific property (optional)
│  └─ Specific tenant (optional)
│
├─ System generates:
│  ├─ Total rent collected
│  ├─ Number of payments received
│  ├─ Outstanding balance by tenant
│  ├─ Payment history (detailed)
│  ├─ Payment status breakdown (posted/pending/failed)
│  └─ Collection rate %
│
└─ Landlord can:
   ├─ View on screen
   ├─ Export to PDF
   ├─ Export to Excel (future)
   └─ Share with accountant/tax advisor
```

---

### System Attributes & Operational Characteristics

#### **Data & Storage**
- **Database:** PostgreSQL (Supabase)
- **File Storage:** Supabase Storage (PDFs, agreements, receipts)
- **Audit Logs:** Immutable records of all important actions
- **Soft Deletes:** Properties/tenancies archived, not deleted

#### **Security & Compliance**
- **Authentication:** Supabase Auth (JWT in cookies)
- **Authorization:** Role-based (landlord/tenant/caretaker)
- **Validation:** Zod schemas (all inputs validated server-side)
- **Encryption:** Tokens hashed with SHA256
- **Audit Trail:** Every action logged with actor, context, metadata
- **Data Privacy:** Personal data encrypted, GDPR compliant deletion possible

#### **Payment Processing**
- **Gateway:** Paystack (Nigeria-specific)
- **Methods:** Online (Paystack), Bank Transfer, Cash
- **Idempotency:** Duplicate prevention via UUID keys
- **Reconciliation:** Payment ledger with running balance
- **Receipt:** Automatic PDF generation + WhatsApp delivery

#### **Notifications**
- **Primary Channel:** WhatsApp (via Paystack)
- **Secondary:** Email (via Resend)
- **Events Triggered:**
  - Onboarding invitations
  - Agreement acceptance requests
  - Payment links
  - Receipt delivery
  - Renewal reminders (future)
  - Payment status updates

#### **Scalability Characteristics**
- **Multi-tenant:** Completely tenant-isolated (landlord → properties/tenants)
- **Performance:** Server Components + revalidation for cache efficiency
- **Database Indexing:** On landlord_id, tenant_id, tenancy_id for queries
- **Concurrent Users:** Stateless architecture supports horizontal scaling

#### **Integrations**
- **Paystack API:** Payment processing, webhooks
- **Resend API:** Email delivery
- **Supabase:** PostgreSQL, Auth, Storage, Realtime (optional)
- **WhatsApp:** Via Paystack API for notifications

#### **Reporting & Analytics**
- **Built-in Reports:** Payment collection, outstanding rent, tenant status
- **Audit Logs:** Full audit trail for compliance
- **Export Capability:** Reports exportable for accounting/tax

#### **Error Handling & Resilience**
- **Graceful Degradation:** Notifications fail silently, payment proceeds
- **Retry Logic:** Payment verification retries on webhook failure
- **User-Friendly Errors:** All errors converted to readable messages
- **Idempotent Operations:** Duplicate requests return same result

---

**Document Version:** 1.0  
**Last Updated:** May 4, 2026  
**Project Stage:** MVP Complete, Feature Development  
**Status:** Ready for seamless handoff with zero context loss
