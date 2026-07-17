BOPA PWA Phase 5 — Optimization and security

Implemented
- Cross-tab exclusive sync using Web Locks
- Time-limited local lease fallback where Web Locks are unavailable
- Broadcast coordination between open BOPA tabs
- Service-worker cache limit: 180 runtime entries
- Service-worker cache retention: 30 days
- Maximum cached response size: 5 MB
- Content-type allowlist
- Rejection of private and no-store responses
- Protected application-shell fallback files
- Navigation timeout and reliable offline fallback
- User-controlled service-worker updates only
- Updates blocked while offline changes are still saving
- IndexedDB storage quota monitoring
- Persistent-storage status monitoring
- Global critical-storage warning
- Offline storage management screen
- Safe clear-offline-copy control
- Clear blocked while changes or conflicts need attention
- 24-hour stale-copy warning
- 7-day critical stale-copy warning
- Automatic cleanup:
  * resolved conflicts after 30 days
  * old drafts after 30 days
  * old tombstones after 30 days
  * inactive workspaces after 90 days
- Server mutation receipt retention:
  * completed after 90 days
  * conflict/rejected after 180 days
  * abandoned processing rows after 24 hours
- Maximum six automatic mutation retries
- Failed changes move to review
- Manual retry preserves the original idempotency key
- Full authoritative refresh after exhausted or rejected edits
- Immediate local cleanup after account/workspace access revocation
- Safer sign-out and profile switching cleanup
- Nested IndexedDB transaction correction for full refresh
- Security boundary documentation:
  docs/PWA_OFFLINE_SECURITY.md

Required migration
supabase/migrations/20260717010000_offline_sync_hardening.sql

No new npm dependency is required.
