# BOPA PWA rollback procedure

## When to roll back

Roll back when a release causes:

- The service worker to fail installation or activation
- Repeated reloads
- Offline navigation failure
- Duplicate server records
- Offline changes that remain stuck
- Cross-account local data exposure
- Sensitive information appearing in Cache Storage or IndexedDB
- A production verifier failure that affects security or data integrity

## Immediate containment

1. Pause new deployments.
2. Preserve the failed deployment URL and logs.
3. Do not delete `offline_mutation_receipts`.
4. Do not manually remove queued changes from user devices.
5. Revert to the last verified Vercel deployment.
6. Confirm the restored `/sw.js` is available.
7. Confirm the restored worker version from DevTools.
8. Run the deployed verifier against the restored production URL.

## Service-worker rollback

A previous worker does not always replace an already active newer worker immediately.

After restoring the previous deployment:

1. Open BOPA online.
2. Wait for the worker update check.
3. Use the visible **Update** control.
4. Confirm the app reloads once.
5. Confirm the expected worker controls the page.
6. Confirm waiting changes have synced before reloading.

For an affected test device only, DevTools may be used to unregister the worker and clear site data. Do not instruct production users to clear data while changes are waiting.

## Database rollback

The Phase 4 and Phase 5 migrations are additive and contain operational receipt history.

Do not drop:

- `offline_mutation_receipts`
- `apply_offline_safe_mutation`
- `prune_offline_mutation_receipts`

during an application rollback unless a separate reviewed database rollback has been approved.

## Post-rollback validation

Run:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1 `
  -ProductionUrl "https://boldverseproperty.com"
```

Then repeat:

- Installability
- Offline launch
- One offline maintenance create
- Reconnect
- Duplicate check
- Conflict review
- Account switch
- Service-worker update
