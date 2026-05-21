-- =====================================================
-- Batch 4: Tenancy agreement flow completion
-- Production-safe migration
-- =====================================================

-- =====================================================
-- TENANCY REMINDER INTERVAL SUPPORT
-- =====================================================

alter table if exists public.tenancies
  add column if not exists reminder_interval_days integer,
  add column if not exists charges_confirmed_at timestamptz;

alter table if exists public.tenancies
  drop constraint if exists tenancies_reminder_interval_days_check;

alter table if exists public.tenancies
  add constraint tenancies_reminder_interval_days_check
  check (
    reminder_interval_days is null
    or reminder_interval_days in (30, 60, 90)
  );

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists tenancies_landlord_status_idx
  on public.tenancies (landlord_id, status);

create index if not exists tenancies_tenant_status_idx
  on public.tenancies (tenant_id, status);

create index if not exists tenancies_charges_confirmed_idx
  on public.tenancies (charges_confirmed_at)
  where charges_confirmed_at is not null;

-- =====================================================
-- REMINDER INTERVAL BACKFILL
-- =====================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenancies'
      and column_name = 'renewal_notice_date'
  ) then

    update public.tenancies t
    set reminder_interval_days = sub.interval_days
    from (
      select
        id,
        case
          when renewal_notice_date is not null
            and end_date is not null then
              case
                when (end_date - renewal_notice_date) between 25 and 35 then 30
                when (end_date - renewal_notice_date) between 55 and 65 then 60
                when (end_date - renewal_notice_date) between 85 and 95 then 90
                else null
              end
          else null
        end as interval_days
      from public.tenancies
      where reminder_interval_days is null
    ) sub
    where t.id = sub.id
      and sub.interval_days is not null;

  end if;
end $$;

-- =====================================================
-- LANDLORD TENANCY CHARGES
-- =====================================================

alter table if exists public.landlord_tenancy_charges
  add column if not exists charge_name text;

-- =====================================================
-- BACKFILL FROM label
-- =====================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'landlord_tenancy_charges'
      and column_name = 'label'
  ) then

    execute $sql$
      update public.landlord_tenancy_charges
      set charge_name = nullif(trim(label), '')
      where charge_name is null
        and label is not null
    $sql$;

  end if;
end $$;

-- =====================================================
-- BACKFILL FROM charge_type
-- =====================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'landlord_tenancy_charges'
      and column_name = 'charge_type'
  ) then

    execute $sql$
      update public.landlord_tenancy_charges
      set charge_name = initcap(replace(charge_type::text, '_', ' '))
      where charge_name is null
        and charge_type is not null
    $sql$;

  end if;
end $$;

-- =====================================================
-- FINAL SAFETY BACKFILL
-- =====================================================

update public.landlord_tenancy_charges
set charge_name = 'Landlord charge'
where charge_name is null
   or trim(charge_name) = '';

-- =====================================================
-- VALIDATION
-- =====================================================

alter table if exists public.landlord_tenancy_charges
  alter column charge_name set not null;

alter table if exists public.landlord_tenancy_charges
  drop constraint if exists landlord_tenancy_charges_charge_name_check;

alter table if exists public.landlord_tenancy_charges
  add constraint landlord_tenancy_charges_charge_name_check
  check (char_length(trim(charge_name)) > 0);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists landlord_tenancy_charges_tenancy_idx
  on public.landlord_tenancy_charges (tenancy_id);

create index if not exists landlord_tenancy_charges_tenancy_status_idx
  on public.landlord_tenancy_charges (tenancy_id, status);

create index if not exists landlord_tenancy_charges_created_at_idx
  on public.landlord_tenancy_charges (created_at desc);

-- =====================================================
-- CHARGE NAME LOOKUP INDEX
-- Non-unique: duplicate names enforced in application layer
-- =====================================================

drop index if exists landlord_tenancy_charges_active_name_uidx;

create index if not exists landlord_tenancy_charges_tenancy_name_idx
  on public.landlord_tenancy_charges (
    tenancy_id,
    lower(charge_name)
  )
  where status = 'active';

-- =====================================================
-- IMPORTANT:
-- DO NOT DROP legacy columns yet.
--
-- Keep:
-- - label
-- - charge_type
--
-- Existing:
-- - PDFs
-- - services
-- - agreement generators
-- - admin tooling
-- may still reference them.
--
-- Remove only after:
-- 1. application migration is complete
-- 2. production deploy is stable
-- 3. no reads remain
-- =====================================================
