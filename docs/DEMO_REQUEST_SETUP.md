# BOPA Demo Request Setup

The Manager and Developer **Book a Demo** buttons now open a working request
page at `/contact`.

## What happens when a visitor submits the form

1. BOPA validates the visitor's name, company, email, Nigerian phone number,
   preferred date, and preferred time.
2. The request is stored in `public.demo_requests`.
3. Repeated requests are limited and a hidden spam field filters basic bots.
4. If demo email alerts are configured, BOPA sends an email alert to the
   designated BOPA inbox.
5. The request remains safely stored even if the email provider is temporarily
   unavailable.
6. A platform administrator can review and update requests at
   `/admin/demo-requests`.

## Database setup

Run this file once in the Supabase SQL Editor:

```text
supabase/migrations/20260720010000_demo_requests.sql
```

Because the live Supabase migration history may differ from the local files,
run this individual file in the SQL Editor instead of running `supabase db push`.

Confirm the table exists:

```sql
select to_regclass('public.demo_requests') as demo_requests;
```

The result should be `demo_requests`, not `null`.

## Email alerts

Email alerts are optional. Demo requests are stored and visible in BOPA Admin
even when email alerts have not been configured.

The anti-spam fingerprint uses the existing server-side Supabase service-role
secret when a separate secret is not configured. No extra environment variable
is required for the form to work. To keep it on a dedicated secret, optionally
set a random value of at least 32 characters:

```env
DEMO_REQUEST_FINGERPRINT_SECRET=replace_with_a_long_random_server_secret
```

To enable email alerts, create a Resend account, verify a sending domain that
you control, and add these environment variables:

```env
RESEND_API_KEY=re_replace_with_your_resend_key
DEMO_NOTIFICATION_FROM_EMAIL=BOPA Demo <demo@your-verified-domain.com>
DEMO_NOTIFICATION_TO_EMAIL=boldverse1@gmail.com
```

- `RESEND_API_KEY` comes from the Resend API Keys page.
- `DEMO_NOTIFICATION_FROM_EMAIL` must use a domain verified in Resend.
- `DEMO_NOTIFICATION_TO_EMAIL` is the inbox that should receive new demo alerts.
- The requester's email is automatically used as the reply-to address.

Add these values to `.env.local` for local testing and to the Vercel project for
production. Restart the local development server after editing `.env.local`.
Redeploy Vercel after adding or changing production variables.

## Production check

1. Visit `/managers` and select **Book a Demo**.
2. Confirm BOPA Manager is selected on the form.
3. Visit `/developers` and select **Book a Demo**.
4. Confirm BOPA Developer is selected on the form.
5. Submit a test request.
6. Confirm the success message appears.
7. Sign in as a platform administrator and open `/admin/demo-requests`.
8. Confirm the request appears with an editable WhatsApp message, call, email,
   and status controls.
9. Edit the message and confirm it opens the requester's WhatsApp conversation.
   The administrator should be signed into BOPA's WhatsApp account on
   `0802 512 7875` before sending.
10. If email alerts are enabled, confirm the alert reaches the configured inbox.
