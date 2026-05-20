-- =====================================================================
-- Phase 1 : Add verification_status to paystack payout accounts
-- =====================================================================
--
-- Adds a tri-state `verification_status` column to both
-- `landlord_paystack_accounts` and `agent_paystack_accounts` so that
-- payment-gating code (gateway-payment.service, agent-processing-fee.
-- service) and the upcoming admin-verification workflow can distinguish
-- between accounts that have not yet been reviewed, accounts that have
-- been confirmed by Paystack, and accounts that failed verification.
--
-- Allowed values: 'unverified' | 'verified' | 'failed'
--
-- Backfill rule:
--   verified_at IS NOT NULL  ->  'verified'
--   otherwise                ->  'unverified'
--
-- This file is idempotent. It does not touch existing column values once
-- they have been promoted out of 'unverified' so re-running it on a
-- partially migrated database is safe.
--
-- This migration intentionally does NOT modify `is_verified` or
-- `verified_at`; both are retained for backwards compatibility with the
-- prior admin-less flow and webhook code that still writes to them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. landlord_paystack_accounts
-- ---------------------------------------------------------------------

alter table public.landlord_paystack_accounts
  add column if not exists verification_status text
  not null default 'unverified';

alter table public.landlord_paystack_accounts
  drop constraint if exists landlord_paystack_accounts_verification_status_check;

alter table public.landlord_paystack_accounts
  add constraint landlord_paystack_accounts_verification_status_check
  check (verification_status in ('unverified', 'verified', 'failed'));

update public.landlord_paystack_accounts
set verification_status = 'verified'
where verification_status = 'unverified'
  and verified_at is not null;

create index if not exists landlord_paystack_accounts_verification_status_idx
  on public.landlord_paystack_accounts (verification_status);

create index if not exists landlord_paystack_accounts_active_verification_idx
  on public.landlord_paystack_accounts (is_active, verification_status);

-- ---------------------------------------------------------------------
-- 2. agent_paystack_accounts
-- ---------------------------------------------------------------------

alter table public.agent_paystack_accounts
  add column if not exists verification_status text
  not null default 'unverified';

alter table public.agent_paystack_accounts
  drop constraint if exists agent_paystack_accounts_verification_status_check;

alter table public.agent_paystack_accounts
  add constraint agent_paystack_accounts_verification_status_check
  check (verification_status in ('unverified', 'verified', 'failed'));

update public.agent_paystack_accounts
set verification_status = 'verified'
where verification_status = 'unverified'
  and verified_at is not null;

create index if not exists agent_paystack_accounts_verification_status_idx
  on public.agent_paystack_accounts (verification_status);

create index if not exists agent_paystack_accounts_active_verification_idx
  on public.agent_paystack_accounts (is_active, verification_status);
