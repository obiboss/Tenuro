BOPA Platform Admin — Free Tool Usage v2

Purpose
- Show who is using the free receipt generator.
- Show who is using the free tenancy agreement generator.
- Include these events in recent platform activity.
- Preserve the existing Day, Week, Month and Year filter.

Information shown
- Person's name
- Phone number and email when supplied
- Visitor or BOPA account
- Tool used
- Action performed
- Receipt/agreement reference
- Source page
- Date and time

Data sources
- receipt_usage_events
- agreement_usage_events
- public_tool_leads
- public_generated_receipts
- public_generated_agreements

Database changes
- No migration
- No new table
- No new dependency

Files changed
- src/app/(platform-admin)/admin/page.tsx
- src/server/repositories/platform-admin-dashboard.repository.ts
- src/server/services/platform-admin-dashboard.service.ts

File created
- src/components/platform-admin/admin-free-tool-usage.tsx

Installer safety
- Compares normalized file contents, so Windows CRLF line endings do not cause false mismatches.
- Backs up changed files.
- Runs npm run lint.
- Restores the original files automatically if lint fails.
