# BOPA PWA offline security boundary

## Authoritative system

Supabase remains the authoritative source for all BOPA business data. IndexedDB stores a device-local operational copy and a restricted queue of approved low-risk changes.

## Cache Storage

The service worker may cache only:

- The branded offline pages
- The web manifest
- BOPA application icons
- Versioned Next.js static JavaScript and CSS
- Same-origin fonts required by the application shell

The service worker does not cache:

- Authenticated page HTML
- API responses
- Authentication routes or callbacks
- Paystack routes or callbacks
- Reports or private document routes
- Payment links
- Supabase data responses
- Cross-origin resources

Runtime cache controls:

- Maximum 180 entries
- Maximum 5 MB per response
- 30-day maximum age
- Content-type allowlist
- `private` and `no-store` responses rejected
- Old application caches removed during activation
- Failed shell precaching prevents a broken worker from activating

## IndexedDB data allowed offline

### Manager

- Property name, address, city, state, LGA, status, internal note
- Unit label, unit type, rent display amount, status
- Current tenant name, phone, email, occupation, rent display amount, balance display, move-in date, next due date, move-out date, status, internal note
- Maintenance issue, description, property/unit/tenant references, priority, status, estimated and actual display amounts, vendor, dates, internal note

### Developer

- Estate name, location, city, state, LGA, status, description, non-sensitive planning summaries
- Plot label, size label, price display, status, note
- Buyer name, phone, email, status
- Sale reference, estate/plot/buyer references, plan mode, locked total display, initial deposit display, dates, status

### Device-operation records

- Workspace and profile partition keys
- Sync cursors
- Unique client mutation IDs
- Approved mutation payloads
- Retry metadata
- Conflict-review payloads
- Drafts for approved offline forms
- Non-secret device identifier

## Data prohibited offline

- Bank accounts and payout profiles
- Paystack credentials, references, authorization details, or webhook payloads
- NIN, identity documents, KYC files, and guarantor documents
- Tenancy agreements and acceptance evidence
- Receipts, statements, generated reports, and private document URLs
- Payment ledger rows and verified financial evidence
- Passwords, OTPs, recovery tokens, sessions, service keys, or API secrets
- Buyer identity documents and allocation documents

## Safe offline writes

The server accepts only:

- Manager maintenance creation and restricted maintenance updates
- Manager property descriptive fields
- Current manager-tenant contact/descriptive fields
- Developer estate descriptive fields
- Developer buyer contact fields

Financial, legal, identity, allocation, activation, status-transition, and payment operations are never queued offline.

## Server enforcement

Every pushed change is rechecked for:

- Authenticated active profile
- Current workspace membership
- Current role and permission
- Exact workspace ownership
- Strict field allowlist
- Valid values and references
- Record revision conflict
- Duplicate client mutation ID

The mutation receipt table has RLS enabled and no direct browser access. The mutation function is executable only by the service role.

## Device lifecycle

- A sign-out clears the local database.
- Switching to a different authenticated profile clears the previous profile’s local database.
- Revoked workspace access clears the device copy.
- Multi-tab sync uses an exclusive Web Lock where supported and a time-limited local lease fallback.
- Resolved conflicts, old drafts, tombstones, inactive workspaces, and old mutation receipts are retained only for bounded periods.
- Users cannot clear the local copy while changes or conflicts still need attention.
