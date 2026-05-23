-- Landlord-sourced verification fee, trial support, and platform pricing extension

alter table public.platform_payment_settings
  add column if not exists landlord_processing_fee_amount integer,
  add column if not exists landlord_processing_fee_landlord_share integer,
  add column if not exists landlord_processing_fee_platform_share integer,
  add column if not exists is_landlord_processing_fee_enabled boolean not null default true,
  add column if not exists bopa_basic_annual_price_naira integer not null default 10000,
  add column if not exists bopa_pro_annual_price_naira integer not null default 25000,
  add column if not exists landlord_trial_days integer not null default 30;

update public.platform_payment_settings
set
  landlord_processing_fee_amount = coalesce(landlord_processing_fee_amount, 15000),
  landlord_processing_fee_landlord_share = coalesce(landlord_processing_fee_landlord_share, 10000),
  landlord_processing_fee_platform_share = coalesce(landlord_processing_fee_platform_share, 5000),
  is_landlord_processing_fee_enabled = coalesce(is_landlord_processing_fee_enabled, true),
  bopa_basic_annual_price_naira = coalesce(bopa_basic_annual_price_naira, 10000),
  bopa_pro_annual_price_naira = coalesce(bopa_pro_annual_price_naira, 25000),
  landlord_trial_days = coalesce(landlord_trial_days, 30)
where true;

alter table public.platform_payment_settings
  alter column landlord_processing_fee_amount set not null,
  alter column landlord_processing_fee_landlord_share set not null,
  alter column landlord_processing_fee_platform_share set not null;

alter table public.platform_payment_settings
  drop constraint if exists platform_payment_settings_landlord_split_matches_total;

alter table public.platform_payment_settings
  add constraint platform_payment_settings_landlord_split_matches_total check (
    landlord_processing_fee_amount =
      landlord_processing_fee_landlord_share + landlord_processing_fee_platform_share
  );

alter table public.platform_payment_settings
  drop constraint if exists platform_payment_settings_landlord_amounts_non_negative;

alter table public.platform_payment_settings
  add constraint platform_payment_settings_landlord_amounts_non_negative check (
    landlord_processing_fee_amount >= 0
    and landlord_processing_fee_landlord_share >= 0
    and landlord_processing_fee_platform_share >= 0
    and bopa_basic_annual_price_naira >= 0
    and bopa_pro_annual_price_naira >= 0
    and landlord_trial_days >= 0
  );

do $$ begin
  create type public.landlord_processing_fee_status as enum (
    'initialized', 'paid', 'failed', 'abandoned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.landlord_tenant_processing_fee_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  paystack_reference text not null unique,
  paystack_access_code text not null default '',
  authorization_url text not null default '',
  processing_fee_amount integer not null,
  landlord_share_amount integer not null,
  tenuro_share_amount integer not null,
  total_amount integer not null,
  currency_code text not null default 'NGN',
  idempotency_key text not null unique,
  status public.landlord_processing_fee_status not null default 'initialized',
  paystack_split_code text,
  paystack_split_id bigint,
  metadata jsonb not null default '{}'::jsonb,
  verified_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landlord_tenant_processing_fee_intents_amounts_non_negative check (
    processing_fee_amount >= 0
    and landlord_share_amount >= 0
    and tenuro_share_amount >= 0
    and total_amount >= 0
  ),
  constraint landlord_tenant_processing_fee_intents_split_matches_total check (
    total_amount = landlord_share_amount + tenuro_share_amount
  )
);

create index if not exists landlord_tenant_processing_fee_intents_tenant_idx
  on public.landlord_tenant_processing_fee_intents (tenant_id);

create index if not exists landlord_tenant_processing_fee_intents_landlord_idx
  on public.landlord_tenant_processing_fee_intents (landlord_id);

create index if not exists landlord_tenant_processing_fee_intents_status_idx
  on public.landlord_tenant_processing_fee_intents (status);

drop trigger if exists trg_landlord_tenant_processing_fee_intents_updated_at
  on public.landlord_tenant_processing_fee_intents;

create trigger trg_landlord_tenant_processing_fee_intents_updated_at
  before update on public.landlord_tenant_processing_fee_intents
  for each row
  execute function public.set_updated_at();

alter table public.tenants
  drop constraint if exists tenants_verification_fee_intent_id_fkey;

alter table public.tenants
  add column if not exists verification_fee_source text;

alter table public.tenants
  drop constraint if exists tenants_verification_fee_source_check;

alter table public.tenants
  add constraint tenants_verification_fee_source_check check (
    verification_fee_source is null
    or verification_fee_source in ('agent', 'landlord')
  );

alter table public.landlord_settings
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_expires_at timestamptz;
