-- =====================================================================
-- Platform payment settings (singleton fee configuration)
-- =====================================================================
-- Idempotent. Safe to re-run.
-- Depends on: is_platform_admin() from platform_admin_foundation migration.
-- =====================================================================

create table if not exists public.platform_payment_settings (
  id uuid primary key default gen_random_uuid(),
  agent_processing_fee_amount integer not null,
  agent_processing_fee_agent_share integer not null,
  agent_processing_fee_platform_share integer not null,
  is_agent_processing_fee_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_payment_settings_amounts_non_negative check (
    agent_processing_fee_amount >= 0
    and agent_processing_fee_agent_share >= 0
    and agent_processing_fee_platform_share >= 0
  ),
  constraint platform_payment_settings_split_matches_total check (
    agent_processing_fee_amount =
      agent_processing_fee_agent_share + agent_processing_fee_platform_share
  )
);

create unique index if not exists platform_payment_settings_singleton_idx
  on public.platform_payment_settings ((true));

insert into public.platform_payment_settings (
  agent_processing_fee_amount,
  agent_processing_fee_agent_share,
  agent_processing_fee_platform_share,
  is_agent_processing_fee_enabled
)
select 15000, 10000, 5000, true
where not exists (
  select 1
  from public.platform_payment_settings
);

drop trigger if exists trg_platform_payment_settings_updated_at
  on public.platform_payment_settings;

create trigger trg_platform_payment_settings_updated_at
  before update on public.platform_payment_settings
  for each row
  execute function public.set_updated_at();

alter table public.platform_payment_settings enable row level security;

drop policy if exists "Platform admins can view platform payment settings"
  on public.platform_payment_settings;

create policy "Platform admins can view platform payment settings"
  on public.platform_payment_settings
  for select
  to authenticated
  using (
    public.is_platform_admin()
  );

drop policy if exists "Platform admins can update platform payment settings"
  on public.platform_payment_settings;

create policy "Platform admins can update platform payment settings"
  on public.platform_payment_settings
  for update
  to authenticated
  using (
    public.is_platform_admin()
  )
  with check (
    public.is_platform_admin()
  );
