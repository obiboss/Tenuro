# BOPA Platform Activity Audit

## Outcome

BOPA now has one protected Admin activity trail across Landlord, Tenant,
Caretaker, Agent, Manager, Developer, payments, subscriptions, public tools and
demo requests.

The existing `audit_log` and `audit_logs` tables remain in place. Their existing
records are preserved and copied once into the unified Admin trail when the new
migration runs.

## What is recorded

- Account sign-up started, authentication account created, profile/workspace
  completed, email verification pending, and sign-up failed.
- Successful and failed sign-in, sign-out, and password recovery activity.
- Property, unit, tenant, tenancy, caretaker, agent, manager and developer
  record creation, change and removal.
- Manager tenant onboarding from invitation through details, review, agreement,
  first payment and activation, including rejection, cancellation and expiry.
- Landlord and Manager property onboarding, including properties left without
  units and Manager properties with existing-tenant setup still unfinished.
- Developer estate onboarding, including estates left without plots.
- Rent payments, receipts, payout accounts, allocations, remittances,
  subscriptions and payment-provider processing status changes.
- Agreements, notices, reports, document records, public tools and demo request
  progress.

## How unfinished work is identified

The `activity_journeys` table stores the current step of multi-stage work.
Admin can therefore distinguish:

- a sign-up that failed before creating an account;
- an authentication account whose BOPA profile was never completed;
- a Manager account waiting for email verification;
- a property saved without a unit;
- a property whose existing tenants have not all been captured;
- a tenant waiting to submit details, waiting for review, waiting for an
  agreement, or waiting for first rent;
- a demo request waiting for contact or a confirmed appointment.

The migration also reconstructs these journey states from records that already
exist before the audit system is installed.

## Security rules

- Activity events are append-only.
- Only the server and protected Platform Admin pages can read the unified data.
- Passwords, OTPs, cookies, authorization headers, private tokens, bank account
  numbers, BVNs, identity numbers, raw webhook payloads and document bodies are
  never copied into the activity trail.
- Row-change events store changed column names and safe before/after status
  labels, not full database rows.
- IP address and device information are retained for protected forensic review
  but are not displayed in the ordinary Admin list.

## Admin access

Open:

```text
/admin/activity
```

The page provides module, result, period and text filters. The first section
shows unfinished and failed journeys. The second section shows the complete
time-ordered activity trail.

## Database migration

Run once in the Supabase SQL Editor after the demo-request migration:

```text
supabase/migrations/20260721000000_comprehensive_activity_audit.sql
```

Verify installation:

```sql
select
  to_regclass('public.activity_events') as activity_events,
  to_regclass('public.activity_journeys') as activity_journeys;

select module, outcome, count(*)
from public.activity_events
group by module, outcome
order by module, outcome;

select module, journey_type, status, current_step, count(*)
from public.activity_journeys
group by module, journey_type, status, current_step
order by module, journey_type, status, current_step;
```

Both table names must be returned by the first query.
