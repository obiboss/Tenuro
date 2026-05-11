begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'bopa_plan_type') then
    create type public.bopa_plan_type as enum (
      'free',
      'basic',
      'pro',
      'agent'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bopa_subscription_status') then
    create type public.bopa_subscription_status as enum (
      'active',
      'trialing',
      'past_due',
      'expired',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bopa_subscription_payment_status') then
    create type public.bopa_subscription_payment_status as enum (
      'initialized',
      'pending',
      'paid',
      'failed',
      'abandoned',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bopa_public_tool_document_type') then
    create type public.bopa_public_tool_document_type as enum (
      'receipt',
      'agreement'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bopa_public_tool_document_status') then
    create type public.bopa_public_tool_document_status as enum (
      'generated',
      'claimed',
      'stored',
      'archived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'bopa_watermark_status') then
    create type public.bopa_watermark_status as enum (
      'watermarked',
      'removed'
    );
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.public_tool_leads (
  id uuid primary key default gen_random_uuid(),

  owner_profile_id uuid null references public.profiles(id) on delete set null,

  landlord_full_name text not null,
  landlord_phone_number text not null,
  landlord_email text null,

  source_tool public.bopa_public_tool_document_type not null,
  source_path text not null default '/',
  source_location text null,

  signup_status text not null default 'anonymous'
    check (signup_status in ('anonymous', 'account_created', 'attached', 'discarded')),

  lead_token_hash text null,
  lead_token_expires_at timestamptz null,

  user_agent text null,
  ip_address_hash text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz null,

  constraint public_tool_leads_phone_not_blank
    check (length(trim(landlord_phone_number)) >= 7),

  constraint public_tool_leads_name_not_blank
    check (length(trim(landlord_full_name)) >= 2)
);

create table if not exists public.public_generated_receipts (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid null references public.public_tool_leads(id) on delete set null,
  owner_profile_id uuid null references public.profiles(id) on delete set null,

  existing_property_id uuid null references public.properties(id) on delete set null,
  existing_tenant_id uuid null references public.tenants(id) on delete set null,
  existing_payment_id uuid null references public.rent_payments(id) on delete set null,

  landlord_full_name text not null,
  landlord_phone_number text not null,
  landlord_email text null,

  tenant_full_name text not null,
  tenant_phone_number text not null,

  property_name text null,
  property_address text not null,
  unit_identifier text null,
  city_state text not null,

  rent_amount numeric(19, 2) not null,
  currency_code varchar(3) not null default 'NGN',

  payment_date date not null,
  rent_period_start date not null,
  rent_period_end date not null,
  rent_duration_months integer not null,

  payment_method text not null
    check (payment_method in ('bank_transfer', 'cash', 'paystack_gateway', 'other')),

  payment_reference text null,

  receipt_number text not null,
  receipt_snapshot jsonb not null default '{}'::jsonb,

  pdf_path text null,
  watermark_status public.bopa_watermark_status not null default 'watermarked',
  document_status public.bopa_public_tool_document_status not null default 'generated',

  whatsapp_message text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz null,

  constraint public_generated_receipts_amount_positive
    check (rent_amount > 0),

  constraint public_generated_receipts_duration_positive
    check (rent_duration_months > 0),

  constraint public_generated_receipts_valid_period
    check (rent_period_end >= rent_period_start),

  constraint public_generated_receipts_landlord_name_not_blank
    check (length(trim(landlord_full_name)) >= 2),

  constraint public_generated_receipts_tenant_name_not_blank
    check (length(trim(tenant_full_name)) >= 2),

  constraint public_generated_receipts_property_address_not_blank
    check (length(trim(property_address)) >= 5)
);

create table if not exists public.public_generated_agreements (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid null references public.public_tool_leads(id) on delete set null,
  owner_profile_id uuid null references public.profiles(id) on delete set null,

  existing_property_id uuid null references public.properties(id) on delete set null,
  existing_tenant_id uuid null references public.tenants(id) on delete set null,
  existing_tenancy_id uuid null references public.tenancies(id) on delete set null,
  existing_agreement_id uuid null references public.tenancy_agreement_documents(id) on delete set null,

  landlord_full_name text not null,
  landlord_phone_number text not null,
  landlord_email text null,

  tenant_full_name text not null,
  tenant_phone_number text not null,

  property_name text null,
  property_address text not null,
  unit_identifier text null,
  city_state text not null,

  rent_amount numeric(19, 2) not null,
  currency_code varchar(3) not null default 'NGN',

  tenancy_start_date date not null,
  tenancy_end_date date not null,
  tenancy_duration_months integer not null,

  agreement_title text not null default 'Residential Tenancy Agreement',
  agreement_snapshot jsonb not null default '{}'::jsonb,

  pdf_path text null,
  watermark_status public.bopa_watermark_status not null default 'watermarked',
  document_status public.bopa_public_tool_document_status not null default 'generated',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz null,

  constraint public_generated_agreements_amount_positive
    check (rent_amount > 0),

  constraint public_generated_agreements_duration_positive
    check (tenancy_duration_months > 0),

  constraint public_generated_agreements_valid_period
    check (tenancy_end_date >= tenancy_start_date),

  constraint public_generated_agreements_landlord_name_not_blank
    check (length(trim(landlord_full_name)) >= 2),

  constraint public_generated_agreements_tenant_name_not_blank
    check (length(trim(tenant_full_name)) >= 2),

  constraint public_generated_agreements_property_address_not_blank
    check (length(trim(property_address)) >= 5)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null references public.profiles(id) on delete cascade,

  plan_type public.bopa_plan_type not null default 'free',
  status public.bopa_subscription_status not null default 'active',

  billing_period text not null default 'annual'
    check (billing_period = 'annual'),

  amount_naira numeric(19, 2) not null default 0
    check (amount_naira >= 0),

  currency_code varchar(3) not null default 'NGN',

  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz null,
  cancelled_at timestamptz null,
  last_renewed_at timestamptz null,

  paystack_customer_code text null,
  paystack_plan_code text null,
  paystack_subscription_code text null,
  latest_payment_reference text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint subscriptions_paid_plan_requires_expiry
    check (
      plan_type = 'free'
      or expires_at is not null
    ),

  constraint subscriptions_valid_expiry
    check (
      expires_at is null
      or expires_at > starts_at
    )
);

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid null references public.subscriptions(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,

  plan_type public.bopa_plan_type not null,
  status public.bopa_subscription_payment_status not null default 'initialized',

  amount_naira numeric(19, 2) not null
    check (amount_naira > 0),

  amount_kobo integer not null
    check (amount_kobo > 0),

  currency_code varchar(3) not null default 'NGN',

  billing_period text not null default 'annual'
    check (billing_period = 'annual'),

  payment_reference text not null unique,
  authorization_url text null,

  paystack_access_code text null,
  paystack_transaction_id text null,
  paystack_paid_at timestamptz null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.receipt_usage_events (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid null references public.public_tool_leads(id) on delete set null,
  receipt_id uuid null references public.public_generated_receipts(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,

  event_type text not null
    check (
      event_type in (
        'receipt_generated',
        'receipt_downloaded',
        'receipt_whatsapp_shared',
        'signup_prompt_viewed',
        'signup_started',
        'signup_completed',
        'receipt_attached_to_account'
      )
    ),

  source_path text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agreement_usage_events (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid null references public.public_tool_leads(id) on delete set null,
  agreement_id uuid null references public.public_generated_agreements(id) on delete set null,
  profile_id uuid null references public.profiles(id) on delete set null,

  event_type text not null
    check (
      event_type in (
        'agreement_generated',
        'agreement_previewed',
        'agreement_downloaded',
        'signup_prompt_viewed',
        'signup_started',
        'signup_completed',
        'agreement_attached_to_account'
      )
    ),

  source_path text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_public_tool_leads_owner_profile_id
  on public.public_tool_leads(owner_profile_id);

create index if not exists idx_public_tool_leads_phone
  on public.public_tool_leads(landlord_phone_number);

create index if not exists idx_public_tool_leads_source_tool
  on public.public_tool_leads(source_tool);

create index if not exists idx_public_tool_leads_created_at
  on public.public_tool_leads(created_at desc);

create index if not exists idx_public_generated_receipts_lead_id
  on public.public_generated_receipts(lead_id);

create index if not exists idx_public_generated_receipts_owner_profile_id
  on public.public_generated_receipts(owner_profile_id);

create index if not exists idx_public_generated_receipts_phone
  on public.public_generated_receipts(landlord_phone_number);

create index if not exists idx_public_generated_receipts_created_at
  on public.public_generated_receipts(created_at desc);

create index if not exists idx_public_generated_receipts_document_status
  on public.public_generated_receipts(document_status);

create index if not exists idx_public_generated_agreements_lead_id
  on public.public_generated_agreements(lead_id);

create index if not exists idx_public_generated_agreements_owner_profile_id
  on public.public_generated_agreements(owner_profile_id);

create index if not exists idx_public_generated_agreements_phone
  on public.public_generated_agreements(landlord_phone_number);

create index if not exists idx_public_generated_agreements_created_at
  on public.public_generated_agreements(created_at desc);

create index if not exists idx_public_generated_agreements_document_status
  on public.public_generated_agreements(document_status);

create index if not exists idx_subscriptions_profile_id
  on public.subscriptions(profile_id);

create index if not exists idx_subscriptions_status
  on public.subscriptions(status);

create index if not exists idx_subscriptions_expires_at
  on public.subscriptions(expires_at);

create unique index if not exists idx_subscriptions_one_current_per_profile
  on public.subscriptions(profile_id)
  where status in ('active', 'trialing', 'past_due');

create index if not exists idx_subscription_payments_profile_id
  on public.subscription_payments(profile_id);

create index if not exists idx_subscription_payments_subscription_id
  on public.subscription_payments(subscription_id);

create index if not exists idx_subscription_payments_status
  on public.subscription_payments(status);

create index if not exists idx_subscription_payments_created_at
  on public.subscription_payments(created_at desc);

create index if not exists idx_receipt_usage_events_profile_id
  on public.receipt_usage_events(profile_id);

create index if not exists idx_receipt_usage_events_lead_id
  on public.receipt_usage_events(lead_id);

create index if not exists idx_receipt_usage_events_receipt_id
  on public.receipt_usage_events(receipt_id);

create index if not exists idx_receipt_usage_events_event_type
  on public.receipt_usage_events(event_type);

create index if not exists idx_agreement_usage_events_profile_id
  on public.agreement_usage_events(profile_id);

create index if not exists idx_agreement_usage_events_lead_id
  on public.agreement_usage_events(lead_id);

create index if not exists idx_agreement_usage_events_agreement_id
  on public.agreement_usage_events(agreement_id);

create index if not exists idx_agreement_usage_events_event_type
  on public.agreement_usage_events(event_type);

drop trigger if exists set_public_tool_leads_updated_at on public.public_tool_leads;
create trigger set_public_tool_leads_updated_at
before update on public.public_tool_leads
for each row execute function public.set_updated_at();

drop trigger if exists set_public_generated_receipts_updated_at on public.public_generated_receipts;
create trigger set_public_generated_receipts_updated_at
before update on public.public_generated_receipts
for each row execute function public.set_updated_at();

drop trigger if exists set_public_generated_agreements_updated_at on public.public_generated_agreements;
create trigger set_public_generated_agreements_updated_at
before update on public.public_generated_agreements
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_subscription_payments_updated_at on public.subscription_payments;
create trigger set_subscription_payments_updated_at
before update on public.subscription_payments
for each row execute function public.set_updated_at();

alter table public.public_tool_leads enable row level security;
alter table public.public_generated_receipts enable row level security;
alter table public.public_generated_agreements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.receipt_usage_events enable row level security;
alter table public.agreement_usage_events enable row level security;

drop policy if exists "Public tool leads are readable by owner" on public.public_tool_leads;
create policy "Public tool leads are readable by owner"
on public.public_tool_leads
for select
to authenticated
using (owner_profile_id = auth.uid());

drop policy if exists "Public tool leads are insertable by authenticated owner" on public.public_tool_leads;
create policy "Public tool leads are insertable by authenticated owner"
on public.public_tool_leads
for insert
to authenticated
with check (owner_profile_id = auth.uid());

drop policy if exists "Public tool leads are updatable by owner" on public.public_tool_leads;
create policy "Public tool leads are updatable by owner"
on public.public_tool_leads
for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

drop policy if exists "Generated receipts are readable by owner" on public.public_generated_receipts;
create policy "Generated receipts are readable by owner"
on public.public_generated_receipts
for select
to authenticated
using (owner_profile_id = auth.uid());

drop policy if exists "Generated receipts are insertable by authenticated owner" on public.public_generated_receipts;
create policy "Generated receipts are insertable by authenticated owner"
on public.public_generated_receipts
for insert
to authenticated
with check (owner_profile_id = auth.uid());

drop policy if exists "Generated receipts are updatable by owner" on public.public_generated_receipts;
create policy "Generated receipts are updatable by owner"
on public.public_generated_receipts
for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

drop policy if exists "Generated agreements are readable by owner" on public.public_generated_agreements;
create policy "Generated agreements are readable by owner"
on public.public_generated_agreements
for select
to authenticated
using (owner_profile_id = auth.uid());

drop policy if exists "Generated agreements are insertable by authenticated owner" on public.public_generated_agreements;
create policy "Generated agreements are insertable by authenticated owner"
on public.public_generated_agreements
for insert
to authenticated
with check (owner_profile_id = auth.uid());

drop policy if exists "Generated agreements are updatable by owner" on public.public_generated_agreements;
create policy "Generated agreements are updatable by owner"
on public.public_generated_agreements
for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

drop policy if exists "Subscriptions are readable by owner" on public.subscriptions;
create policy "Subscriptions are readable by owner"
on public.subscriptions
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Subscription payments are readable by owner" on public.subscription_payments;
create policy "Subscription payments are readable by owner"
on public.subscription_payments
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Receipt usage events are readable by owner" on public.receipt_usage_events;
create policy "Receipt usage events are readable by owner"
on public.receipt_usage_events
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Receipt usage events are insertable by authenticated owner" on public.receipt_usage_events;
create policy "Receipt usage events are insertable by authenticated owner"
on public.receipt_usage_events
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "Agreement usage events are readable by owner" on public.agreement_usage_events;
create policy "Agreement usage events are readable by owner"
on public.agreement_usage_events
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Agreement usage events are insertable by authenticated owner" on public.agreement_usage_events;
create policy "Agreement usage events are insertable by authenticated owner"
on public.agreement_usage_events
for insert
to authenticated
with check (profile_id = auth.uid());

commit;