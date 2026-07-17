BOPA PWA Phase 3 — Read offline

Implemented:
- Authenticated read-only workspace snapshot endpoint
- Full initial device refresh
- Incremental refresh using updated_at cursors
- Automatic full reconciliation every 24 hours
- Paginated sync for large portfolios
- Manager offline data:
  properties, units, current/history tenant rows, maintenance
- Developer offline data:
  estates, plots, buyer summaries, sales summaries
- Minimal offline data fields only
- No bank data, KYC documents, NIN, next-of-kin, receipts,
  agreements, private documents, or payment ledger records
- Automatic refresh on app open, reconnect, and app focus
- Workspace/account isolation
- Read-only premium offline workspace rendered without Next.js
  JavaScript chunks
- Manager and Developer navigation fallback to the offline workspace
- Search, summary figures, section tabs, last-refreshed timestamp
- Daily full reconciliation handles records removed since the last sync

Security boundary:
- Offline workspace is read-only.
- Payments, bank details, identity checks, agreements, receipts,
  reports, private documents, and final confirmations stay online-only.
- Supabase remains authoritative.
- API responses are no-store.
- Existing authenticated workspace HTML is not cached.

No Supabase migration is required for Phase 3.
