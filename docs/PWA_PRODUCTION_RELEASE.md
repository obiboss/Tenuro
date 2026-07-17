# BOPA PWA production release checklist

## Release rule

Do not mark the PWA ready from a single desktop browser test. A release passes only after:

1. Static project checks pass.
2. The existing lint and TypeScript commands pass.
3. The required Supabase migrations are already applied.
4. The deployed production verifier passes.
5. Desktop, Android, and iPhone manual checks pass.
6. Offline writes, duplicate protection, conflict review, account switching, and service-worker updates are exercised.

Chrome's former Lighthouse PWA badge is not the release authority. Use the Chrome DevTools Application panel, the automated checks in this package, and the device matrix below.

## Before deployment

From the project root:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1
```

This runs:

- PWA file and policy verification
- Icon dimension checks
- Service-worker cache and sensitive-route checks
- Offline API `no-store` checks
- Local-data field exposure checks
- Existing `lint` command, when present
- Existing TypeScript check, when present

A production build is not run unless explicitly requested:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1 -IncludeBuild
```

Existing tests are not run unless explicitly requested:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1 -IncludeTests
```

## Database confirmation

Confirm both migrations have run successfully in the live Supabase project:

- `20260717000000_offline_safe_mutations.sql`
- `20260717010000_offline_sync_hardening.sql`

Confirm:

- `offline_mutation_receipts` has RLS enabled.
- Direct `anon` and `authenticated` table access is revoked.
- `apply_offline_safe_mutation` is executable only by `service_role`.
- `prune_offline_mutation_receipts` is executable only by `service_role`.

## Preview deployment

Deploy to a Vercel preview first.

Check:

- No unexpected build warnings.
- `/manifest.webmanifest` returns `200`.
- `/sw.js` returns `200`.
- `/offline.html` returns `200`.
- `/offline-workspace.html` returns `200`.
- Icons return `200`.
- Offline read and push endpoints return `Cache-Control: no-store`.
- `sw.js` is not served as immutable or with a long cache lifetime.

Run the deployed verifier:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1 `
  -ProductionUrl "https://YOUR-PREVIEW-URL"
```

## Production deployment

After preview passes:

```powershell
& .\tools\bopa-pwa-production\run-release-checks.ps1 `
  -ProductionUrl "https://boldverseproperty.com"
```

Reports are written to:

```text
artifacts/pwa-production
```

Keep the JSON and Markdown reports with the release record.

## Browser inspection

In Chrome or Edge DevTools:

1. Open **Application**.
2. Confirm the manifest loads without errors.
3. Confirm the active service worker controls the page.
4. Confirm Cache Storage contains only the BOPA shell and same-origin static assets.
5. Confirm IndexedDB uses the `bopa-offline` database.
6. Confirm no bank, KYC document, agreement, receipt, private document, password, token, or secret is present.
7. Confirm the service worker version is `bopa-pwa-shell-v5`.

## Required operational scenarios

### First online visit

- Sign in.
- Open the Manager or Developer workspace.
- Confirm the offline copy refreshes.
- Confirm the last-refreshed time appears.
- Close and reopen the installed app.

### Offline read

- Disconnect the device.
- Open the installed app.
- Navigate to the workspace.
- Confirm the branded offline workspace appears.
- Confirm only the last refreshed records are shown.
- Confirm stale warnings appear when expected.

### Offline maintenance

- Disconnect the device.
- Record one maintenance issue.
- Confirm a visible success notification appears.
- Confirm the waiting-change count increases.
- Reconnect.
- Confirm the issue appears exactly once online.
- Confirm the waiting count returns to zero.

### Offline descriptive edit

- Disconnect.
- Edit one approved descriptive/contact field.
- Reconnect.
- Confirm the server record is updated once.
- Confirm financial, legal, identity, allocation, and status fields remain unavailable offline.

### Duplicate protection

- Disconnect.
- Save a maintenance issue once.
- Close and reopen the app before reconnecting.
- Reconnect.
- Refresh several times.
- Confirm only one server record exists.

### Conflict review

- Device A: load a record online, then disconnect.
- Device B: change the same record online.
- Device A: edit the old copy and reconnect.
- Confirm BOPA does not overwrite silently.
- Confirm **Attention needed** appears.
- Test both:
  - **Keep online version**
  - **Use my changes**

### Retry limit

- Cause the push endpoint to fail repeatedly in a non-production test environment.
- Confirm automatic retries stop after six attempts.
- Confirm the change moves to review.
- Confirm manual retry preserves the original idempotency key.

### Account switching

- Sign in as account A and refresh offline data.
- Sign out.
- Confirm the local database is cleared.
- Sign in as account B.
- Confirm account A data is not visible.

### Revoked access

- Refresh a staff workspace offline.
- Revoke the staff member online.
- Reconnect the staff device.
- Confirm the local workspace is cleared.

### Service-worker update

- Keep one offline change waiting.
- Deploy a new worker.
- Confirm the update action does not reload while the change is waiting.
- Reconnect and allow the change to sync.
- Confirm the update becomes available and reloads only after the queue is clear.

### Storage pressure

- Open **Offline storage**.
- Confirm usage, quota, waiting changes, and review counts display.
- Confirm clearing is blocked while work is waiting.
- Clear the copy when the queue is empty.
- Confirm online records remain unchanged.
- Open the workspace online and confirm a new offline copy downloads.

## Release decision

A release is ready only when:

- Automated static checks: pass
- Deployed production checks: pass
- Desktop install and standalone launch: pass
- Android install and standalone launch: pass
- iPhone Home Screen launch: pass
- Offline read: pass
- Offline write and reconnect: pass
- Duplicate prevention: pass
- Conflict review: pass
- Account isolation: pass
- Update safety: pass
- Security inspection: pass
