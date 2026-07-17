BOPA PWA Phase 6 — Production readiness

Added
- Static production-readiness checker
- Deployed production URL verifier
- Existing-project lint and TypeScript command runner
- Optional build and test execution
- JSON and Markdown release reports
- Desktop, Android, iPhone, and iPad device matrix
- Offline read/write, duplicate, conflict, retry, account isolation,
  access revocation, storage, and update scenarios
- User-facing installation guide
- Service-worker and database rollback procedure
- Final release checklist

No existing application feature is changed.
No new npm dependency is required.
No Supabase migration is required.

After installation

Local checks:
.	oolsopa-pwa-productionun-release-checks.ps1

After deployment:
.	oolsopa-pwa-productionun-release-checks.ps1 `
  -ProductionUrl "https://boldverseproperty.com"

Optional existing build:
.	oolsopa-pwa-productionun-release-checks.ps1 -IncludeBuild

Reports:
artifacts\pwa-production
