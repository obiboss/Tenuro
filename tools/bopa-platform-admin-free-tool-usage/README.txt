BOPA Platform Admin — Free Tool Usage

What this adds
- A dedicated Free tool usage section on /admin.
- Shows who generated, downloaded, shared, or attached a free receipt or tenancy agreement.
- Shows name, phone, email where available, visitor/account status, action, document reference, and time.
- Respects the existing Day, Week, Month, and Year admin period filter.
- Uses the existing receipt_usage_events, agreement_usage_events, and public_tool_leads tables.
- No migration and no new dependency.

Changed files
- src/app/(platform-admin)/admin/page.tsx
- src/server/repositories/platform-admin-dashboard.repository.ts
- src/server/services/platform-admin-dashboard.service.ts

Created file
- src/components/platform-admin/admin-free-tool-usage.tsx

Validation performed
- TypeScript/TSX syntax validation passed for all four files.
