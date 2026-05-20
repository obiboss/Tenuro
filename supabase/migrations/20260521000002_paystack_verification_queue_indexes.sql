-- =====================================================================
-- Payout verification queue indexes
-- =====================================================================
--
-- The basic verification_status indexes already exist from
-- `20260520000000_add_paystack_verification_status.sql`.
--
-- These queue-specific indexes use distinct names so Postgres does not
-- skip the composite indexes because an older same-name index exists.
-- =====================================================================

create index if not exists landlord_paystack_accounts_verification_queue_idx
on public.landlord_paystack_accounts (
  verification_status,
  is_active,
  created_at desc
);

create index if not exists landlord_paystack_accounts_verified_at_idx
on public.landlord_paystack_accounts (
  verified_at desc
);

create index if not exists agent_paystack_accounts_verification_queue_idx
on public.agent_paystack_accounts (
  verification_status,
  is_active,
  created_at desc
);

create index if not exists agent_paystack_accounts_verified_at_idx
on public.agent_paystack_accounts (
  verified_at desc
);
