# BOPA offline operations

## What works without a connection

After a signed-in workspace has refreshed successfully at least once, BOPA keeps an owner-scoped local copy and can queue these operations:

- Manager: add a property, unit, current occupant, maintenance request, or payment received outside BOPA.
- Landlord: add a property or unit, or record a payment received outside BOPA.

The normal forms use the same labels and validation whether the connection is available or not. An offline submission displays:

> Saved on this device. BOPA will sync it automatically when your internet returns.

If a previously opened BOPA page cannot be restored, `/offline-workspace.html` provides a compact fallback workspace backed by the same IndexedDB records and outbox.

## Sync and safety model

- Supabase remains authoritative.
- Every queued command receives a stable mutation and entity identifier.
- The server rechecks the signed-in account, workspace, role, subscription, and record relationships before applying a command.
- Manager current-occupant capture locks the unit and rejects the command if a current tenant or open onboarding request already exists.
- Rejected or conflicting commands move to the existing offline review flow instead of being silently discarded.
- Automatic sync runs after reconnection, when the app becomes visible, and when supported background sync is available.
- A payment does not update balances or produce a receipt until the existing server-side payment workflow confirms it.

Local data is cleared when the account signs out or a different account signs in on the same browser.

## Deliberately online-only

These operations still require a live connection because they depend on external verification, sensitive documents, or immediate server confirmation:

- Paystack payments and callbacks.
- Bank account setup and payout verification.
- KYC, guarantor, agreement, and document workflows.
- Receipt, statement, and report generation or download.
- Platform administration and approval actions.

“Payment received outside BOPA” means a cash, bank-transfer, or other payment already received outside the platform. It does not make Paystack work offline.

## Prefetch policy

When the browser is online and idle, BOPA selectively prefetches the common operational routes:

- Overview.
- Properties.
- Tenants.
- Payments.

Reports, documents, bank verification, and gateway routes are excluded. Prefetch improves online navigation speed; IndexedDB and the command outbox provide durable offline operation.

## Required migration

Apply this migration after the earlier BOPA migrations:

```text
supabase/migrations/20260722000000_offline_operational_workflows.sql
```

It adds the service-role-only `create_manager_existing_tenant_offline` function used by both online manual capture and offline replay. The function preserves the existing one-current-tenant-per-unit and onboarding-request protections.

## Verification checklist

1. Sign in while online and open the relevant Manager or Landlord workspace once.
2. In browser developer tools, switch the network to Offline.
3. Submit one supported form and confirm the “Saved on this device” message.
4. Open `/offline-workspace.html` and confirm the queued count and local record.
5. Restore the network and reopen BOPA.
6. Confirm the waiting count returns to zero and the record exists in Supabase.
7. For a manual payment, confirm the final balance and receipt appear only after the sync is accepted.
8. Repeat with a deliberately stale unit or tenancy and confirm the record is sent to offline review rather than overwriting server data.
