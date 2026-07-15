# BOPA Password Recovery Setup

This document covers the Supabase Dashboard settings required by the BOPA
forgot-password and password-recovery flows.

## Authentication URL configuration

Set the production Site URL to:

```text
https://boldverseproperty.com
```

Add these allowed redirect URLs:

```text
https://boldverseproperty.com/auth/callback
http://localhost:3000/auth/callback
```

For Vercel preview deployments, prefer an explicit preview URL allow-list for
the active preview environment. Do not use an unrestricted wildcard unless the
project has a secure preview-domain strategy and the wildcard is scoped to that
strategy.

The application builds password recovery links with the trusted app origin from
`NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL`, falling back only to trusted
local/production hosts. Production should set `NEXT_PUBLIC_APP_URL` to
`https://boldverseproperty.com`.

## SMTP

Production password recovery email should use custom SMTP configured in the
Supabase Dashboard. Do not rely on Supabase's default testing sender for live
manager password reset email.

SMTP provider credentials are configured in Supabase, not in this application,
so no SMTP secrets should be committed to source control for this flow.

## Reset Password email template

The Supabase `Reset Password` email template must keep Supabase's recovery
confirmation link variable. Do not hardcode a generated reset URL in the app or
the template.

The app expects the confirmation link to resolve through:

```text
/auth/callback?next=/manager/update-password
```

## Manual verification checklist

Manager flow:

1. Open `/manager/login`.
2. Select `Forgot password?`.
3. Submit an invalid email.
4. Submit a valid manager email.
5. Confirm neutral success wording.
6. Open the reset email.
7. Confirm `/auth/callback` creates the recovery session.
8. Confirm expired links fail safely.
9. Enter mismatched passwords.
10. Change the password successfully.
11. Confirm redirect to `/manager/login?passwordUpdated=true`.
12. Confirm the old password no longer works.
13. Confirm the new password works.
14. Confirm other sessions are signed out where Supabase supports it.

Phone flow:

1. Open `/login`, `/agent/login`, or `/developer/login`.
2. Select `Forgot password?`.
3. Enter an invalid phone number.
4. Enter a registered phone number.
5. Confirm no new account is created when the number is unknown.
6. Enter an invalid OTP.
7. Verify a valid OTP.
8. Confirm `/reset-password` requires the verified recovery session.
9. Enter mismatched passwords.
10. Change the password successfully.
11. Confirm redirect to the role-correct phone login page.
12. Confirm the new password works.
13. Confirm temporary recovery cookies are cleared.
