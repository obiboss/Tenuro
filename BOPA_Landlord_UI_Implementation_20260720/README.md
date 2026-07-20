# BOPA Landlord UI implementation

This package contains the completed landlord UI update for desktop and mobile. It is designed for older, less technical landlords: larger controls, simpler wording, fewer competing navigation choices, and one clear action at a time.

## What changed

- New-landlord Home setup: Property → Units → optional Rules → Tenants.
- Returning-landlord Home: rent summary, due/overdue rent, tenant reviews, inline WhatsApp rent reminders, and recent activity on one balanced page.
- Tenant entry choice: “A new tenant” or “Already living there”.
- Simplified tenant link forms and clearer tenant accept/reject review.
- Agreements added to primary navigation, with general and property-specific editing.
- Offline payment recording and payment-proof confirmation made easier to find.
- Simplified desktop sidebar and mobile bottom navigation.
- Larger type, buttons, focus states, and touch targets throughout the updated flow.

## Apply the files on Windows PowerShell

Run this from the root of your existing BOPA project after extracting this ZIP:

```powershell
$PackageRoot = Resolve-Path ".\BOPA_Landlord_UI_Implementation_20260720"
$ProjectRoot = Get-Location

Copy-Item -Path "$PackageRoot\src\*" -Destination "$ProjectRoot\src" -Recurse -Force

npm ci
npm run dev
```

Then open `http://localhost:3000` and sign in as a landlord.

## Validation completed

- ESLint: passed. One unrelated pre-existing warning remains in `public-manager-tenant-onboarding-form.tsx`.
- TypeScript: passed with no errors.
- Next.js production build: passed.

## Scope notes

- No Supabase migrations or database files are included.
- No dependencies or package files were changed.
- Existing actions and server-side business logic are preserved.
- The supplied backend currently supports an existing-tenant claim link, but not landlord-side manual creation of the limited existing-tenant payment history described in the brief.
- The supplied backend currently restricts payment-proof link creation to caretakers. Landlords can still record offline payments and confirm submitted payment proof.
- The supplied tenant-onboarding action does not currently store work mode, office address, or full guarantor details. Those fields were not added as non-functional UI.
