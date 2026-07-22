-- Existing tenants become active records without a compulsory new agreement.
-- Manager existing-tenant records retain their latest historical payment so the
-- rent position can distinguish outstanding rent from the next renewal date.

alter table public.manager_tenants
  add column if not exists last_payment_amount numeric(14, 2),
  add column if not exists last_payment_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_tenants_last_payment_amount_positive'
      and conrelid = 'public.manager_tenants'::regclass
  ) then
    alter table public.manager_tenants
      add constraint manager_tenants_last_payment_amount_positive
      check (last_payment_amount is null or last_payment_amount > 0);
  end if;
end $$;

-- Preserve payment history already captured through the Manager tenant link.
update public.manager_tenants tenant
set
  last_payment_amount = coalesce(
    tenant.last_payment_amount,
    request.existing_tenant_last_payment_amount
  ),
  last_payment_date = coalesce(
    tenant.last_payment_date,
    request.existing_tenant_last_payment_date
  )
from public.manager_tenant_onboarding_requests request
where request.approved_tenant_id = tenant.id
  and request.onboarding_type = 'current_occupant'
  and request.existing_tenant_last_payment_amount is not null
  and request.existing_tenant_last_payment_date is not null;

-- Correct migrated active tenants: an outstanding balance keeps the current
-- anchored due date, while a paid-up tenant points to the next renewal date.
update public.manager_tenants tenant
set next_rent_due_date = case
  when coalesce(tenant.current_balance, 0) > 0 then
    public.bopa_current_rent_due_date(
      tenant.rent_cycle_anchor_date,
      tenant.payment_frequency,
      public.bopa_lagos_current_date()
    )
  else
    public.bopa_next_rent_due_date(
      tenant.rent_cycle_anchor_date,
      tenant.payment_frequency,
      public.bopa_lagos_current_date()
    )
end
where tenant.rent_cycle_anchor_date is not null
  and tenant.status in ('active', 'eviction_notice');

-- Recreate the offline current-occupant function. The organization owner is an
-- organization relationship, not a manager_staff_role enum value, so both CASE
-- branches are explicitly converted to text. Paid-up occupants receive the next
-- anchored renewal date; occupants with a balance retain the current due date.
create or replace function public.create_manager_existing_tenant_offline(
  p_profile_id uuid,
  p_organization_id uuid,
  p_tenant_id uuid,
  p_landlord_client_id uuid,
  p_property_id uuid,
  p_unit_id uuid,
  p_full_name text,
  p_phone_number text,
  p_email text,
  p_occupation text,
  p_rent_amount numeric,
  p_current_balance numeric,
  p_move_in_date date,
  p_next_rent_due_date date,
  p_notes text,
  p_client_mutation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_existing public.manager_tenants%rowtype;
  v_unit public.manager_units%rowtype;
  v_role text;
  v_tenant public.manager_tenants%rowtype;
begin
  -- These legacy arguments remain in the RPC signature for deployed offline
  -- clients. The unit rent and anchored date calculation are authoritative.

  if p_profile_id is null or p_organization_id is null or p_tenant_id is null
    or p_landlord_client_id is null or p_property_id is null or p_unit_id is null
    or nullif(btrim(p_full_name), '') is null
    or nullif(btrim(p_phone_number), '') is null
    or p_current_balance is null or p_current_balance < 0
    or p_move_in_date is null
  then
    raise exception using errcode = '22023', message = 'The tenant details are incomplete or invalid.';
  end if;

  select * into v_existing from public.manager_tenants where id = p_tenant_id;
  if found then
    if v_existing.organization_id <> p_organization_id
      or v_existing.landlord_client_id <> p_landlord_client_id
      or v_existing.property_id <> p_property_id
      or v_existing.unit_id <> p_unit_id
    then
      raise exception using errcode = '23505', message = 'The offline tenant identifier is already in use.';
    end if;
    return to_jsonb(v_existing);
  end if;

  select case
    when organization.owner_profile_id = p_profile_id then 'owner'::text
    else staff.staff_role::text
  end
  into v_role
  from public.manager_organizations organization
  left join public.manager_staff_members staff
    on staff.organization_id = organization.id
    and staff.profile_id = p_profile_id
    and staff.status = 'active'
  join public.profiles profile
    on profile.id = p_profile_id
    and profile.role = 'manager'
    and profile.is_active = true
  where organization.id = p_organization_id
    and organization.status = 'active'
    and (organization.owner_profile_id = p_profile_id or staff.id is not null)
  limit 1;

  if v_role is null or v_role not in ('owner', 'manager', 'property_officer') then
    raise exception using errcode = '42501', message = 'You do not have permission to add tenants.';
  end if;

  select * into v_unit
  from public.manager_units
  where id = p_unit_id
    and organization_id = p_organization_id
    and landlord_client_id = p_landlord_client_id
    and property_id = p_property_id
  for update;

  if not found or v_unit.status <> 'vacant' then
    raise exception using errcode = '23514', message = 'This unit is no longer vacant.';
  end if;

  if not exists (
    select 1
    from public.manager_properties property
    where property.id = p_property_id
      and property.organization_id = p_organization_id
      and property.landlord_client_id = p_landlord_client_id
      and property.status = 'active'
  ) then
    raise exception using errcode = '23503', message = 'The selected property is no longer available.';
  end if;

  if not exists (
    select 1
    from public.manager_landlord_clients landlord
    where landlord.id = p_landlord_client_id
      and landlord.organization_id = p_organization_id
      and landlord.status = 'active'
  ) then
    raise exception using errcode = '23503', message = 'The selected landlord is no longer available.';
  end if;

  if v_unit.rent_amount <= 0 then
    raise exception using errcode = '23514', message = 'Set the unit rent before adding the tenant.';
  end if;

  if public.manager_unit_has_current_tenant(p_organization_id, p_unit_id) then
    raise exception using errcode = '23505', message = 'This unit already has a current tenant.';
  end if;

  if exists (
    select 1 from public.manager_tenant_onboarding_requests request
    where request.organization_id = p_organization_id
      and request.unit_id = p_unit_id
      and request.status in ('pending','submitted','agreement_sent','agreement_accepted','payment_initialized')
  ) then
    raise exception using errcode = '23505', message = 'This unit already has an open tenant onboarding request.';
  end if;

  insert into public.manager_tenants (
    id, organization_id, landlord_client_id, property_id, unit_id,
    full_name, phone_number, email, occupation, rent_amount,
    payment_frequency, rent_cycle_anchor_date, current_balance,
    move_in_date, next_rent_due_date, status, notes
  ) values (
    p_tenant_id, p_organization_id, p_landlord_client_id, p_property_id, p_unit_id,
    btrim(p_full_name), btrim(p_phone_number), nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_occupation), ''), v_unit.rent_amount,
    v_unit.rent_frequency, p_move_in_date, round(p_current_balance, 2),
    p_move_in_date,
    case
      when round(p_current_balance, 2) > 0 then
        public.bopa_current_rent_due_date(
          p_move_in_date,
          v_unit.rent_frequency,
          public.bopa_lagos_current_date()
        )
      else
        public.bopa_next_rent_due_date(
          p_move_in_date,
          v_unit.rent_frequency,
          public.bopa_lagos_current_date()
        )
    end,
    'active', nullif(btrim(p_notes), '')
  ) returning * into v_tenant;

  perform p_client_mutation_id;

  return to_jsonb(v_tenant);
end;
$$;

revoke all on function public.create_manager_existing_tenant_offline(
  uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text,
  numeric, numeric, date, date, text, uuid
) from public, anon, authenticated;
grant execute on function public.create_manager_existing_tenant_offline(
  uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, text,
  numeric, numeric, date, date, text, uuid
) to service_role;
