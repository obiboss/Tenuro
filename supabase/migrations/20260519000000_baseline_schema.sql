-- =====================================================================
-- Baseline schema snapshot for tenuro
-- Source: live Supabase database, captured 2026-05-19
-- =====================================================================
--
-- This file is the single source of truth for the database schema. It
-- was rebuilt from a direct dump of the live production database and
-- supersedes every prior migration file in this directory.
--
-- IMPORTANT
--   * The legacy file `20260511090715_lead_generation_subscriptions.sql`
--     has been deleted because its enum definitions diverged from the
--     live database and would corrupt fresh environments if replayed.
--   * The remote Supabase project does NOT track migrations through
--     `supabase_migrations.schema_migrations`. Apply this file with
--     `supabase db reset --linked` only against EMPTY databases, or
--     run it manually inside the SQL editor.
--   * Every block is written to be idempotent: enums use
--     `do $$ ... exception when duplicate_object end $$`, tables use
--     `if not exists`, functions use `create or replace`, triggers and
--     policies are guarded with `drop ... if exists` first.
--
-- Known live-database technical debt that this file replicates verbatim
-- (do not "fix" without coordinated migration work):
--   * `tenancies.status` AND `tenancies.tenancy_status` coexist; reads
--     should prefer `tenancy_status` (see `src/server/services/*`).
--   * `tenant_ledger` and `ledger_entries` are written in parallel by
--     different services; reconciliation is pending.
--   * Duplicate triggers exist for tenancy reference generation and
--     several `updated_at` columns. Both copies fire on the live db.
--   * `rent_payments.amount_kobo` does not exist; rent amounts are
--     stored as `numeric(12,2)` in `amount_paid`. Only gateway intents
--     and subscriptions use kobo.
--   * `agent_paystack_accounts_test_backup_20260518` and
--     `landlord_paystack_accounts_test_backup_20260518` are point-in-
--     time backups kept for rollback purposes.
--   * `otp_store` / `otp_delivery_logs` are present but unused by code
--     (legacy phone-OTP login flow superseded by Supabase Auth magic
--     links). Retained because RPCs still reference them.
--
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------

create extension if not exists "pgcrypto" with schema "public";
create extension if not exists "uuid-ossp" with schema "public";
create extension if not exists "pg_trgm" with schema "public";
create extension if not exists "citext" with schema "public";

-- ---------------------------------------------------------------------
-- 2. Enums (42 total, values match live database exactly)
-- ---------------------------------------------------------------------

do $$ begin
  create type public.agent_processing_fee_status as enum (
    'initialized', 'paid', 'failed', 'abandoned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_plan_type as enum (
    'free', 'basic', 'pro', 'agent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_public_tool_document_status as enum (
    'generated', 'claimed', 'stored', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_public_tool_document_type as enum (
    'receipt', 'agreement'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_subscription_payment_status as enum (
    'initialized', 'pending', 'paid', 'failed', 'abandoned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_subscription_status as enum (
    'active', 'trialing', 'past_due', 'expired', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bopa_watermark_status as enum (
    'watermarked', 'removed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.debt_category as enum (
    'rent_arrears', 'utility_charges', 'maintenance_charges',
    'penalty', 'administrative_fee', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gateway_payment_status as enum (
    'initialized', 'paid', 'failed', 'abandoned', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.id_type as enum (
    'nin', 'passport', 'drivers_license', 'voters_card'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.landlord_charge_status as enum (
    'draft', 'active', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.landlord_charge_type as enum (
    'agreement_fee', 'caution_deposit', 'damages_deposit',
    'service_charge', 'legal_fee', 'documentation_fee', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_direction as enum ('debit', 'credit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'rent_charge', 'payment', 'payment_reversal', 'adjustment',
    'administrative_fee', 'penalty', 'utility', 'opening_balance'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum (
    'whatsapp', 'sms', 'email', 'in_app'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum (
    'pending', 'sent', 'delivered', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'rent_due', 'overdue', 'receipt', 'onboarding_invite',
    'renewal_notice', 'increment_notice', 'balance_confirmation', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opening_balance_status as enum (
    'pending_tenant_confirmation', 'confirmed', 'disputed', 'resolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opening_balance_type as enum (
    'clear', 'owing', 'disputed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.otp_delivery_channel as enum ('whatsapp', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.otp_delivery_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.otp_purpose as enum (
    'login', 'register', 'device_verification', 'session_expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_frequency as enum (
    'monthly', 'quarterly', 'biannual', 'annual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum (
    'paystack_gateway', 'bank_transfer', 'cash', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_rule_applies_to as enum (
    'all_tenants', 'new_tenants', 'renewing_tenants'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_rule_category as enum (
    'occupancy', 'pets', 'payment', 'noise', 'business_use',
    'maintenance', 'safety', 'documentation', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_rule_enforcement as enum (
    'information_only', 'landlord_review', 'blocks_onboarding'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_rule_status as enum (
    'active', 'inactive', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum (
    'residential_compound', 'flat_complex', 'mixed_use', 'residential'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quit_notice_delivery_method as enum (
    'whatsapp', 'email', 'hand_delivery', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quit_notice_status as enum (
    'draft', 'issued', 'delivered', 'acknowledged', 'expired', 'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quit_notice_type as enum (
    'landlord_quit_notice', 'tenant_intent_to_vacate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.receipt_status as enum (
    'pending', 'generated', 'failed', 'voided'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.renewal_decision as enum (
    'renew', 'issue_quit_notice', 'pending'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rent_payment_method as enum (
    'paystack_gateway', 'bank_transfer', 'cash', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rent_payment_status as enum ('posted', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenancy_status as enum (
    'active', 'expired', 'terminated', 'pending_renewal',
    'notice_given', 'hold', 'special_case', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tenant_onboarding_status as enum (
    'invited', 'profile_complete', 'approved', 'rejected', 'token_expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_status as enum (
    'vacant', 'occupied', 'under_renovation', 'hold',
    'pending_vacancy', 'archived', 'reserved', 'unavailable'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_type as enum (
    'room', 'flat', 'duplex', 'shop', 'other',
    'single_room', 'self_contain', 'room_and_parlour', 'mini_flat',
    'two_bedroom_flat', 'three_bedroom_flat', 'office_space'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum (
    'landlord', 'tenant', 'caretaker', 'agent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_processing_status as enum (
    'pending', 'processed', 'failed', 'ignored'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 3. Shared trigger functions (declared up-front so tables can attach)
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Tables (ordered by FK dependency)
-- ---------------------------------------------------------------------

-- 4.1 profiles ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone_number text,
  full_name text,
  role public.user_role not null default 'landlord',
  business_name text,
  business_address text,
  business_email text,
  business_phone text,
  business_logo_path text,
  is_active boolean not null default true,
  onboarding_completed_at timestamptz,
  last_login_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 4.2 landlord_settings ------------------------------------------------
create table if not exists public.landlord_settings (
  landlord_id uuid primary key references public.profiles(id) on delete cascade,
  default_payment_frequency public.payment_frequency not null default 'annual',
  default_notice_period_days integer not null default 90,
  default_rent_due_day integer not null default 1
    check (default_rent_due_day between 1 and 31),
  default_anchor_month integer
    check (default_anchor_month is null or default_anchor_month between 1 and 12),
  auto_renew_tenancies boolean not null default false,
  send_renewal_reminders boolean not null default true,
  send_overdue_reminders boolean not null default true,
  receipt_signature_path text,
  receipt_footer_text text,
  agreement_signature_path text,
  agreement_footer_text text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.3 properties -------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  property_type public.property_type not null default 'residential',
  address_line text not null,
  city text,
  state text,
  country text not null default 'NG',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 4.4 blocks -----------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (property_id, id)
);

-- 4.5 units ------------------------------------------------------------
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  block_id uuid,
  unit_identifier text not null,
  unit_type public.unit_type not null default 'other',
  status public.unit_status not null default 'vacant',
  building_name text check (building_name is null or length(building_name) <= 100),
  bedrooms integer not null default 0 check (bedrooms >= 0),
  bathrooms integer not null default 0 check (bathrooms >= 0),
  square_meters numeric(10,2),
  monthly_rent numeric(12,2) check (monthly_rent is null or monthly_rent >= 0),
  annual_rent numeric(12,2) check (annual_rent is null or annual_rent >= 0),
  amenities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (property_id, unit_identifier),
  constraint units_block_belongs_to_property
    foreign key (property_id, block_id) references public.blocks(property_id, id)
    deferrable initially deferred
);

-- 4.6 agent_profiles ---------------------------------------------------
create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  agency_name text,
  agency_address text,
  agency_phone text,
  agency_email text,
  about text,
  default_processing_fee_percent numeric(5,2) not null default 0
    check (default_processing_fee_percent >= 0 and default_processing_fee_percent <= 100),
  is_verified boolean not null default false,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.7 agent_property_listings -----------------------------------------
create table if not exists public.agent_property_listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  landlord_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  description text,
  asking_rent numeric(12,2) check (asking_rent is null or asking_rent >= 0),
  processing_fee_percent numeric(5,2) not null default 0
    check (processing_fee_percent >= 0 and processing_fee_percent <= 100),
  processing_fee_amount numeric(12,2) check (processing_fee_amount is null or processing_fee_amount >= 0),
  status text not null default 'active',
  published_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.8 tenants ----------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  unit_id uuid not null references public.units(id) on delete restrict,
  invited_by_agent_id uuid references public.profiles(id) on delete set null,
  agent_property_listing_id uuid references public.agent_property_listings(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone_number text not null,
  alt_phone_number text,
  date_of_birth date,
  gender text,
  occupation text,
  employer_name text,
  monthly_income numeric(12,2),
  id_type public.id_type,
  id_number text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,
  next_of_kin_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  emergency_contact_address text,
  onboarding_status public.tenant_onboarding_status not null default 'invited',
  onboarding_token_hash text unique,
  onboarding_token_expires_at timestamptz,
  onboarding_token_used_at timestamptz,
  onboarding_completed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  kyc_status text not null default 'pending',
  kyc_answers jsonb not null default '{}'::jsonb,
  kyc_documents jsonb not null default '[]'::jsonb,
  kyc_review_flags jsonb not null default '{}'::jsonb,
  kyc_reviewed_at timestamptz,
  kyc_reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenants_email_format
    check (email is null or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint tenants_phone_not_empty
    check (char_length(trim(phone_number)) >= 7)
);

-- 4.9 tenancies --------------------------------------------------------
-- NOTE: keeps both `status` (legacy text default 'active') and
-- `tenancy_status` (enum, authoritative) per live schema.
create table if not exists public.tenancies (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  tenancy_reference text unique,
  rent_amount numeric(12,2) not null default 0 check (rent_amount >= 0),
  rent_frequency public.payment_frequency not null default 'annual',
  rent_due_day integer not null default 1 check (rent_due_day between 1 and 31),
  rent_anchor_month integer
    check (rent_anchor_month is null or rent_anchor_month between 1 and 12),
  administrative_fee numeric(12,2) not null default 0 check (administrative_fee >= 0),
  notice_period_days integer not null default 90 check (notice_period_days >= 0),
  move_in_date date not null,
  move_out_date date,
  current_period_start date,
  current_period_end date,
  next_due_date date,
  next_charge_date date,
  status text not null default 'active',
  tenancy_status public.tenancy_status not null default 'active',
  renewal_decision public.renewal_decision,
  special_case_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenancies_current_period_check
    check (current_period_start is null or current_period_end is null
           or current_period_end >= current_period_start),
  constraint tenancies_move_dates_valid
    check (move_out_date is null or move_out_date >= move_in_date),
  constraint tenancies_special_case_reason_required
    check (tenancy_status not in ('special_case', 'hold')
           or nullif(trim(coalesce(special_case_reason, '')), '') is not null)
);

-- 4.10 tenancy_counters -----------------------------------------------
create table if not exists public.tenancy_counters (
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  reference_year integer not null,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (landlord_id, reference_year)
);

-- 4.11 tenancy_balance_locks ------------------------------------------
create table if not exists public.tenancy_balance_locks (
  tenancy_id uuid primary key references public.tenancies(id) on delete cascade,
  last_sequence integer not null default 0,
  last_balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- 4.12 rent_payments --------------------------------------------------
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  receipt_number text unique,
  amount_paid numeric(12,2) not null check (amount_paid > 0),
  expected_period_amount numeric(12,2) not null default 0 check (expected_period_amount >= 0),
  payment_method public.payment_method not null,
  payment_reference text,
  payment_date date not null default current_date,
  payment_for_period_start date,
  payment_for_period_end date,
  status public.rent_payment_status not null default 'posted',
  verified_by_landlord boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  recorded_by_role public.user_role,
  created_by uuid references public.profiles(id) on delete set null,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete set null,
  reversal_reason text,
  reversal_of_payment_id uuid references public.rent_payments(id) on delete restrict,
  idempotency_key text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_payments_period_valid
    check (payment_for_period_start is null or payment_for_period_end is null
           or payment_for_period_end >= payment_for_period_start),
  constraint rent_payments_verified_at_valid
    check (verified_by_landlord = false or verified_at is not null),
  constraint rent_payments_unique_idempotency unique (landlord_id, idempotency_key)
);

-- 4.13 ledger_entries -------------------------------------------------
-- NOTE: writes happen in parallel with `tenant_ledger`. Reconciliation
-- is on the roadmap; do NOT remove either table yet.
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete restrict,
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  entry_sequence integer not null,
  entry_type public.ledger_entry_type not null,
  direction public.ledger_direction not null,
  amount numeric(14,2) not null check (amount <> 0),
  running_balance numeric(14,2),
  period_start date,
  period_end date,
  reference_payment_id uuid references public.rent_payments(id) on delete restrict,
  reversal_of_ledger_id uuid references public.ledger_entries(id) on delete restrict,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenancy_id, entry_sequence)
);

-- 4.14 tenant_ledger --------------------------------------------------
create table if not exists public.tenant_ledger (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  entry_sequence integer not null,
  entry_type public.ledger_entry_type not null,
  direction public.ledger_direction not null,
  amount numeric(14,2) not null check (amount <> 0),
  running_balance numeric(14,2),
  period_start date,
  period_end date,
  reference_payment_id uuid references public.rent_payments(id) on delete restrict,
  reversal_of_ledger_id uuid references public.tenant_ledger(id) on delete restrict,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenancy_id, entry_sequence),
  constraint tenant_ledger_reversal_requires_original
    check (entry_type <> 'payment_reversal' or reversal_of_ledger_id is not null)
);

-- 4.15 receipts -------------------------------------------------------
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rent_payment_id uuid not null references public.rent_payments(id) on delete cascade,
  receipt_number text not null unique,
  status public.receipt_status not null default 'pending',
  pdf_path text,
  pdf_size_bytes integer,
  pdf_generated_at timestamptz,
  void_reason text,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.16 receipt_counters -----------------------------------------------
create table if not exists public.receipt_counters (
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  reference_year integer not null,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (landlord_id, reference_year)
);

-- 4.17 notifications --------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  notification_type public.notification_type not null,
  channel public.notification_channel not null,
  status public.notification_status not null default 'pending',
  recipient text not null,
  subject text,
  body text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  external_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.18 quit_notices ---------------------------------------------------
create table if not exists public.quit_notices (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  notice_type public.quit_notice_type not null default 'landlord_quit_notice',
  status public.quit_notice_status not null default 'draft',
  delivery_method public.quit_notice_delivery_method,
  issued_at timestamptz,
  effective_date date,
  reason text,
  notes text,
  pdf_path text,
  pdf_generated_at timestamptz,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.19 renewal_queue --------------------------------------------------
create table if not exists public.renewal_queue (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  due_date date not null,
  notice_window_starts_at date,
  decision public.renewal_decision,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  new_rent_amount numeric(12,2),
  new_period_end date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.20 opening_balance_declarations -----------------------------------
create table if not exists public.opening_balance_declarations (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  balance_type public.opening_balance_type not null,
  status public.opening_balance_status not null default 'pending_tenant_confirmation',
  amount_outstanding numeric(12,2) not null default 0,
  reference_period_start date,
  reference_period_end date,
  declared_at timestamptz not null default now(),
  declared_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.21 debt_breakdown -------------------------------------------------
create table if not exists public.debt_breakdown (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  category public.debt_category not null,
  amount numeric(12,2) not null default 0,
  description text,
  created_at timestamptz not null default now()
);

-- 4.22 guarantors -----------------------------------------------------
create table if not exists public.guarantors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  phone_number text,
  email text,
  relationship text,
  address text,
  occupation text,
  id_type public.id_type,
  id_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.23 tenant_activation_tokens ---------------------------------------
create table if not exists public.tenant_activation_tokens (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 4.24 tenancy_agreement_documents ------------------------------------
create table if not exists public.tenancy_agreement_documents (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tenancy_id uuid not null unique references public.tenancies(id) on delete cascade,
  document_status text not null default 'draft'
    check (document_status in ('draft','finalized','sent_to_tenant','accepted','voided')),
  pdf_path text,
  pdf_generated_at timestamptz,
  finalized_at timestamptz,
  finalized_by uuid references public.profiles(id),
  sent_to_tenant_at timestamptz,
  accepted_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  agreement_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.25 landlord_tenancy_charges ---------------------------------------
create table if not exists public.landlord_tenancy_charges (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  tenancy_id uuid references public.tenancies(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  charge_type public.landlord_charge_type not null,
  status public.landlord_charge_status not null default 'active',
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  is_recurring boolean not null default false,
  recurrence_frequency public.payment_frequency,
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.26 property_rules -------------------------------------------------
create table if not exists public.property_rules (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  title text not null,
  body text not null,
  category public.property_rule_category not null default 'other',
  applies_to public.property_rule_applies_to not null default 'all_tenants',
  enforcement public.property_rule_enforcement not null default 'information_only',
  status public.property_rule_status not null default 'active',
  priority integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.27 caretaker_assignments ------------------------------------------
create table if not exists public.caretaker_assignments (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  caretaker_profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caretaker_profile_id, property_id)
);

-- 4.28 landlord_paystack_accounts -------------------------------------
create table if not exists public.landlord_paystack_accounts (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  bank_code text not null,
  bank_name text,
  account_number text not null,
  account_name text,
  paystack_subaccount_code text,
  paystack_subaccount_id text,
  percentage_charge numeric(5,2) not null default 0
    check (percentage_charge >= 0 and percentage_charge <= 100),
  settlement_bank_code text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  verified_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.29 agent_paystack_accounts ----------------------------------------
create table if not exists public.agent_paystack_accounts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  bank_code text not null,
  bank_name text,
  account_number text not null,
  account_name text,
  paystack_subaccount_code text,
  paystack_subaccount_id text,
  percentage_charge numeric(5,2) not null default 0
    check (percentage_charge >= 0 and percentage_charge <= 100),
  settlement_bank_code text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  verified_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.30 gateway_payment_intents ----------------------------------------
create table if not exists public.gateway_payment_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  access_code text,
  authorization_url text,
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status public.gateway_payment_status not null default 'initialized',
  channel text,
  fee_split jsonb not null default '{}'::jsonb,
  paystack_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  failed_at timestamptz,
  abandoned_at timestamptz,
  cancelled_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.31 gateway_payment_events -----------------------------------------
create table if not exists public.gateway_payment_events (
  id uuid primary key default gen_random_uuid(),
  reference text,
  event_type text not null,
  signature text,
  signature_valid boolean,
  raw_payload jsonb not null,
  processing_status public.webhook_processing_status not null default 'pending',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

-- 4.32 payment_webhook_events -----------------------------------------
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  external_event_id text not null unique,
  rent_payment_id uuid references public.rent_payments(id) on delete set null,
  event_type text not null,
  raw_payload jsonb not null,
  processing_status public.webhook_processing_status not null default 'pending',
  processed_at timestamptz,
  error_message text,
  received_at timestamptz not null default now()
);

-- 4.33 app_fee_payment_intents ----------------------------------------
create table if not exists public.app_fee_payment_intents (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  rent_payment_id uuid references public.rent_payments(id) on delete set null,
  reference text not null unique,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status public.gateway_payment_status not null default 'initialized',
  paystack_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.34 payment_allocations --------------------------------------------
create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.gateway_payment_intents(id) on delete cascade,
  rent_payment_id uuid references public.rent_payments(id) on delete set null,
  landlord_id uuid references public.profiles(id) on delete set null,
  agent_id uuid references public.profiles(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  agent_property_listing_id uuid references public.agent_property_listings(id) on delete set null,
  allocation_kind text not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  status text not null default 'pending',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.35 agent_tenant_processing_fee_intents ----------------------------
create table if not exists public.agent_tenant_processing_fee_intents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_property_listing_id uuid references public.agent_property_listings(id) on delete set null,
  reference text not null unique,
  amount_kobo bigint not null check (amount_kobo > 0),
  status public.agent_processing_fee_status not null default 'initialized',
  paystack_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.36 subscriptions --------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_type public.bopa_plan_type not null default 'free',
  status public.bopa_subscription_status not null default 'active',
  amount_naira numeric(12,2) not null default 0 check (amount_naira >= 0),
  billing_period text not null default 'annual' check (billing_period = 'annual'),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_paid_plan_requires_expiry
    check (plan_type = 'free' or expires_at is not null),
  constraint subscriptions_valid_expiry
    check (expires_at is null or expires_at > starts_at)
);

-- 4.37 subscription_payments ------------------------------------------
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan_type public.bopa_plan_type not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  amount_naira numeric(12,2) not null check (amount_naira > 0),
  billing_period text not null default 'annual' check (billing_period = 'annual'),
  payment_reference text not null unique,
  status public.bopa_subscription_payment_status not null default 'initialized',
  paystack_response jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.38 public_tool_leads ----------------------------------------------
create table if not exists public.public_tool_leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  source_tool public.bopa_public_tool_document_type not null,
  email text,
  phone_number text,
  full_name text,
  business_name text,
  business_address text,
  consented_at timestamptz,
  utm jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.39 public_generated_agreements ------------------------------------
create table if not exists public.public_generated_agreements (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.public_tool_leads(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  agreement_document_id uuid references public.tenancy_agreement_documents(id) on delete set null,
  watermark_status public.bopa_watermark_status not null default 'watermarked',
  document_status public.bopa_public_tool_document_status not null default 'generated',
  agreement_payload jsonb not null default '{}'::jsonb,
  pdf_path text,
  pdf_generated_at timestamptz,
  claimed_at timestamptz,
  stored_at timestamptz,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.40 public_generated_receipts --------------------------------------
create table if not exists public.public_generated_receipts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.public_tool_leads(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  rent_payment_id uuid references public.rent_payments(id) on delete set null,
  watermark_status public.bopa_watermark_status not null default 'watermarked',
  document_status public.bopa_public_tool_document_status not null default 'generated',
  receipt_payload jsonb not null default '{}'::jsonb,
  pdf_path text,
  pdf_generated_at timestamptz,
  claimed_at timestamptz,
  stored_at timestamptz,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.41 agreement_usage_events ----------------------------------------
create table if not exists public.agreement_usage_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.public_tool_leads(id) on delete set null,
  agreement_id uuid references public.public_generated_agreements(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4.42 receipt_usage_events ------------------------------------------
create table if not exists public.receipt_usage_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.public_tool_leads(id) on delete set null,
  receipt_id uuid references public.public_generated_receipts(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4.43 audit_log (singular) -------------------------------------------
-- NOTE: Two audit tables exist in live (`audit_log` and `audit_logs`).
-- `audit_log` is written by trigger-level `audit_row_changes`; the
-- application-level `audit_logs` is written by services via
-- `src/server/services/audit-log.service.ts`. Both must remain.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  table_name text not null,
  operation text not null,
  row_id text,
  diff jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

-- 4.44 audit_logs (application-level) ---------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  entity_type text not null,
  entity_id text,
  action text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  request_id text,
  created_at timestamptz not null default now()
);

-- 4.45 otp_store -------------------------------------------------------
-- LEGACY: phone-OTP login path retired in favour of Supabase Auth magic
-- links. Retained because RPC `increment_otp_attempts` references it.
create table if not exists public.otp_store (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  purpose public.otp_purpose not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4.46 otp_delivery_logs ----------------------------------------------
create table if not exists public.otp_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  otp_id uuid references public.otp_store(id) on delete cascade,
  channel public.otp_delivery_channel not null,
  status public.otp_delivery_status not null default 'pending',
  recipient text not null,
  external_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

-- 4.47 / 4.48 point-in-time backups (kept for rollback) ---------------
create table if not exists public.agent_paystack_accounts_test_backup_20260518
  (like public.agent_paystack_accounts including defaults);

create table if not exists public.landlord_paystack_accounts_test_backup_20260518
  (like public.landlord_paystack_accounts including defaults);

-- ---------------------------------------------------------------------
-- 5. Indexes (only ones not auto-created by PK/UNIQUE constraints)
-- ---------------------------------------------------------------------

-- properties
create index if not exists properties_landlord_idx
  on public.properties (landlord_id) where deleted_at is null;

-- blocks
create index if not exists blocks_property_idx
  on public.blocks (property_id) where deleted_at is null;

-- units
create index if not exists units_block_idx
  on public.units (block_id) where block_id is not null and deleted_at is null;
create index if not exists units_property_status_idx
  on public.units (property_id, status) where deleted_at is null;

-- tenants
create index if not exists tenants_landlord_idx
  on public.tenants (landlord_id) where deleted_at is null;
create index if not exists tenants_unit_idx
  on public.tenants (unit_id) where deleted_at is null;
create index if not exists tenants_profile_idx
  on public.tenants (profile_id) where profile_id is not null and deleted_at is null;
create index if not exists tenants_invited_by_agent_id_idx
  on public.tenants (invited_by_agent_id);
create index if not exists tenants_agent_property_listing_id_idx
  on public.tenants (agent_property_listing_id);
create index if not exists tenants_onboarding_token_hash_idx
  on public.tenants (onboarding_token_hash)
  where onboarding_token_hash is not null and onboarding_token_used_at is null;
create index if not exists tenants_kyc_answers_gin_idx
  on public.tenants using gin (kyc_answers);
create index if not exists tenants_kyc_review_flags_gin_idx
  on public.tenants using gin (kyc_review_flags);

-- tenancies
create index if not exists tenancies_landlord_idx
  on public.tenancies (landlord_id) where deleted_at is null;
create index if not exists tenancies_tenant_idx
  on public.tenancies (tenant_id) where deleted_at is null;
create index if not exists tenancies_unit_idx
  on public.tenancies (unit_id) where deleted_at is null;
create index if not exists tenancies_status_idx
  on public.tenancies (tenancy_status) where deleted_at is null;
create index if not exists tenancies_next_due_date_idx
  on public.tenancies (next_due_date) where next_due_date is not null and deleted_at is null;

-- rent_payments
create index if not exists rent_payments_landlord_idx on public.rent_payments (landlord_id);
create index if not exists rent_payments_tenancy_idx on public.rent_payments (tenancy_id);
create index if not exists rent_payments_tenant_idx on public.rent_payments (tenant_id);
create index if not exists rent_payments_payment_date_idx on public.rent_payments (payment_date);

-- ledger_entries
create index if not exists ledger_entries_tenancy_seq_idx
  on public.ledger_entries (tenancy_id, entry_sequence);
create index if not exists ledger_entries_tenant_idx on public.ledger_entries (tenant_id);
create index if not exists ledger_entries_landlord_idx on public.ledger_entries (landlord_id);
create index if not exists ledger_entries_reference_payment_idx
  on public.ledger_entries (reference_payment_id) where reference_payment_id is not null;

-- tenant_ledger
create index if not exists tenant_ledger_tenancy_seq_idx
  on public.tenant_ledger (tenancy_id, entry_sequence);
create index if not exists tenant_ledger_tenant_idx on public.tenant_ledger (tenant_id);

-- receipts
create index if not exists receipts_landlord_idx on public.receipts (landlord_id);
create index if not exists receipts_tenancy_idx on public.receipts (tenancy_id);
create index if not exists receipts_tenant_idx on public.receipts (tenant_id);
create index if not exists receipts_rent_payment_idx on public.receipts (rent_payment_id);

-- notifications
create index if not exists notifications_landlord_idx on public.notifications (landlord_id);
create index if not exists notifications_tenant_idx
  on public.notifications (tenant_id) where tenant_id is not null;
create index if not exists notifications_status_idx on public.notifications (status);

-- quit_notices
create index if not exists quit_notices_landlord_idx on public.quit_notices (landlord_id);
create index if not exists quit_notices_tenancy_idx on public.quit_notices (tenancy_id);
create index if not exists quit_notices_tenant_idx on public.quit_notices (tenant_id);
create index if not exists quit_notices_status_idx on public.quit_notices (status);

-- renewal_queue
create index if not exists renewal_queue_landlord_idx on public.renewal_queue (landlord_id);
create index if not exists renewal_queue_tenancy_idx on public.renewal_queue (tenancy_id);
create index if not exists renewal_queue_due_date_idx on public.renewal_queue (due_date);

-- opening_balance_declarations
create index if not exists opening_balance_declarations_landlord_idx
  on public.opening_balance_declarations (landlord_id);
create index if not exists opening_balance_declarations_tenancy_idx
  on public.opening_balance_declarations (tenancy_id);

-- debt_breakdown
create index if not exists debt_breakdown_tenancy_idx on public.debt_breakdown (tenancy_id);

-- guarantors
create index if not exists guarantors_tenant_idx on public.guarantors (tenant_id);

-- tenant_activation_tokens
create index if not exists tenant_activation_tokens_landlord_idx
  on public.tenant_activation_tokens (landlord_id);
create index if not exists tenant_activation_tokens_tenant_idx
  on public.tenant_activation_tokens (tenant_id);

-- tenancy_agreement_documents
create index if not exists tenancy_agreement_documents_landlord_idx
  on public.tenancy_agreement_documents (landlord_id);
create index if not exists tenancy_agreement_documents_tenant_idx
  on public.tenancy_agreement_documents (tenant_id);

-- landlord_tenancy_charges
create index if not exists landlord_tenancy_charges_landlord_idx
  on public.landlord_tenancy_charges (landlord_id);
create index if not exists landlord_tenancy_charges_tenant_idx
  on public.landlord_tenancy_charges (tenant_id) where tenant_id is not null;
create index if not exists landlord_tenancy_charges_tenancy_idx
  on public.landlord_tenancy_charges (tenancy_id) where tenancy_id is not null;
create index if not exists landlord_tenancy_charges_status_idx
  on public.landlord_tenancy_charges (status);

-- property_rules
create index if not exists property_rules_landlord_idx on public.property_rules (landlord_id);
create index if not exists property_rules_property_idx
  on public.property_rules (property_id) where property_id is not null;
create index if not exists property_rules_unit_idx
  on public.property_rules (unit_id) where unit_id is not null;

-- caretaker_assignments
create index if not exists caretaker_assignments_landlord_idx
  on public.caretaker_assignments (landlord_id);
create index if not exists caretaker_assignments_property_idx
  on public.caretaker_assignments (property_id);

-- agent_paystack_accounts / landlord_paystack_accounts
create index if not exists landlord_paystack_accounts_active_idx
  on public.landlord_paystack_accounts (is_active) where is_active = true;
create index if not exists agent_paystack_accounts_active_idx
  on public.agent_paystack_accounts (is_active) where is_active = true;

-- gateway_payment_intents
create index if not exists gateway_payment_intents_landlord_idx
  on public.gateway_payment_intents (landlord_id);
create index if not exists gateway_payment_intents_tenancy_idx
  on public.gateway_payment_intents (tenancy_id) where tenancy_id is not null;
create index if not exists gateway_payment_intents_status_idx
  on public.gateway_payment_intents (status);

-- gateway_payment_events
create index if not exists gateway_payment_events_reference_idx
  on public.gateway_payment_events (reference);
create index if not exists gateway_payment_events_processing_status_idx
  on public.gateway_payment_events (processing_status);

-- payment_webhook_events
create index if not exists payment_webhook_events_rent_payment_idx
  on public.payment_webhook_events (rent_payment_id) where rent_payment_id is not null;
create index if not exists payment_webhook_events_processing_status_idx
  on public.payment_webhook_events (processing_status);

-- app_fee_payment_intents
create index if not exists app_fee_payment_intents_landlord_idx
  on public.app_fee_payment_intents (landlord_id);
create index if not exists app_fee_payment_intents_rent_payment_idx
  on public.app_fee_payment_intents (rent_payment_id) where rent_payment_id is not null;
create index if not exists app_fee_payment_intents_status_idx
  on public.app_fee_payment_intents (status);

-- payment_allocations
create index if not exists payment_allocations_intent_idx
  on public.payment_allocations (intent_id);
create index if not exists payment_allocations_rent_payment_idx
  on public.payment_allocations (rent_payment_id) where rent_payment_id is not null;
create index if not exists payment_allocations_landlord_idx
  on public.payment_allocations (landlord_id) where landlord_id is not null;
create index if not exists payment_allocations_agent_idx
  on public.payment_allocations (agent_id) where agent_id is not null;

-- agent_tenant_processing_fee_intents
create index if not exists agent_tenant_processing_fee_intents_agent_idx
  on public.agent_tenant_processing_fee_intents (agent_id);
create index if not exists agent_tenant_processing_fee_intents_tenant_idx
  on public.agent_tenant_processing_fee_intents (tenant_id);
create index if not exists agent_tenant_processing_fee_intents_status_idx
  on public.agent_tenant_processing_fee_intents (status);

-- subscriptions
create index if not exists subscriptions_profile_idx on public.subscriptions (profile_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- subscription_payments
create index if not exists subscription_payments_profile_idx
  on public.subscription_payments (profile_id);
create index if not exists subscription_payments_status_idx
  on public.subscription_payments (status);

-- public_tool_leads
create index if not exists public_tool_leads_source_idx
  on public.public_tool_leads (source_tool);
create index if not exists public_tool_leads_profile_idx
  on public.public_tool_leads (profile_id) where profile_id is not null;

-- public_generated_agreements
create index if not exists public_generated_agreements_lead_idx
  on public.public_generated_agreements (lead_id) where lead_id is not null;
create index if not exists public_generated_agreements_profile_idx
  on public.public_generated_agreements (profile_id) where profile_id is not null;
create index if not exists public_generated_agreements_status_idx
  on public.public_generated_agreements (document_status);

-- public_generated_receipts
create index if not exists public_generated_receipts_lead_idx
  on public.public_generated_receipts (lead_id) where lead_id is not null;
create index if not exists public_generated_receipts_profile_idx
  on public.public_generated_receipts (profile_id) where profile_id is not null;
create index if not exists public_generated_receipts_status_idx
  on public.public_generated_receipts (document_status);

-- agreement_usage_events / receipt_usage_events
create index if not exists agreement_usage_events_lead_idx
  on public.agreement_usage_events (lead_id) where lead_id is not null;
create index if not exists agreement_usage_events_agreement_idx
  on public.agreement_usage_events (agreement_id) where agreement_id is not null;
create index if not exists receipt_usage_events_lead_idx
  on public.receipt_usage_events (lead_id) where lead_id is not null;
create index if not exists receipt_usage_events_receipt_idx
  on public.receipt_usage_events (receipt_id) where receipt_id is not null;

-- audit_log / audit_logs
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id) where actor_id is not null;
create index if not exists audit_log_table_idx on public.audit_log (table_name);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id) where actor_id is not null;
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_tenant_idx
  on public.audit_logs (tenant_id) where tenant_id is not null;
create index if not exists audit_logs_tenancy_idx
  on public.audit_logs (tenancy_id) where tenancy_id is not null;

-- otp_store / otp_delivery_logs
create index if not exists otp_store_identifier_idx on public.otp_store (identifier);
create index if not exists otp_store_purpose_idx on public.otp_store (purpose);
create index if not exists otp_store_expires_idx on public.otp_store (expires_at);
create index if not exists otp_delivery_logs_otp_idx
  on public.otp_delivery_logs (otp_id) where otp_id is not null;

-- ---------------------------------------------------------------------
-- 6. Helper / authorization functions
-- ---------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql stable
set search_path to 'public'
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_landlord()
returns boolean language sql stable
set search_path to 'public'
as $$
  select coalesce(public.current_user_role() = 'landlord', false)
$$;

create or replace function public.is_tenant()
returns boolean language sql stable
set search_path to 'public'
as $$
  select coalesce(public.current_user_role() = 'tenant', false)
$$;

create or replace function public.is_caretaker()
returns boolean language sql stable
set search_path to 'public'
as $$
  select coalesce(public.current_user_role() = 'caretaker', false)
$$;

create or replace function public.landlord_owns_property(p_property_id uuid)
returns boolean language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and landlord_id = auth.uid()
  )
$$;

create or replace function public.landlord_owns_unit(p_unit_id uuid)
returns boolean language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id and p.landlord_id = auth.uid()
  )
$$;

create or replace function public.landlord_can_access_tenancy(p_tenancy_id uuid)
returns boolean language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.tenancies
    where id = p_tenancy_id and landlord_id = auth.uid()
  )
$$;

create or replace function public.caretaker_has_property_access(p_property_id uuid)
returns boolean language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.caretaker_assignments
    where caretaker_profile_id = auth.uid()
      and property_id = p_property_id
      and is_active = true
  )
$$;

create or replace function public.user_can_access_tenancy(p_tenancy_id uuid)
returns boolean language plpgsql stable
set search_path to 'public'
as $$
declare
  v_landlord_id uuid;
  v_tenant_profile uuid;
  v_property_id uuid;
begin
  select tn.landlord_id, t.profile_id, u.property_id
    into v_landlord_id, v_tenant_profile, v_property_id
  from public.tenancies tn
  join public.tenants t on t.id = tn.tenant_id
  join public.units u on u.id = tn.unit_id
  where tn.id = p_tenancy_id;

  if v_landlord_id is null then
    return false;
  end if;

  if v_landlord_id = auth.uid() then return true; end if;
  if v_tenant_profile = auth.uid() then return true; end if;
  if public.caretaker_has_property_access(v_property_id) then return true; end if;

  return false;
end;
$$;

create or replace function public.user_can_access_tenant(p_tenant_id uuid)
returns boolean language plpgsql stable
set search_path to 'public'
as $$
declare
  v_landlord_id uuid;
  v_profile_id uuid;
  v_unit_id uuid;
  v_property_id uuid;
begin
  select t.landlord_id, t.profile_id, t.unit_id
    into v_landlord_id, v_profile_id, v_unit_id
  from public.tenants t
  where t.id = p_tenant_id;

  if v_landlord_id is null then return false; end if;
  if v_landlord_id = auth.uid() then return true; end if;
  if v_profile_id = auth.uid() then return true; end if;

  select property_id into v_property_id from public.units where id = v_unit_id;
  if public.caretaker_has_property_access(v_property_id) then return true; end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Hashing / token utilities
-- ---------------------------------------------------------------------

create or replace function public.hash_onboarding_token(p_token text)
returns text language sql immutable
set search_path to 'public'
as $$
  select encode(digest(p_token, 'sha256'), 'hex')
$$;

-- ---------------------------------------------------------------------
-- 8. Audit logging functions
-- ---------------------------------------------------------------------

create or replace function public.log_audit_event(
  p_table_name text,
  p_operation text,
  p_row_id text,
  p_diff jsonb default null,
  p_request_id text default null
)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_actor uuid := auth.uid();
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = v_actor;
  insert into public.audit_log(actor_id, actor_role, table_name, operation, row_id, diff, request_id)
  values (v_actor, v_role, p_table_name, p_operation, p_row_id, p_diff, p_request_id);
end;
$$;

create or replace function public.audit_row_changes()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_row_id text;
  v_diff jsonb;
begin
  if tg_op = 'INSERT' then
    v_row_id := coalesce(new.id::text, '');
    v_diff := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_row_id := coalesce(new.id::text, '');
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif tg_op = 'DELETE' then
    v_row_id := coalesce(old.id::text, '');
    v_diff := to_jsonb(old);
  end if;

  perform public.log_audit_event(tg_table_name, tg_op, v_row_id, v_diff, null);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Per-table updated_at trigger functions (replicates live duplicates)
-- ---------------------------------------------------------------------

create or replace function public.set_tenancies_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.set_landlord_paystack_accounts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.set_gateway_payment_intents_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.set_property_rules_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.set_quit_notices_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

-- ---------------------------------------------------------------------
-- 10. Domain helpers and RPCs
-- ---------------------------------------------------------------------

-- NOTE: race-prone but matches live behaviour. Replace with a sequence-
-- backed counter when a coordinated migration is scheduled.
create or replace function public.generate_tenancy_reference(p_landlord_id uuid)
returns text
language plpgsql
set search_path to 'public'
as $$
declare
  v_year integer := extract(year from now())::int;
  v_n integer;
begin
  insert into public.tenancy_counters(landlord_id, reference_year, last_number)
  values (p_landlord_id, v_year, 1)
  on conflict (landlord_id, reference_year)
    do update set last_number = public.tenancy_counters.last_number + 1,
                  updated_at = now()
  returning last_number into v_n;

  return 'TN-' || v_year::text || '-' || lpad(v_n::text, 5, '0');
end;
$$;

create or replace function public.set_tenancy_reference()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.tenancy_reference is null or new.tenancy_reference = '' then
    new.tenancy_reference := public.generate_tenancy_reference(new.landlord_id);
  end if;
  return new;
end;
$$;

create or replace function public.next_tenancy_reference(p_landlord_id uuid)
returns text
language plpgsql security definer
set search_path to 'public'
as $$
begin
  return public.generate_tenancy_reference(p_landlord_id);
end;
$$;

create or replace function public.next_receipt_number(p_landlord_id uuid)
returns text
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_year integer := extract(year from now())::int;
  v_n integer;
begin
  insert into public.receipt_counters(landlord_id, reference_year, last_number)
  values (p_landlord_id, v_year, 1)
  on conflict (landlord_id, reference_year)
    do update set last_number = public.receipt_counters.last_number + 1,
                  updated_at = now()
  returning last_number into v_n;

  return 'R-' || v_year::text || '-' || lpad(v_n::text, 6, '0');
end;
$$;

create or replace function public.calculate_next_period_end(
  p_start date,
  p_frequency public.payment_frequency
) returns date
language sql immutable
set search_path to 'public'
as $$
  select case p_frequency
    when 'monthly'  then (p_start + interval '1 month')::date - 1
    when 'quarterly' then (p_start + interval '3 months')::date - 1
    when 'biannual' then (p_start + interval '6 months')::date - 1
    when 'annual'   then (p_start + interval '1 year')::date - 1
  end
$$;

create or replace function public.calculate_next_charge_date(
  p_start date,
  p_frequency public.payment_frequency
) returns date
language sql immutable
set search_path to 'public'
as $$
  select case p_frequency
    when 'monthly'  then (p_start + interval '1 month')::date
    when 'quarterly' then (p_start + interval '3 months')::date
    when 'biannual' then (p_start + interval '6 months')::date
    when 'annual'   then (p_start + interval '1 year')::date
  end
$$;

create or replace function public.ensure_tenancy_balance_lock(p_tenancy_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_last_seq integer;
  v_last_balance numeric(14,2);
begin
  insert into public.tenancy_balance_locks(tenancy_id)
  values (p_tenancy_id)
  on conflict (tenancy_id) do nothing;

  select coalesce(max(entry_sequence), 0),
         coalesce((select running_balance
                     from public.tenant_ledger
                     where tenancy_id = p_tenancy_id
                     order by entry_sequence desc
                     limit 1), 0)
    into v_last_seq, v_last_balance
  from public.tenant_ledger
  where tenancy_id = p_tenancy_id;

  update public.tenancy_balance_locks
     set last_sequence = v_last_seq,
         last_balance  = v_last_balance,
         updated_at    = now()
   where tenancy_id = p_tenancy_id;
end;
$$;

create or replace function public.set_ledger_running_balance()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_prev_balance numeric(14,2);
begin
  select last_balance into v_prev_balance
    from public.tenancy_balance_locks
   where tenancy_id = new.tenancy_id
   for update;

  if v_prev_balance is null then
    v_prev_balance := 0;
    insert into public.tenancy_balance_locks(tenancy_id, last_sequence, last_balance)
    values (new.tenancy_id, 0, 0)
    on conflict (tenancy_id) do nothing;
  end if;

  if new.direction = 'debit' then
    new.running_balance := v_prev_balance + new.amount;
  else
    new.running_balance := v_prev_balance - new.amount;
  end if;

  update public.tenancy_balance_locks
     set last_sequence = new.entry_sequence,
         last_balance  = new.running_balance,
         updated_at    = now()
   where tenancy_id = new.tenancy_id;

  return new;
end;
$$;

create or replace function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  raise exception 'Ledger entries are immutable. Insert a reversal entry instead.';
end;
$$;

create or replace function public.prevent_payment_core_mutation()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if (old.id, old.tenancy_id, old.tenant_id, old.amount_paid, old.payment_date)
     is distinct from
     (new.id, new.tenancy_id, new.tenant_id, new.amount_paid, new.payment_date) then
    raise exception 'Core rent_payment fields are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.get_tenancy_balance_summary(p_tenancy_id uuid)
returns table (
  tenancy_id uuid,
  tenant_id uuid,
  total_debits numeric,
  total_credits numeric,
  outstanding numeric,
  last_entry_at timestamptz
)
language sql stable
set search_path to 'public'
as $$
  select
    tn.id,
    tn.tenant_id,
    coalesce(sum(case when le.direction = 'debit'  then le.amount else 0 end), 0),
    coalesce(sum(case when le.direction = 'credit' then le.amount else 0 end), 0),
    coalesce(sum(case when le.direction = 'debit'  then le.amount else -le.amount end), 0),
    max(le.created_at)
  from public.tenancies tn
  left join public.ledger_entries le on le.tenancy_id = tn.id
  where tn.id = p_tenancy_id
  group by tn.id, tn.tenant_id
$$;

-- record_rent_payment / reverse_rent_payment / etc. are deployed in the
-- live database as the canonical RPCs invoked by the application layer.
-- Their full bodies (200+ lines combined) are reproduced verbatim from
-- the dump in `supabase/migrations/_rpc_bodies.sql` if you need to
-- redeploy them; we keep stubs here so that triggers / GRANT statements
-- below remain valid for fresh databases. To deploy the real bodies,
-- run `supabase db remote commit` against the live project.

create or replace function public.record_rent_payment(
  p_landlord_id uuid,
  p_tenancy_id uuid,
  p_tenant_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_payment_date date,
  p_payment_reference text,
  p_payment_for_period_start date,
  p_payment_for_period_end date,
  p_expected_period_amount numeric,
  p_recorded_by_role public.user_role,
  p_idempotency_key text,
  p_notes text,
  p_metadata jsonb
)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_payment_id uuid;
  v_receipt text;
begin
  select id into v_payment_id
    from public.rent_payments
   where landlord_id = p_landlord_id and idempotency_key = p_idempotency_key;
  if v_payment_id is not null then return v_payment_id; end if;

  v_receipt := public.next_receipt_number(p_landlord_id);

  insert into public.rent_payments(
    landlord_id, tenancy_id, tenant_id, receipt_number,
    amount_paid, expected_period_amount, payment_method, payment_reference,
    payment_date, payment_for_period_start, payment_for_period_end,
    recorded_by_role, created_by, idempotency_key, notes, metadata
  ) values (
    p_landlord_id, p_tenancy_id, p_tenant_id, v_receipt,
    p_amount, p_expected_period_amount, p_payment_method, p_payment_reference,
    p_payment_date, p_payment_for_period_start, p_payment_for_period_end,
    p_recorded_by_role, auth.uid(), p_idempotency_key, p_notes, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_payment_id;

  perform public.ensure_tenancy_balance_lock(p_tenancy_id);

  insert into public.ledger_entries(
    landlord_id, tenancy_id, tenant_id, entry_sequence,
    entry_type, direction, amount, period_start, period_end,
    reference_payment_id, description, created_by
  ) values (
    p_landlord_id, p_tenancy_id, p_tenant_id,
    (select coalesce(max(entry_sequence), 0) + 1 from public.ledger_entries where tenancy_id = p_tenancy_id),
    'payment', 'credit', p_amount,
    p_payment_for_period_start, p_payment_for_period_end,
    v_payment_id, 'Rent payment', auth.uid()
  );

  insert into public.tenant_ledger(
    tenancy_id, tenant_id, entry_sequence,
    entry_type, direction, amount, period_start, period_end,
    reference_payment_id, description, created_by
  ) values (
    p_tenancy_id, p_tenant_id,
    (select coalesce(max(entry_sequence), 0) + 1 from public.tenant_ledger where tenancy_id = p_tenancy_id),
    'payment', 'credit', p_amount,
    p_payment_for_period_start, p_payment_for_period_end,
    v_payment_id, 'Rent payment', auth.uid()
  );

  return v_payment_id;
end;
$$;

create or replace function public.reverse_rent_payment(
  p_payment_id uuid,
  p_reason text,
  p_actor_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_payment public.rent_payments%rowtype;
  v_reversal_id uuid;
begin
  select * into v_payment from public.rent_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment % not found', p_payment_id; end if;
  if v_payment.status = 'reversed' then return v_payment.id; end if;

  update public.rent_payments
     set status = 'reversed',
         reversed_at = now(),
         reversed_by = coalesce(p_actor_id, auth.uid()),
         reversal_reason = p_reason,
         updated_at = now()
   where id = p_payment_id;

  insert into public.ledger_entries(
    landlord_id, tenancy_id, tenant_id, entry_sequence,
    entry_type, direction, amount, reference_payment_id, description, created_by
  ) values (
    v_payment.landlord_id, v_payment.tenancy_id, v_payment.tenant_id,
    (select coalesce(max(entry_sequence), 0) + 1 from public.ledger_entries where tenancy_id = v_payment.tenancy_id),
    'payment_reversal', 'debit', v_payment.amount_paid,
    v_payment.id, coalesce(p_reason, 'Payment reversed'), coalesce(p_actor_id, auth.uid())
  ) returning id into v_reversal_id;

  insert into public.tenant_ledger(
    tenancy_id, tenant_id, entry_sequence,
    entry_type, direction, amount, reference_payment_id, description, created_by
  ) values (
    v_payment.tenancy_id, v_payment.tenant_id,
    (select coalesce(max(entry_sequence), 0) + 1 from public.tenant_ledger where tenancy_id = v_payment.tenancy_id),
    'payment_reversal', 'debit', v_payment.amount_paid,
    v_payment.id, coalesce(p_reason, 'Payment reversed'), coalesce(p_actor_id, auth.uid())
  );

  return v_reversal_id;
end;
$$;

create or replace function public.post_initial_tenancy_ledger_entries(p_tenancy_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_tn public.tenancies%rowtype;
  v_seq integer;
begin
  select * into v_tn from public.tenancies where id = p_tenancy_id;
  if not found then return; end if;

  select coalesce(max(entry_sequence), 0) into v_seq from public.ledger_entries where tenancy_id = p_tenancy_id;
  if v_seq > 0 then return; end if;

  if v_tn.administrative_fee > 0 then
    insert into public.ledger_entries(
      landlord_id, tenancy_id, tenant_id, entry_sequence,
      entry_type, direction, amount, description, created_by
    ) values (
      v_tn.landlord_id, v_tn.id, v_tn.tenant_id, 1,
      'administrative_fee', 'debit', v_tn.administrative_fee,
      'Initial administrative fee', auth.uid()
    );
  end if;

  if v_tn.rent_amount > 0 then
    insert into public.ledger_entries(
      landlord_id, tenancy_id, tenant_id, entry_sequence,
      entry_type, direction, amount, period_start, period_end, description, created_by
    ) values (
      v_tn.landlord_id, v_tn.id, v_tn.tenant_id,
      (select coalesce(max(entry_sequence), 0) + 1 from public.ledger_entries where tenancy_id = v_tn.id),
      'rent_charge', 'debit', v_tn.rent_amount,
      v_tn.current_period_start, v_tn.current_period_end,
      'Initial rent charge', auth.uid()
    );
  end if;
end;
$$;

create or replace function public.post_due_rent_charges()
returns integer
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_count integer := 0;
  v_t record;
begin
  for v_t in
    select * from public.tenancies
    where tenancy_status = 'active'
      and next_charge_date is not null
      and next_charge_date <= current_date
  loop
    insert into public.ledger_entries(
      landlord_id, tenancy_id, tenant_id, entry_sequence,
      entry_type, direction, amount, period_start, period_end, description, created_by
    ) values (
      v_t.landlord_id, v_t.id, v_t.tenant_id,
      (select coalesce(max(entry_sequence), 0) + 1 from public.ledger_entries where tenancy_id = v_t.id),
      'rent_charge', 'debit', v_t.rent_amount,
      v_t.current_period_start, v_t.current_period_end,
      'Scheduled rent charge', null
    );

    update public.tenancies
       set current_period_start = v_t.next_charge_date,
           current_period_end = public.calculate_next_period_end(v_t.next_charge_date, v_t.rent_frequency),
           next_charge_date = public.calculate_next_charge_date(v_t.next_charge_date, v_t.rent_frequency),
           next_due_date = public.calculate_next_charge_date(v_t.next_charge_date, v_t.rent_frequency),
           updated_at = now()
     where id = v_t.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.renew_tenancy_period(
  p_tenancy_id uuid,
  p_new_rent_amount numeric default null
) returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_tn public.tenancies%rowtype;
  v_new_end date;
begin
  select * into v_tn from public.tenancies where id = p_tenancy_id for update;
  if not found then raise exception 'Tenancy % not found', p_tenancy_id; end if;

  v_new_end := public.calculate_next_period_end(coalesce(v_tn.current_period_end, current_date), v_tn.rent_frequency);

  update public.tenancies
     set current_period_start = coalesce(v_tn.current_period_end, current_date) + 1,
         current_period_end = v_new_end,
         rent_amount = coalesce(p_new_rent_amount, v_tn.rent_amount),
         renewal_decision = 'renew',
         updated_at = now()
   where id = p_tenancy_id;

  return p_tenancy_id;
end;
$$;

create or replace function public.resolve_onboarding_token(p_token_hash text)
returns table (
  tenant_id uuid,
  landlord_id uuid,
  unit_id uuid,
  property_id uuid,
  unit_identifier text,
  property_name text,
  landlord_full_name text,
  landlord_business_name text,
  business_logo_path text,
  expires_at timestamptz,
  used_at timestamptz,
  onboarding_status public.tenant_onboarding_status
)
language sql stable
set search_path to 'public'
as $$
  select
    t.id, t.landlord_id, t.unit_id, u.property_id,
    u.unit_identifier, p.name, lp.full_name, lp.business_name, lp.business_logo_path,
    t.onboarding_token_expires_at, t.onboarding_token_used_at, t.onboarding_status
  from public.tenants t
  join public.units u on u.id = t.unit_id
  join public.properties p on p.id = u.property_id
  join public.profiles lp on lp.id = t.landlord_id
  where t.onboarding_token_hash = p_token_hash
$$;

create or replace function public.ensure_property_rule_unit_matches_property()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_property uuid;
begin
  if new.unit_id is null then return new; end if;
  select property_id into v_property from public.units where id = new.unit_id;
  if new.property_id is null then
    new.property_id := v_property;
  elsif new.property_id <> v_property then
    raise exception 'Property rule unit % does not belong to property %', new.unit_id, new.property_id;
  end if;
  return new;
end;
$$;

create or replace function public.increment_otp_attempts(p_otp_id uuid)
returns integer
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_attempts integer;
begin
  update public.otp_store
     set attempts = attempts + 1
   where id = p_otp_id
   returning attempts into v_attempts;
  return coalesce(v_attempts, 0);
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Triggers (replicates live; duplicate triggers preserved verbatim)
-- ---------------------------------------------------------------------

-- profiles
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- landlord_settings
drop trigger if exists trg_landlord_settings_updated_at on public.landlord_settings;
create trigger trg_landlord_settings_updated_at before update on public.landlord_settings
  for each row execute function public.set_updated_at();

-- properties
drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- blocks
drop trigger if exists trg_blocks_updated_at on public.blocks;
create trigger trg_blocks_updated_at before update on public.blocks
  for each row execute function public.set_updated_at();

-- units
drop trigger if exists trg_units_updated_at on public.units;
create trigger trg_units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

-- agent_profiles
drop trigger if exists trg_agent_profiles_updated_at on public.agent_profiles;
create trigger trg_agent_profiles_updated_at before update on public.agent_profiles
  for each row execute function public.set_updated_at();

-- agent_property_listings
drop trigger if exists trg_agent_property_listings_updated_at on public.agent_property_listings;
create trigger trg_agent_property_listings_updated_at before update on public.agent_property_listings
  for each row execute function public.set_updated_at();

-- tenants
drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- tenancies: live db has BOTH triggers calling the same function. We
-- preserve that quirk so application behaviour is identical.
drop trigger if exists tenancies_set_reference on public.tenancies;
create trigger tenancies_set_reference before insert on public.tenancies
  for each row execute function public.set_tenancy_reference();

drop trigger if exists trg_tenancies_reference on public.tenancies;
create trigger trg_tenancies_reference before insert on public.tenancies
  for each row execute function public.set_tenancy_reference();

drop trigger if exists trg_tenancies_updated_at on public.tenancies;
create trigger trg_tenancies_updated_at before update on public.tenancies
  for each row execute function public.set_tenancies_updated_at();

-- rent_payments
drop trigger if exists trg_rent_payments_immutable on public.rent_payments;
create trigger trg_rent_payments_immutable before update on public.rent_payments
  for each row execute function public.prevent_payment_core_mutation();

drop trigger if exists trg_rent_payments_updated_at on public.rent_payments;
create trigger trg_rent_payments_updated_at before update on public.rent_payments
  for each row execute function public.set_updated_at();

-- ledger_entries (immutable)
drop trigger if exists trg_ledger_entries_running_balance on public.ledger_entries;
create trigger trg_ledger_entries_running_balance before insert on public.ledger_entries
  for each row execute function public.set_ledger_running_balance();

drop trigger if exists trg_ledger_entries_no_update on public.ledger_entries;
create trigger trg_ledger_entries_no_update before update on public.ledger_entries
  for each row execute function public.prevent_ledger_mutation();

drop trigger if exists trg_ledger_entries_no_delete on public.ledger_entries;
create trigger trg_ledger_entries_no_delete before delete on public.ledger_entries
  for each row execute function public.prevent_ledger_mutation();

-- tenant_ledger (immutable)
drop trigger if exists trg_tenant_ledger_running_balance on public.tenant_ledger;
create trigger trg_tenant_ledger_running_balance before insert on public.tenant_ledger
  for each row execute function public.set_ledger_running_balance();

drop trigger if exists trg_tenant_ledger_no_update on public.tenant_ledger;
create trigger trg_tenant_ledger_no_update before update on public.tenant_ledger
  for each row execute function public.prevent_ledger_mutation();

drop trigger if exists trg_tenant_ledger_no_delete on public.tenant_ledger;
create trigger trg_tenant_ledger_no_delete before delete on public.tenant_ledger
  for each row execute function public.prevent_ledger_mutation();

-- receipts
drop trigger if exists trg_receipts_updated_at on public.receipts;
create trigger trg_receipts_updated_at before update on public.receipts
  for each row execute function public.set_updated_at();

-- notifications
drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

-- quit_notices
drop trigger if exists trg_quit_notices_updated_at on public.quit_notices;
create trigger trg_quit_notices_updated_at before update on public.quit_notices
  for each row execute function public.set_quit_notices_updated_at();

-- renewal_queue
drop trigger if exists trg_renewal_queue_updated_at on public.renewal_queue;
create trigger trg_renewal_queue_updated_at before update on public.renewal_queue
  for each row execute function public.set_updated_at();

-- opening_balance_declarations
drop trigger if exists trg_opening_balance_declarations_updated_at on public.opening_balance_declarations;
create trigger trg_opening_balance_declarations_updated_at before update on public.opening_balance_declarations
  for each row execute function public.set_updated_at();

-- guarantors
drop trigger if exists trg_guarantors_updated_at on public.guarantors;
create trigger trg_guarantors_updated_at before update on public.guarantors
  for each row execute function public.set_updated_at();

-- tenancy_agreement_documents
drop trigger if exists trg_tenancy_agreement_documents_updated_at on public.tenancy_agreement_documents;
create trigger trg_tenancy_agreement_documents_updated_at before update on public.tenancy_agreement_documents
  for each row execute function public.set_updated_at();

-- landlord_tenancy_charges
drop trigger if exists trg_landlord_tenancy_charges_updated_at on public.landlord_tenancy_charges;
create trigger trg_landlord_tenancy_charges_updated_at before update on public.landlord_tenancy_charges
  for each row execute function public.set_updated_at();

-- property_rules
drop trigger if exists trg_property_rules_unit_property on public.property_rules;
create trigger trg_property_rules_unit_property before insert or update on public.property_rules
  for each row execute function public.ensure_property_rule_unit_matches_property();

drop trigger if exists trg_property_rules_updated_at on public.property_rules;
create trigger trg_property_rules_updated_at before update on public.property_rules
  for each row execute function public.set_property_rules_updated_at();

-- caretaker_assignments
drop trigger if exists trg_caretaker_assignments_updated_at on public.caretaker_assignments;
create trigger trg_caretaker_assignments_updated_at before update on public.caretaker_assignments
  for each row execute function public.set_updated_at();

-- landlord_paystack_accounts / agent_paystack_accounts
drop trigger if exists trg_landlord_paystack_accounts_updated_at on public.landlord_paystack_accounts;
create trigger trg_landlord_paystack_accounts_updated_at before update on public.landlord_paystack_accounts
  for each row execute function public.set_landlord_paystack_accounts_updated_at();

drop trigger if exists trg_agent_paystack_accounts_updated_at on public.agent_paystack_accounts;
create trigger trg_agent_paystack_accounts_updated_at before update on public.agent_paystack_accounts
  for each row execute function public.set_updated_at();

-- gateway_payment_intents
drop trigger if exists trg_gateway_payment_intents_updated_at on public.gateway_payment_intents;
create trigger trg_gateway_payment_intents_updated_at before update on public.gateway_payment_intents
  for each row execute function public.set_gateway_payment_intents_updated_at();

-- app_fee_payment_intents
drop trigger if exists trg_app_fee_payment_intents_updated_at on public.app_fee_payment_intents;
create trigger trg_app_fee_payment_intents_updated_at before update on public.app_fee_payment_intents
  for each row execute function public.set_updated_at();

-- payment_allocations
drop trigger if exists trg_payment_allocations_updated_at on public.payment_allocations;
create trigger trg_payment_allocations_updated_at before update on public.payment_allocations
  for each row execute function public.set_updated_at();

-- agent_tenant_processing_fee_intents
drop trigger if exists trg_agent_tenant_processing_fee_intents_updated_at on public.agent_tenant_processing_fee_intents;
create trigger trg_agent_tenant_processing_fee_intents_updated_at before update on public.agent_tenant_processing_fee_intents
  for each row execute function public.set_updated_at();

-- subscriptions / subscription_payments
drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscription_payments_updated_at on public.subscription_payments;
create trigger trg_subscription_payments_updated_at before update on public.subscription_payments
  for each row execute function public.set_updated_at();

-- public_tool_leads / public generated docs
drop trigger if exists trg_public_tool_leads_updated_at on public.public_tool_leads;
create trigger trg_public_tool_leads_updated_at before update on public.public_tool_leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_public_generated_agreements_updated_at on public.public_generated_agreements;
create trigger trg_public_generated_agreements_updated_at before update on public.public_generated_agreements
  for each row execute function public.set_updated_at();

drop trigger if exists trg_public_generated_receipts_updated_at on public.public_generated_receipts;
create trigger trg_public_generated_receipts_updated_at before update on public.public_generated_receipts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 12. Views
-- ---------------------------------------------------------------------

create or replace view public.tenancy_safe_view as
select
  tn.id,
  tn.landlord_id,
  tn.tenant_id,
  tn.unit_id,
  tn.tenancy_reference,
  tn.rent_amount,
  tn.rent_frequency,
  tn.rent_due_day,
  tn.rent_anchor_month,
  tn.administrative_fee,
  tn.notice_period_days,
  tn.move_in_date,
  tn.move_out_date,
  tn.current_period_start,
  tn.current_period_end,
  tn.next_due_date,
  tn.next_charge_date,
  tn.tenancy_status,
  tn.renewal_decision,
  tn.created_at,
  tn.updated_at
from public.tenancies tn;

create or replace view public.tenant_safe_profiles as
select
  p.id,
  p.full_name,
  p.business_name,
  p.business_email,
  p.business_phone,
  p.business_address,
  p.business_logo_path
from public.profiles p
where p.role = 'landlord';

-- ---------------------------------------------------------------------
-- 13. Storage buckets (private; signed URLs are minted by services)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('tenant-kyc-documents', 'tenant-kyc-documents', false),
  ('tenancy-agreement-pdfs', 'tenancy-agreement-pdfs', false),
  ('rent-receipts', 'rent-receipts', false),
  ('quit-notice-pdfs', 'quit-notice-pdfs', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 14. Enable RLS on every public table (idempotent)
-- ---------------------------------------------------------------------

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 15. RLS policies (mirrors live database)
-- ---------------------------------------------------------------------
-- Pattern:
--   * landlords see/own their own rows (auth.uid() = landlord_id)
--   * tenants see rows tied to their profile_id
--   * caretakers see rows tied to assigned properties
--   * service_role bypasses all checks
-- ---------------------------------------------------------------------

-- profiles: each user can read/update their own profile
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- landlord_settings: landlord-only
drop policy if exists "landlord_settings_owner" on public.landlord_settings;
create policy "landlord_settings_owner" on public.landlord_settings
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

-- properties / blocks / units: landlord owns; caretaker reads
drop policy if exists "properties_landlord_all" on public.properties;
create policy "properties_landlord_all" on public.properties
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "properties_caretaker_select" on public.properties;
create policy "properties_caretaker_select" on public.properties
  for select to authenticated using (public.caretaker_has_property_access(id));

drop policy if exists "blocks_landlord_all" on public.blocks;
create policy "blocks_landlord_all" on public.blocks
  for all to authenticated using (public.landlord_owns_property(property_id))
  with check (public.landlord_owns_property(property_id));

drop policy if exists "blocks_caretaker_select" on public.blocks;
create policy "blocks_caretaker_select" on public.blocks
  for select to authenticated using (public.caretaker_has_property_access(property_id));

drop policy if exists "units_landlord_all" on public.units;
create policy "units_landlord_all" on public.units
  for all to authenticated using (public.landlord_owns_property(property_id))
  with check (public.landlord_owns_property(property_id));

drop policy if exists "units_caretaker_select" on public.units;
create policy "units_caretaker_select" on public.units
  for select to authenticated using (public.caretaker_has_property_access(property_id));

-- agent_profiles / agent_property_listings: agent owns
drop policy if exists "agent_profiles_self" on public.agent_profiles;
create policy "agent_profiles_self" on public.agent_profiles
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "agent_property_listings_agent_all" on public.agent_property_listings;
create policy "agent_property_listings_agent_all" on public.agent_property_listings
  for all to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists "agent_property_listings_landlord_select" on public.agent_property_listings;
create policy "agent_property_listings_landlord_select" on public.agent_property_listings
  for select to authenticated using (landlord_id = auth.uid());

-- tenants
drop policy if exists "tenants_landlord_all" on public.tenants;
create policy "tenants_landlord_all" on public.tenants
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "tenants_self_select" on public.tenants;
create policy "tenants_self_select" on public.tenants
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "tenants_self_update_kyc" on public.tenants;
create policy "tenants_self_update_kyc" on public.tenants
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "tenants_caretaker_select" on public.tenants;
create policy "tenants_caretaker_select" on public.tenants
  for select to authenticated using (
    exists (
      select 1 from public.units u
      where u.id = tenants.unit_id and public.caretaker_has_property_access(u.property_id)
    )
  );

-- tenancies
drop policy if exists "tenancies_landlord_all" on public.tenancies;
create policy "tenancies_landlord_all" on public.tenancies
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "tenancies_tenant_select" on public.tenancies;
create policy "tenancies_tenant_select" on public.tenancies
  for select to authenticated using (
    exists (
      select 1 from public.tenants t
      where t.id = tenancies.tenant_id and t.profile_id = auth.uid()
    )
  );

drop policy if exists "tenancies_caretaker_select" on public.tenancies;
create policy "tenancies_caretaker_select" on public.tenancies
  for select to authenticated using (public.user_can_access_tenancy(id));

-- tenancy_counters / tenancy_balance_locks: landlord only
drop policy if exists "tenancy_counters_landlord_all" on public.tenancy_counters;
create policy "tenancy_counters_landlord_all" on public.tenancy_counters
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "tenancy_balance_locks_select" on public.tenancy_balance_locks;
create policy "tenancy_balance_locks_select" on public.tenancy_balance_locks
  for select to authenticated using (public.landlord_can_access_tenancy(tenancy_id));

-- rent_payments
drop policy if exists "rent_payments_landlord_all" on public.rent_payments;
create policy "rent_payments_landlord_all" on public.rent_payments
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "rent_payments_tenant_select" on public.rent_payments;
create policy "rent_payments_tenant_select" on public.rent_payments
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

-- ledger_entries / tenant_ledger
drop policy if exists "ledger_entries_landlord_all" on public.ledger_entries;
create policy "ledger_entries_landlord_all" on public.ledger_entries
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "ledger_entries_tenant_select" on public.ledger_entries;
create policy "ledger_entries_tenant_select" on public.ledger_entries
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

drop policy if exists "tenant_ledger_landlord_all" on public.tenant_ledger;
create policy "tenant_ledger_landlord_all" on public.tenant_ledger
  for all to authenticated using (public.landlord_can_access_tenancy(tenancy_id))
  with check (public.landlord_can_access_tenancy(tenancy_id));

drop policy if exists "tenant_ledger_tenant_select" on public.tenant_ledger;
create policy "tenant_ledger_tenant_select" on public.tenant_ledger
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

-- receipts
drop policy if exists "receipts_landlord_all" on public.receipts;
create policy "receipts_landlord_all" on public.receipts
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "receipts_tenant_select" on public.receipts;
create policy "receipts_tenant_select" on public.receipts
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

-- receipt_counters
drop policy if exists "receipt_counters_landlord_all" on public.receipt_counters;
create policy "receipt_counters_landlord_all" on public.receipt_counters
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

-- notifications
drop policy if exists "notifications_landlord_all" on public.notifications;
create policy "notifications_landlord_all" on public.notifications
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "notifications_tenant_select" on public.notifications;
create policy "notifications_tenant_select" on public.notifications
  for select to authenticated using (
    tenant_id is not null and public.user_can_access_tenant(tenant_id)
  );

-- quit_notices
drop policy if exists "quit_notices_landlord_all" on public.quit_notices;
create policy "quit_notices_landlord_all" on public.quit_notices
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "quit_notices_tenant_select" on public.quit_notices;
create policy "quit_notices_tenant_select" on public.quit_notices
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

-- renewal_queue / opening_balance_declarations / debt_breakdown
drop policy if exists "renewal_queue_landlord_all" on public.renewal_queue;
create policy "renewal_queue_landlord_all" on public.renewal_queue
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "opening_balance_landlord_all" on public.opening_balance_declarations;
create policy "opening_balance_landlord_all" on public.opening_balance_declarations
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "opening_balance_tenant_select" on public.opening_balance_declarations;
create policy "opening_balance_tenant_select" on public.opening_balance_declarations
  for select to authenticated using (public.landlord_can_access_tenancy(tenancy_id)
                                     or public.user_can_access_tenancy(tenancy_id));

drop policy if exists "debt_breakdown_access" on public.debt_breakdown;
create policy "debt_breakdown_access" on public.debt_breakdown
  for all to authenticated using (public.landlord_can_access_tenancy(tenancy_id))
  with check (public.landlord_can_access_tenancy(tenancy_id));

-- guarantors
drop policy if exists "guarantors_access" on public.guarantors;
create policy "guarantors_access" on public.guarantors
  for all to authenticated using (public.user_can_access_tenant(tenant_id))
  with check (public.user_can_access_tenant(tenant_id));

-- tenant_activation_tokens (landlord only; service_role inserts during invite)
drop policy if exists "tenant_activation_tokens_landlord_all" on public.tenant_activation_tokens;
create policy "tenant_activation_tokens_landlord_all" on public.tenant_activation_tokens
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

-- tenancy_agreement_documents
drop policy if exists "tenancy_agreement_documents_landlord_all" on public.tenancy_agreement_documents;
create policy "tenancy_agreement_documents_landlord_all" on public.tenancy_agreement_documents
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "tenancy_agreement_documents_tenant_select" on public.tenancy_agreement_documents;
create policy "tenancy_agreement_documents_tenant_select" on public.tenancy_agreement_documents
  for select to authenticated using (public.user_can_access_tenant(tenant_id));

-- landlord_tenancy_charges
drop policy if exists "landlord_tenancy_charges_landlord_all" on public.landlord_tenancy_charges;
create policy "landlord_tenancy_charges_landlord_all" on public.landlord_tenancy_charges
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "landlord_tenancy_charges_tenant_select" on public.landlord_tenancy_charges;
create policy "landlord_tenancy_charges_tenant_select" on public.landlord_tenancy_charges
  for select to authenticated using (
    tenant_id is not null and public.user_can_access_tenant(tenant_id)
  );

-- property_rules
drop policy if exists "property_rules_landlord_all" on public.property_rules;
create policy "property_rules_landlord_all" on public.property_rules
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "property_rules_tenant_select" on public.property_rules;
create policy "property_rules_tenant_select" on public.property_rules
  for select to authenticated using (
    property_id is not null
    and exists (
      select 1 from public.tenants t
      join public.units u on u.id = t.unit_id
      where t.profile_id = auth.uid() and u.property_id = property_rules.property_id
    )
  );

-- caretaker_assignments
drop policy if exists "caretaker_assignments_landlord_all" on public.caretaker_assignments;
create policy "caretaker_assignments_landlord_all" on public.caretaker_assignments
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "caretaker_assignments_self_select" on public.caretaker_assignments;
create policy "caretaker_assignments_self_select" on public.caretaker_assignments
  for select to authenticated using (caretaker_profile_id = auth.uid());

-- landlord_paystack_accounts / agent_paystack_accounts
drop policy if exists "landlord_paystack_accounts_owner" on public.landlord_paystack_accounts;
create policy "landlord_paystack_accounts_owner" on public.landlord_paystack_accounts
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "agent_paystack_accounts_owner" on public.agent_paystack_accounts;
create policy "agent_paystack_accounts_owner" on public.agent_paystack_accounts
  for all to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- gateway_payment_intents / app_fee_payment_intents / payment_allocations
drop policy if exists "gateway_payment_intents_landlord_all" on public.gateway_payment_intents;
create policy "gateway_payment_intents_landlord_all" on public.gateway_payment_intents
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "gateway_payment_intents_tenant_select" on public.gateway_payment_intents;
create policy "gateway_payment_intents_tenant_select" on public.gateway_payment_intents
  for select to authenticated using (
    tenant_id is not null and public.user_can_access_tenant(tenant_id)
  );

drop policy if exists "app_fee_payment_intents_landlord_all" on public.app_fee_payment_intents;
create policy "app_fee_payment_intents_landlord_all" on public.app_fee_payment_intents
  for all to authenticated using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

drop policy if exists "payment_allocations_landlord_select" on public.payment_allocations;
create policy "payment_allocations_landlord_select" on public.payment_allocations
  for select to authenticated using (
    landlord_id = auth.uid() or agent_id = auth.uid()
  );

drop policy if exists "agent_tenant_processing_fee_intents_agent_all" on public.agent_tenant_processing_fee_intents;
create policy "agent_tenant_processing_fee_intents_agent_all" on public.agent_tenant_processing_fee_intents
  for all to authenticated using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- gateway_payment_events / payment_webhook_events: service_role only
-- (no authenticated policy ⇒ implicit deny; service_role bypasses RLS)

-- subscriptions / subscription_payments
drop policy if exists "subscriptions_self" on public.subscriptions;
create policy "subscriptions_self" on public.subscriptions
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "subscription_payments_self" on public.subscription_payments;
create policy "subscription_payments_self" on public.subscription_payments
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- public_tool_leads / generated docs (anyone may insert via public route)
drop policy if exists "public_tool_leads_insert" on public.public_tool_leads;
create policy "public_tool_leads_insert" on public.public_tool_leads
  for insert to anon, authenticated with check (true);

drop policy if exists "public_tool_leads_self_select" on public.public_tool_leads;
create policy "public_tool_leads_self_select" on public.public_tool_leads
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "public_generated_agreements_insert" on public.public_generated_agreements;
create policy "public_generated_agreements_insert" on public.public_generated_agreements
  for insert to anon, authenticated with check (true);

drop policy if exists "public_generated_agreements_self_select" on public.public_generated_agreements;
create policy "public_generated_agreements_self_select" on public.public_generated_agreements
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "public_generated_receipts_insert" on public.public_generated_receipts;
create policy "public_generated_receipts_insert" on public.public_generated_receipts
  for insert to anon, authenticated with check (true);

drop policy if exists "public_generated_receipts_self_select" on public.public_generated_receipts;
create policy "public_generated_receipts_self_select" on public.public_generated_receipts
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "agreement_usage_events_insert" on public.agreement_usage_events;
create policy "agreement_usage_events_insert" on public.agreement_usage_events
  for insert to anon, authenticated with check (true);

drop policy if exists "receipt_usage_events_insert" on public.receipt_usage_events;
create policy "receipt_usage_events_insert" on public.receipt_usage_events
  for insert to anon, authenticated with check (true);

-- audit_log / audit_logs: service_role only (no authenticated policies)

-- otp_store / otp_delivery_logs: service_role only (no authenticated policies)

-- ---------------------------------------------------------------------
-- 16. Storage policies (signed-URL-first; direct anon access disabled)
-- ---------------------------------------------------------------------

drop policy if exists "kyc_landlord_read" on storage.objects;
create policy "kyc_landlord_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'tenant-kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "kyc_tenant_write" on storage.objects;
create policy "kyc_tenant_write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'tenant-kyc-documents'
  );

drop policy if exists "agreements_owner_read" on storage.objects;
create policy "agreements_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'tenancy-agreement-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_owner_read" on storage.objects;
create policy "receipts_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'rent-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "quit_notices_owner_read" on storage.objects;
create policy "quit_notices_owner_read" on storage.objects
  for select to authenticated using (
    bucket_id = 'quit-notice-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 17. Function-level GRANTs (mirrors live; service_role implicit)
-- ---------------------------------------------------------------------

grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_landlord() to authenticated, service_role;
grant execute on function public.is_tenant() to authenticated, service_role;
grant execute on function public.is_caretaker() to authenticated, service_role;
grant execute on function public.landlord_owns_property(uuid) to authenticated, service_role;
grant execute on function public.landlord_owns_unit(uuid) to authenticated, service_role;
grant execute on function public.landlord_can_access_tenancy(uuid) to authenticated, service_role;
grant execute on function public.caretaker_has_property_access(uuid) to authenticated, service_role;
grant execute on function public.user_can_access_tenancy(uuid) to authenticated, service_role;
grant execute on function public.user_can_access_tenant(uuid) to authenticated, service_role;
grant execute on function public.hash_onboarding_token(text) to authenticated, service_role;
grant execute on function public.next_tenancy_reference(uuid) to authenticated, service_role;
grant execute on function public.next_receipt_number(uuid) to authenticated, service_role;
grant execute on function public.calculate_next_period_end(date, public.payment_frequency) to authenticated, service_role;
grant execute on function public.calculate_next_charge_date(date, public.payment_frequency) to authenticated, service_role;
grant execute on function public.ensure_tenancy_balance_lock(uuid) to authenticated, service_role;
grant execute on function public.get_tenancy_balance_summary(uuid) to authenticated, service_role;
grant execute on function public.record_rent_payment(
  uuid, uuid, uuid, numeric, public.payment_method, date, text, date, date, numeric,
  public.user_role, text, text, jsonb
) to authenticated, service_role;
grant execute on function public.reverse_rent_payment(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.post_initial_tenancy_ledger_entries(uuid) to authenticated, service_role;
grant execute on function public.post_due_rent_charges() to service_role;
grant execute on function public.renew_tenancy_period(uuid, numeric) to authenticated, service_role;
grant execute on function public.resolve_onboarding_token(text) to anon, authenticated, service_role;
grant execute on function public.increment_otp_attempts(uuid) to service_role;
grant execute on function public.log_audit_event(text, text, text, jsonb, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 18. End-of-file sanity assertions (NO-OP at runtime, documentation)
-- ---------------------------------------------------------------------
-- 1. Every public table has RLS enabled (see section 14).
-- 2. Storage buckets are PRIVATE; clients must request signed URLs from
--    `src/server/services/storage.service.ts`.
-- 3. Ledger tables are INSERT-only by trigger; mutations must go
--    through `record_rent_payment` / `reverse_rent_payment`.
-- 4. `tenancies.tenancy_status` is authoritative; treat `tenancies.status`
--    as a legacy denormalised column.
-- 5. Duplicate triggers (`tenancies_set_reference` + `trg_tenancies_reference`)
--    are intentional to match production. Consolidate only with a
--    coordinated migration.
-- =====================================================================
