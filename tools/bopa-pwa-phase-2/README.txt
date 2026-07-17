BOPA PWA Phase 2 — Local data infrastructure

Implemented:
- Typed Dexie/IndexedDB database
- Separate Manager and Developer entity stores
- Profile and workspace partitioning
- Automatic local-data cleanup after sign-out or account change
- Stable device identifier
- Persistent-storage request
- Typed local entity repository
- Offline draft repository
- Idempotent client mutation identifiers
- Local outbox with retry state
- Conflict store
- Sync cursor store
- Reactive pending/conflict status
- Background Sync registration where supported
- Foreground reconnect and visibility sync fallback
- Service-worker sync messaging
- Global premium sync-state notifications

Boundary:
- Phase 2 creates the infrastructure only.
- Business records are not pulled into IndexedDB until Phase 3.
- No financial, KYC, agreement, payment, receipt, or document action is made offline.
- Supabase remains the authoritative database.

Dependency:
- dexie 4.4.4 (exact)
