BOPA PWA Phase 1

Implemented:
- Installable web app manifest
- Desktop and mobile app icons
- Native service worker
- Reliable inline-styled offline fallback
- Install prompt for supported browsers
- iPhone/iPad Add to Home Screen instructions
- Online/offline status
- Visible update notification
- Network-only handling for sensitive routes
- Static application asset caching only

Important:
- Service worker registration is production-only.
- Phase 1 does not cache authenticated business records.
- IndexedDB, local-first records, and automatic data sync begin in Phase 2.
- No database migration or npm dependency is required.
