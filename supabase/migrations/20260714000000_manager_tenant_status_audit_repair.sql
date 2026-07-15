-- Manager tenant-status cleanup: audit helpers, targeted repair, and current-tenant protection.
-- This migration does not activate, delete, or hide legacy rows by itself.

create or replace function public.report_manager_legacy_tenant_status()
returns table (
  issue_type text,
  organization_id uuid,
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  tenant_status text,
  tenant_name text,
  details jsonb
)
language sql
stable
set search_path to 'public'
as $$
  select
    'inactive_tenant_record'::text as issue_type,
    tenant.organization_id,
    tenant.property_id,
    tenant.unit_id,
    tenant.id as tenant_id,
    tenant.status::text as tenant_status,
    tenant.full_name as tenant_name,
    jsonb_build_object(
      'move_in_date', tenant.move_in_date,
      'move_out_date', tenant.move_out_date,
      'next_rent_due_date', tenant.next_rent_due_date,
      'current_balance', tenant.current_balance
    ) as details
  from public.manager_tenants tenant
  where tenant.status = 'inactive'

  union all

  select
    'multiple_current_or_inactive_tenants_on_unit'::text as issue_type,
    tenant.organization_id,
    tenant.property_id,
    tenant.unit_id,
    tenant.id as tenant_id,
    tenant.status::text as tenant_status,
    tenant.full_name as tenant_name,
    jsonb_build_object(
      'tenant_count', unit_group.tenant_count,
      'current_count', unit_group.current_count,
      'inactive_count', unit_group.inactive_count
    ) as details
  from public.manager_tenants tenant
  join (
    select
      organization_id,
      unit_id,
      count(*) as tenant_count,
      count(*) filter (where status in ('active', 'eviction_notice')) as current_count,
      count(*) filter (where status = 'inactive') as inactive_count
    from public.manager_tenants
    where status in ('active', 'eviction_notice', 'inactive')
    group by organization_id, unit_id
    having count(*) > 1
  ) unit_group
    on unit_group.organization_id = tenant.organization_id
   and unit_group.unit_id = tenant.unit_id
  where tenant.status in ('active', 'eviction_notice', 'inactive')

  union all

  select
    'inactive_past_move_in_without_move_out'::text as issue_type,
    tenant.organization_id,
    tenant.property_id,
    tenant.unit_id,
    tenant.id as tenant_id,
    tenant.status::text as tenant_status,
    tenant.full_name as tenant_name,
    jsonb_build_object(
      'move_in_date', tenant.move_in_date,
      'next_rent_due_date', tenant.next_rent_due_date,
      'rent_amount', tenant.rent_amount
    ) as details
  from public.manager_tenants tenant
  where tenant.status = 'inactive'
    and tenant.move_in_date is not null
    and tenant.move_in_date <= current_date
    and tenant.move_out_date is null
$$;

create or replace function public.repair_manager_activate_confirmed_tenants(
  p_tenant_ids uuid[]
)
returns table (
  tenant_id uuid,
  unit_id uuid,
  activated boolean,
  message text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  target_tenant record;
  conflicting_tenant_id uuid;
begin
  if p_tenant_ids is null or cardinality(p_tenant_ids) = 0 then
    return;
  end if;

  for target_tenant in
    select *
    from public.manager_tenants
    where id = any(p_tenant_ids)
    for update
  loop
    if target_tenant.status in ('active', 'eviction_notice') then
      update public.manager_units
      set status = 'occupied',
          updated_at = now()
      where organization_id = target_tenant.organization_id
        and id = target_tenant.unit_id;

      tenant_id := target_tenant.id;
      unit_id := target_tenant.unit_id;
      activated := false;
      message := 'Tenant was already current; unit marked occupied.';
      return next;
      continue;
    end if;

    if target_tenant.status <> 'inactive' then
      tenant_id := target_tenant.id;
      unit_id := target_tenant.unit_id;
      activated := false;
      message := 'Tenant is not inactive and was not changed.';
      return next;
      continue;
    end if;

    if target_tenant.move_out_date is not null then
      tenant_id := target_tenant.id;
      unit_id := target_tenant.unit_id;
      activated := false;
      message := 'Tenant has a move-out date and was not changed.';
      return next;
      continue;
    end if;

    select current_tenant.id
    into conflicting_tenant_id
    from public.manager_tenants current_tenant
    where current_tenant.organization_id = target_tenant.organization_id
      and current_tenant.unit_id = target_tenant.unit_id
      and current_tenant.status in ('active', 'eviction_notice')
      and current_tenant.id <> target_tenant.id
    limit 1;

    if conflicting_tenant_id is not null then
      tenant_id := target_tenant.id;
      unit_id := target_tenant.unit_id;
      activated := false;
      message := 'Another current tenant is already assigned to this unit.';
      return next;
      continue;
    end if;

    update public.manager_tenants
    set status = 'active',
        updated_at = now()
    where id = target_tenant.id
      and organization_id = target_tenant.organization_id
      and status = 'inactive';

    update public.manager_units
    set status = 'occupied',
        updated_at = now()
    where organization_id = target_tenant.organization_id
      and id = target_tenant.unit_id;

    tenant_id := target_tenant.id;
    unit_id := target_tenant.unit_id;
    activated := true;
    message := 'Tenant activated and unit marked occupied.';
    return next;
  end loop;
end;
$$;

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
      'Cannot create manager_tenants_one_current_per_unit_idx until duplicate current tenants are repaired. Run public.report_manager_legacy_tenant_status().';
  end if;
end $$;

create unique index if not exists manager_tenants_one_current_per_unit_idx
  on public.manager_tenants (organization_id, unit_id)
  where status in ('active', 'eviction_notice');
