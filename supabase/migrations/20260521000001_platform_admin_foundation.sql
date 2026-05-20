-- =====================================================================
-- Platform admin foundation: helper function + payout-account RLS
-- =====================================================================
--
-- Depends on `20260521000000_add_platform_admin_role.sql`, which adds
-- the `platform_admin` value to `public.user_role`. That migration must
-- be applied (and committed) before this one runs, because PostgreSQL
-- does not allow a newly added enum value to be referenced inside the
-- same transaction it was added in.
--
-- Scope:
--   * `is_platform_admin()` — security-definer helper used by admin RLS.
--   * SELECT + UPDATE policies on `landlord_paystack_accounts` and
--     `agent_paystack_accounts` for platform admins (used by the
--     verification workflow to flip `verification_status` and stamp
--     `verified_at`).
--   * No INSERT or DELETE policies — payout accounts are still created
--     and removed exclusively by the landlord/agent-owned flows.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'platform_admin'
      and is_active = true
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Platform admins can view landlord paystack accounts"
on public.landlord_paystack_accounts;

create policy "Platform admins can view landlord paystack accounts"
on public.landlord_paystack_accounts
for select
to authenticated
using (
  public.is_platform_admin()
);

drop policy if exists "Platform admins can update landlord paystack accounts"
on public.landlord_paystack_accounts;

create policy "Platform admins can update landlord paystack accounts"
on public.landlord_paystack_accounts
for update
to authenticated
using (
  public.is_platform_admin()
)
with check (
  public.is_platform_admin()
);

drop policy if exists "Platform admins can view agent paystack accounts"
on public.agent_paystack_accounts;

create policy "Platform admins can view agent paystack accounts"
on public.agent_paystack_accounts
for select
to authenticated
using (
  public.is_platform_admin()
);

drop policy if exists "Platform admins can update agent paystack accounts"
on public.agent_paystack_accounts;

create policy "Platform admins can update agent paystack accounts"
on public.agent_paystack_accounts
for update
to authenticated
using (
  public.is_platform_admin()
)
with check (
  public.is_platform_admin()
);
