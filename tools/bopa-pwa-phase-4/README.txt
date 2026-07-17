BOPA PWA Phase 4 — Safe offline writes

Implemented
- Atomic and idempotent offline change processing
- RLS-protected mutation receipts
- Service-role-only database function
- Session, workspace, role, and permission validation
- Strict field allowlists
- Automatic push before read refresh
- Exponential retry and interrupted-sync recovery
- Duplicate submission prevention
- Optimistic device updates
- Conflict detection using server revisions
- Review flow: keep online version or use local changes
- Authoritative refresh after rejected edits
- Immediate device cleanup when workspace access is revoked
- Local draft autosave and restoration

Manager offline actions
- Create and update maintenance issues
- Edit property name, address, city, and internal note
- Edit current tenant name, phone, email, occupation, and internal note

Developer offline actions
- Edit estate name, location, city, and description
  Company owner only
- Edit buyer name, phone, and email
  Company owner or staff with buyer:create permission

Always online
- Payments and payment verification
- Bank and payout details
- Rent amounts, balances, and confirmations
- KYC and identity data
- Agreements and acceptance
- Receipts, reports, and private documents
- Tenant activation, move-out, and tenancy status
- Plot inventory, allocation, pricing, and sale confirmation
- Buyer identity, allocation, payment, and status

Required database step
Run:
supabase/migrations/20260717000000_offline_safe_mutations.sql

No new npm dependency is required.
