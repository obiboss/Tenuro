-- Manager onboarding/unit setup safety.
-- Mirrors the SQL applied directly in Supabase on 2026-07-15.
-- Keep existing payment functions intact:
-- - public.apply_manager_first_rent_payment_status() returns trigger
-- - public.expire_manager_new_tenant_payment_requests() returns integer

alter table if exists public.manager_properties
  add column if not exists existing_tenant_setup_required boolean not null default false,
  add column if not exists existing_tenant_setup_completed_at timestamptz,
  add column if not exists existing_tenant_setup_completed_by_profile_id uuid references public.profiles(id) on delete set null;

create or replace function public.manager_unit_has_current_tenant(
  p_organization_id uuid,
  p_unit_id uuid
)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.manager_tenants tenant
    where tenant.organization_id = p_organization_id
      and tenant.unit_id = p_unit_id
      and tenant.status in ('active', 'eviction_notice')
  );
$$;

create or replace function public.release_manager_unit_if_available(
  p_organization_id uuid,
  p_unit_id uuid,
  p_ignore_onboarding_request_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.manager_unit_has_current_tenant(p_organization_id, p_unit_id) then
    update public.manager_units
    set status = 'occupied',
        updated_at = now()
    where organization_id = p_organization_id
      and id = p_unit_id
      and status <> 'inactive';

    return;
  end if;

  if exists (
    select 1
    from public.manager_tenant_onboarding_requests request
    where request.organization_id = p_organization_id
      and request.unit_id = p_unit_id
      and (
        p_ignore_onboarding_request_id is null
        or request.id <> p_ignore_onboarding_request_id
      )
      and request.status in (
        'pending',
        'submitted',
        'agreement_sent',
        'agreement_accepted',
        'payment_initialized'
      )
  ) then
    update public.manager_units
    set status = 'reserved',
        updated_at = now()
    where organization_id = p_organization_id
      and id = p_unit_id
      and status <> 'inactive';

    return;
  end if;

  update public.manager_units
  set status = 'vacant',
      updated_at = now()
  where organization_id = p_organization_id
    and id = p_unit_id
    and status in ('reserved', 'occupied');
end;
$$;

create or replace function public.release_manager_unit_if_available(
  p_organization_id uuid,
  p_unit_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.release_manager_unit_if_available(
    p_organization_id,
    p_unit_id,
    null
  );
end;
$$;

create or replace function public.guard_manager_tenant_onboarding_unit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  target_unit_status text;
  should_reserve_unit boolean := false;
begin
  if new.status in (
    'pending',
    'submitted',
    'agreement_sent',
    'agreement_accepted',
    'payment_initialized'
  ) then
    if tg_op = 'INSERT' then
      should_reserve_unit := true;
    elsif tg_op = 'UPDATE'
      and old.status not in (
        'pending',
        'submitted',
        'agreement_sent',
        'agreement_accepted',
        'payment_initialized'
      ) then
      should_reserve_unit := true;
    end if;
  end if;

  if should_reserve_unit then
    select unit.status::text
      into target_unit_status
    from public.manager_units unit
    where unit.organization_id = new.organization_id
      and unit.id = new.unit_id
    for update;

    if target_unit_status is null then
      raise exception 'Selected manager unit was not found.';
    end if;

    if target_unit_status <> 'vacant' then
      raise exception 'Selected manager unit is not available for onboarding.';
    end if;

    if public.manager_unit_has_current_tenant(new.organization_id, new.unit_id) then
      raise exception 'Selected manager unit already has a current tenant.';
    end if;

    update public.manager_units
    set status = 'reserved',
        updated_at = now()
    where organization_id = new.organization_id
      and id = new.unit_id;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status in (
      'pending',
      'submitted',
      'agreement_sent',
      'agreement_accepted',
      'payment_initialized'
    )
    and new.status in (
      'rejected',
      'cancelled',
      'expired',
      'payment_expired'
    ) then
    perform public.release_manager_unit_if_available(
      new.organization_id,
      new.unit_id,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists manager_tenant_onboarding_unit_guard
  on public.manager_tenant_onboarding_requests;

create trigger manager_tenant_onboarding_unit_guard
  before insert or update of status on public.manager_tenant_onboarding_requests
  for each row
  execute function public.guard_manager_tenant_onboarding_unit();

create or replace function public.sync_manager_unit_status_from_tenant()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'UPDATE'
    and old.unit_id is distinct from new.unit_id
    and old.status in ('active', 'eviction_notice') then
    perform public.release_manager_unit_if_available(old.organization_id, old.unit_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status in ('active', 'eviction_notice') then
    update public.manager_units
    set status = 'occupied',
        updated_at = now()
    where organization_id = new.organization_id
      and id = new.unit_id
      and status <> 'inactive';

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status in ('active', 'eviction_notice')
    and new.status not in ('active', 'eviction_notice') then
    perform public.release_manager_unit_if_available(old.organization_id, old.unit_id);
  end if;

  return new;
end;
$$;

drop trigger if exists manager_tenant_unit_status_sync
  on public.manager_tenants;

create trigger manager_tenant_unit_status_sync
  after insert or update of status, unit_id on public.manager_tenants
  for each row
  execute function public.sync_manager_unit_status_from_tenant();

create or replace function public.guard_manager_unit_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'vacant' and public.manager_unit_has_current_tenant(new.organization_id, new.id) then
    raise exception 'A unit with a current tenant cannot be marked vacant.';
  end if;

  if new.status = 'reserved' and public.manager_unit_has_current_tenant(new.organization_id, new.id) then
    raise exception 'A unit with a current tenant cannot be marked reserved.';
  end if;

  if new.status = 'occupied' and not public.manager_unit_has_current_tenant(new.organization_id, new.id) then
    raise exception 'A unit cannot be marked occupied without a current tenant.';
  end if;

  return new;
end;
$$;

drop trigger if exists manager_unit_status_guard
  on public.manager_units;

create trigger manager_unit_status_guard
  before insert or update of status on public.manager_units
  for each row
  execute function public.guard_manager_unit_status();

update public.manager_tenant_onboarding_requests
set status = 'expired',
    expired_at = coalesce(expired_at, now()),
    updated_at = now()
where status = 'pending'
  and token_expires_at is not null
  and token_expires_at <= now();

update public.manager_tenant_onboarding_requests request
set status = 'cancelled',
    cancelled_at = coalesce(cancelled_at, now()),
    updated_at = now()
where request.status = 'pending'
  and public.manager_unit_has_current_tenant(
    request.organization_id,
    request.unit_id
  );

update public.manager_units unit
set status = 'occupied',
    updated_at = now()
where unit.status <> 'inactive'
  and unit.status <> 'occupied'
  and public.manager_unit_has_current_tenant(unit.organization_id, unit.id);

update public.manager_units unit
set status = 'reserved',
    updated_at = now()
where unit.status <> 'inactive'
  and unit.status <> 'reserved'
  and not public.manager_unit_has_current_tenant(unit.organization_id, unit.id)
  and exists (
    select 1
    from public.manager_tenant_onboarding_requests request
    where request.organization_id = unit.organization_id
      and request.unit_id = unit.id
      and request.status in (
        'pending',
        'submitted',
        'agreement_sent',
        'agreement_accepted',
        'payment_initialized'
      )
  );

update public.manager_units unit
set status = 'vacant',
    updated_at = now()
where unit.status not in ('inactive', 'vacant')
  and not public.manager_unit_has_current_tenant(unit.organization_id, unit.id)
  and not exists (
    select 1
    from public.manager_tenant_onboarding_requests request
    where request.organization_id = unit.organization_id
      and request.unit_id = unit.id
      and request.status in (
        'pending',
        'submitted',
        'agreement_sent',
        'agreement_accepted',
        'payment_initialized'
      )
  );

do $$
begin
  if exists (
    select 1
    from public.manager_tenants
    where status in ('active', 'eviction_notice')
    group by organization_id, unit_id
    having count(*) > 1
  ) then
    raise exception
      'Cannot create manager_tenants_one_current_per_unit_idx until duplicate current tenants are repaired.';
  end if;
end $$;

create unique index if not exists manager_tenants_one_current_per_unit_idx
  on public.manager_tenants (organization_id, unit_id)
  where status in ('active', 'eviction_notice');

do $$
begin
  if exists (
    select 1
    from public.manager_tenant_onboarding_requests
    where status in (
      'pending',
      'submitted',
      'agreement_sent',
      'agreement_accepted',
      'payment_initialized'
    )
    group by organization_id, unit_id
    having count(*) > 1
  ) then
    raise exception
      'Cannot create manager_tenant_onboarding_one_open_per_unit_idx until duplicate open onboarding requests are repaired.';
  end if;
end $$;

create unique index if not exists manager_tenant_onboarding_one_open_per_unit_idx
  on public.manager_tenant_onboarding_requests (organization_id, unit_id)
  where status in (
    'pending',
    'submitted',
    'agreement_sent',
    'agreement_accepted',
    'payment_initialized'
  );
