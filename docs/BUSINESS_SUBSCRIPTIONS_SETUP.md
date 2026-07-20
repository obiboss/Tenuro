# Manager and developer subscription setup

This implementation gives every property manager and real estate developer
company two calendar months of free access. After the free period, one company
subscription covers the owner and authorised staff at either ₦70,000 monthly
or ₦600,000 yearly.

## 1. Create four Paystack plans

Create these plans in the same Paystack account used by the existing BOPA
webhook:

| Plan                   |   Amount | Paystack interval |
| ---------------------- | -------: | ----------------- |
| BOPA Manager Monthly   |  ₦70,000 | Monthly           |
| BOPA Manager Yearly    | ₦600,000 | Annually          |
| BOPA Developer Monthly |  ₦70,000 | Monthly           |
| BOPA Developer Yearly  | ₦600,000 | Annually          |

Copy each generated Paystack plan code into the matching server environment
variable:

```dotenv
PAYSTACK_MANAGER_MONTHLY_PLAN_CODE=
PAYSTACK_MANAGER_ANNUAL_PLAN_CODE=
PAYSTACK_DEVELOPER_MONTHLY_PLAN_CODE=
PAYSTACK_DEVELOPER_ANNUAL_PLAN_CODE=
```

The existing `PAYSTACK_SECRET_KEY` must belong to the Paystack account that
owns these plans. `NEXT_PUBLIC_APP_URL` must be the public HTTPS address of the
BOPA deployment.

## 2. Confirm the webhook address

The Paystack webhook URL remains:

```text
https://YOUR-BOPA-DOMAIN/api/webhooks/paystack
```

The handler verifies Paystack's signature before processing any subscription
event. It handles initial charges, automatic renewals, failed invoices,
cancellation, disabled subscriptions, invoice updates, and expiring-card
notices.

## 3. Apply the migration last

Apply `supabase/migrations/20260720000000_business_subscriptions.sql` after the
existing manager, developer, and offline-sync migrations. The migration:

- creates separate company subscription, payment, and webhook-event tables;
- starts a fresh two-month trial for every existing manager/developer company;
- automatically starts the same trial for new companies;
- adds restrictive subscription policies to operational company tables; and
- wraps offline mutation processing so expired companies cannot bypass the
  subscription gate with queued changes.

The migration does not alter `subscriptions`, `subscription_payments`, or the
developer account's existing `subscription_plan` field.

## 4. Verify the deployment

Run this read-only query in the Supabase SQL Editor:

```sql
select
  workspace_type,
  status,
  count(*) as companies,
  min(trial_started_at) as earliest_trial_start,
  min(trial_expires_at) as earliest_trial_end
from public.business_subscriptions
group by workspace_type, status
order by workspace_type, status;
```

Every existing manager and developer company should have one `trialing` row,
and its `trial_expires_at` should be exactly two calendar months after
`trial_started_at`.

Before production release, complete one test-mode monthly checkout and one
test-mode yearly checkout, confirm the callback activates the company, resend
the same Paystack webhook to confirm it is treated as a duplicate, and confirm
an expired test company is redirected to its subscription page while its data
remains present.
