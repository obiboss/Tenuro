-- Safe replay support for operational forms saved while offline.
-- Supabase remains authoritative; this function is callable only by service_role.

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
  if
    p_profile_id is null
    or p_organization_id is null
    or p_tenant_id is null
    or p_landlord_client_id is null
    or p_property_id is null
    or p_unit_id is null
    or nullif(btrim(p_full_name), '') is null
    or nullif(btrim(p_phone_number), '') is null
    or p_rent_amount is null
    or p_rent_amount < 0
    or p_current_balance is null
    or p_current_balance < 0
  then
    raise exception using
      errcode = '22023',
      message = 'The tenant details are incomplete or invalid.';
  end if;

  if
    p_move_in_date is not null
    and p_next_rent_due_date is not null
    and p_next_rent_due_date < p_move_in_date
  then
    raise exception using
      errcode = '22023',
      message = 'The next rent due date cannot be before the move-in date.';
  end if;

  select tenant.*
  into v_existing
  from public.manager_tenants tenant
  where tenant.id = p_tenant_id;

  if found then
    if
      v_existing.organization_id <> p_organization_id
      or v_existing.landlord_client_id <> p_landlord_client_id
      or v_existing.property_id <> p_property_id
      or v_existing.unit_id <> p_unit_id
    then
      raise exception using
        errcode = '23505',
        message = 'The offline tenant identifier is already in use.';
    end if;

    return to_jsonb(v_existing);
  end if;

  select
    case
      when organization.owner_profile_id = p_profile_id then 'owner'
      else staff.staff_role
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
    and (
      organization.owner_profile_id = p_profile_id
      or staff.id is not null
    )
  limit 1;

  if v_role is null then
    raise exception using
      errcode = '42501',
      message = 'The manager workspace is no longer available.';
  end if;

  if v_role not in ('owner', 'manager', 'property_officer') then
    raise exception using
      errcode = '42501',
      message = 'You do not have permission to add tenants.';
  end if;

  select unit.*
  into v_unit
  from public.manager_units unit
  where unit.id = p_unit_id
    and unit.organization_id = p_organization_id
    and unit.landlord_client_id = p_landlord_client_id
    and unit.property_id = p_property_id
  for update;

  if not found or v_unit.status <> 'vacant' then
    raise exception using
      errcode = '23514',
      message = 'This unit is no longer vacant.';
  end if;

  if not exists (
    select 1
    from public.manager_properties property
    where property.id = p_property_id
      and property.organization_id = p_organization_id
      and property.landlord_client_id = p_landlord_client_id
      and property.status = 'active'
  ) then
    raise exception using
      errcode = '23503',
      message = 'The selected property is no longer available.';
  end if;

  if not exists (
    select 1
    from public.manager_landlord_clients landlord
    where landlord.id = p_landlord_client_id
      and landlord.organization_id = p_organization_id
      and landlord.status = 'active'
  ) then
    raise exception using
      errcode = '23503',
      message = 'The selected landlord is no longer available.';
  end if;

  if public.manager_unit_has_current_tenant(p_organization_id, p_unit_id) then
    raise exception using
      errcode = '23505',
      message = 'This unit already has a current tenant.';
  end if;

  if exists (
    select 1
    from public.manager_tenant_onboarding_requests request
    where request.organization_id = p_organization_id
      and request.unit_id = p_unit_id
      and request.status in (
        'pending',
        'submitted',
        'agreement_sent',
        'agreement_accepted',
        'payment_initialized'
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'This unit already has an open tenant onboarding request.';
  end if;

  insert into public.manager_tenants (
    id,
    organization_id,
    landlord_client_id,
    property_id,
    unit_id,
    full_name,
    phone_number,
    email,
    occupation,
    rent_amount,
    current_balance,
    move_in_date,
    next_rent_due_date,
    status,
    notes
  )
  values (
    p_tenant_id,
    p_organization_id,
    p_landlord_client_id,
    p_property_id,
    p_unit_id,
    btrim(p_full_name),
    btrim(p_phone_number),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_occupation), ''),
    round(p_rent_amount, 2),
    round(p_current_balance, 2),
    p_move_in_date,
    p_next_rent_due_date,
    'active',
    nullif(btrim(p_notes), '')
  )
  returning * into v_tenant;

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

notify pgrst, 'reload schema';
