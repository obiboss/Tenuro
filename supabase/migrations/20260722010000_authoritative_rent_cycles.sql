-- Authoritative unit rent configuration and move-in anchored rent cycles.
-- The payment date remains a transaction date and never changes the cycle anchor.

alter table public.units
  add column if not exists rent_frequency public.payment_frequency,
  add column if not exists rent_amount numeric(14, 2);

update public.units unit
set
  rent_frequency = coalesce(
    unit.rent_frequency,
    (
      select tenancy.payment_frequency
      from public.tenancies tenancy
      where tenancy.unit_id = unit.id
        and tenancy.status = 'active'
        and tenancy.deleted_at is null
        and tenancy.archived_at is null
      order by tenancy.created_at desc
      limit 1
    ),
    case
      when coalesce(unit.annual_rent, 0) > 0 then 'annual'::public.payment_frequency
      when coalesce(unit.monthly_rent, 0) > 0 then 'monthly'::public.payment_frequency
      else 'annual'::public.payment_frequency
    end
  ),
  rent_amount = coalesce(
    nullif(unit.rent_amount, 0),
    (
      select nullif(tenancy.rent_amount, 0)
      from public.tenancies tenancy
      where tenancy.unit_id = unit.id
        and tenancy.status = 'active'
        and tenancy.deleted_at is null
        and tenancy.archived_at is null
      order by tenancy.created_at desc
      limit 1
    ),
    case
      when coalesce(unit.annual_rent, 0) > 0 then unit.annual_rent
      when coalesce(unit.monthly_rent, 0) > 0 then unit.monthly_rent
      else 0
    end
  );

alter table public.units
  alter column rent_frequency set default 'annual'::public.payment_frequency,
  alter column rent_frequency set not null,
  alter column rent_amount set default 0,
  alter column rent_amount set not null;

alter table public.units
  drop constraint if exists units_rent_amount_non_negative_check;
alter table public.units
  add constraint units_rent_amount_non_negative_check check (rent_amount >= 0);

create or replace function public.sync_unit_authoritative_rent_configuration()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.rent_frequency is null then
    new.rent_frequency := case
      when coalesce(new.annual_rent, 0) > 0 then 'annual'::public.payment_frequency
      when coalesce(new.monthly_rent, 0) > 0 then 'monthly'::public.payment_frequency
      else 'annual'::public.payment_frequency
    end;
  end if;

  if new.rent_amount is null or new.rent_amount <= 0 then
    new.rent_amount := case
      when new.rent_frequency = 'annual' then coalesce(new.annual_rent, 0)
      when new.rent_frequency = 'monthly' then coalesce(new.monthly_rent, 0)
      else 0
    end;
  end if;

  if new.rent_frequency = 'annual' then
    new.annual_rent := new.rent_amount;
    new.monthly_rent := null;
  elsif new.rent_frequency = 'monthly' then
    new.monthly_rent := new.rent_amount;
    new.annual_rent := null;
  else
    new.annual_rent := null;
    new.monthly_rent := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_unit_authoritative_rent_configuration_trigger on public.units;
create trigger sync_unit_authoritative_rent_configuration_trigger
before insert or update of rent_frequency, rent_amount, annual_rent, monthly_rent
on public.units
for each row execute function public.sync_unit_authoritative_rent_configuration();

-- Normalize existing rows after installing the compatibility trigger.
update public.units set rent_amount = rent_amount;

-- Agent-submitted listings can later become landlord units, so they use the
-- same single authoritative rent configuration before conversion.
alter table public.agent_property_listings
  add column if not exists rent_frequency public.payment_frequency,
  add column if not exists rent_amount numeric(14, 2);

update public.agent_property_listings
set
  rent_frequency = coalesce(
    rent_frequency,
    case
      when coalesce(annual_rent, 0) > 0 then 'annual'::public.payment_frequency
      when coalesce(monthly_rent, 0) > 0 then 'monthly'::public.payment_frequency
      else 'annual'::public.payment_frequency
    end
  ),
  rent_amount = coalesce(
    nullif(rent_amount, 0),
    case
      when coalesce(annual_rent, 0) > 0 then annual_rent
      when coalesce(monthly_rent, 0) > 0 then monthly_rent
      else 0
    end
  );

alter table public.agent_property_listings
  alter column rent_frequency set default 'annual'::public.payment_frequency,
  alter column rent_frequency set not null,
  alter column rent_amount set default 0,
  alter column rent_amount set not null;

alter table public.agent_property_listings
  drop constraint if exists agent_property_listings_rent_amount_non_negative_check;
alter table public.agent_property_listings
  add constraint agent_property_listings_rent_amount_non_negative_check
  check (rent_amount >= 0);

create or replace function public.sync_agent_listing_authoritative_rent_configuration()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.rent_frequency is null then
    new.rent_frequency := case
      when coalesce(new.annual_rent, 0) > 0 then 'annual'::public.payment_frequency
      when coalesce(new.monthly_rent, 0) > 0 then 'monthly'::public.payment_frequency
      else 'annual'::public.payment_frequency
    end;
  end if;

  if new.rent_amount is null or new.rent_amount <= 0 then
    new.rent_amount := case
      when new.rent_frequency = 'annual' then coalesce(new.annual_rent, 0)
      when new.rent_frequency = 'monthly' then coalesce(new.monthly_rent, 0)
      else 0
    end;
  end if;

  if new.rent_frequency = 'annual' then
    new.annual_rent := new.rent_amount;
    new.monthly_rent := null;
  elsif new.rent_frequency = 'monthly' then
    new.monthly_rent := new.rent_amount;
    new.annual_rent := null;
  else
    new.annual_rent := null;
    new.monthly_rent := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_agent_listing_authoritative_rent_configuration_trigger
on public.agent_property_listings;
create trigger sync_agent_listing_authoritative_rent_configuration_trigger
before insert or update of rent_frequency, rent_amount, annual_rent, monthly_rent
on public.agent_property_listings
for each row execute function public.sync_agent_listing_authoritative_rent_configuration();

update public.agent_property_listings set rent_amount = rent_amount;

alter table public.manager_units
  add column if not exists rent_frequency public.payment_frequency;

with latest_frequency as (
  select distinct on (request.unit_id)
    request.unit_id,
    case
      when request.tenant_payment_frequency in (
        'monthly', 'quarterly', 'biannual', 'annual'
      ) then request.tenant_payment_frequency::public.payment_frequency
      else 'annual'::public.payment_frequency
    end as tenant_payment_frequency
  from public.manager_tenant_onboarding_requests request
  where request.tenant_payment_frequency is not null
  order by request.unit_id, request.updated_at desc nulls last, request.created_at desc
)
update public.manager_units unit
set rent_frequency = latest_frequency.tenant_payment_frequency
from latest_frequency
where unit.id = latest_frequency.unit_id
  and unit.rent_frequency is null;

update public.manager_units
set rent_frequency = coalesce(
  rent_frequency,
  'annual'::public.payment_frequency
);

alter table public.manager_units
  alter column rent_frequency set default 'annual'::public.payment_frequency,
  alter column rent_frequency set not null;

alter table public.manager_tenants
  add column if not exists payment_frequency public.payment_frequency,
  add column if not exists rent_cycle_anchor_date date,
  add column if not exists current_period_start date,
  add column if not exists current_period_end date;

update public.manager_tenants tenant
set
  payment_frequency = coalesce(
    tenant.payment_frequency,
    unit.rent_frequency,
    'annual'::public.payment_frequency
  ),
  rent_cycle_anchor_date = coalesce(
    tenant.rent_cycle_anchor_date,
    tenant.move_in_date
  )
from public.manager_units unit
where unit.id = tenant.unit_id;

alter table public.manager_tenants
  alter column payment_frequency set default 'annual'::public.payment_frequency,
  alter column payment_frequency set not null;

create or replace function public.bopa_lagos_current_date()
returns date
language sql
stable
set search_path to 'public'
as $$
  select (now() at time zone 'Africa/Lagos')::date;
$$;

create or replace function public.bopa_rent_frequency_months(
  p_frequency public.payment_frequency
)
returns integer
language sql
immutable
strict
set search_path to 'public'
as $$
  select case p_frequency
    when 'monthly' then 1
    when 'quarterly' then 3
    when 'biannual' then 6
    else 12
  end;
$$;

create or replace function public.bopa_anchored_cycle_date(
  p_anchor date,
  p_frequency public.payment_frequency,
  p_cycle_index integer
)
returns date
language plpgsql
immutable
strict
set search_path to 'public'
as $$
declare
  v_month_start date;
  v_last_day date;
  v_anchor_day integer;
begin
  if p_cycle_index < 0 then
    raise exception 'Rent cycle index cannot be negative.';
  end if;

  v_month_start := (
    date_trunc('month', p_anchor)::date
    + make_interval(months => public.bopa_rent_frequency_months(p_frequency) * p_cycle_index)
  )::date;
  v_last_day := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_anchor_day := extract(day from p_anchor)::integer;

  return make_date(
    extract(year from v_month_start)::integer,
    extract(month from v_month_start)::integer,
    least(v_anchor_day, extract(day from v_last_day)::integer)
  );
end;
$$;

create or replace function public.bopa_rent_cycle_index(
  p_anchor date,
  p_frequency public.payment_frequency,
  p_cycle_date date
)
returns integer
language plpgsql
immutable
strict
set search_path to 'public'
as $$
declare
  v_month_difference integer;
  v_frequency_months integer;
  v_index integer;
begin
  if p_cycle_date < p_anchor then
    return null;
  end if;

  v_frequency_months := public.bopa_rent_frequency_months(p_frequency);
  v_month_difference :=
    (extract(year from p_cycle_date)::integer - extract(year from p_anchor)::integer) * 12
    + (extract(month from p_cycle_date)::integer - extract(month from p_anchor)::integer);
  v_index := floor(v_month_difference::numeric / v_frequency_months)::integer;

  if public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index) = p_cycle_date then
    return v_index;
  end if;

  if public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index + 1) = p_cycle_date then
    return v_index + 1;
  end if;

  return null;
end;
$$;

create or replace function public.bopa_current_rent_cycle_index(
  p_anchor date,
  p_frequency public.payment_frequency,
  p_reference_date date default public.bopa_lagos_current_date()
)
returns integer
language plpgsql
stable
strict
set search_path to 'public'
as $$
declare
  v_frequency_months integer;
  v_month_difference integer;
  v_index integer;
begin
  if p_reference_date <= p_anchor then
    return 0;
  end if;

  v_frequency_months := public.bopa_rent_frequency_months(p_frequency);
  v_month_difference :=
    (extract(year from p_reference_date)::integer - extract(year from p_anchor)::integer) * 12
    + (extract(month from p_reference_date)::integer - extract(month from p_anchor)::integer);
  v_index := greatest(0, floor(v_month_difference::numeric / v_frequency_months)::integer);

  while v_index > 0 and public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index) > p_reference_date loop
    v_index := v_index - 1;
  end loop;

  while public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index + 1) <= p_reference_date loop
    v_index := v_index + 1;
  end loop;

  return v_index;
end;
$$;

create or replace function public.bopa_next_rent_due_date(
  p_anchor date,
  p_frequency public.payment_frequency,
  p_reference_date date default public.bopa_lagos_current_date()
)
returns date
language plpgsql
stable
strict
set search_path to 'public'
as $$
declare
  v_index integer;
  v_current_start date;
begin
  v_index := public.bopa_current_rent_cycle_index(p_anchor, p_frequency, p_reference_date);
  v_current_start := public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index);

  if v_index >= 1 and v_current_start = p_reference_date then
    return v_current_start;
  end if;

  return public.bopa_anchored_cycle_date(p_anchor, p_frequency, v_index + 1);
end;
$$;

create or replace function public.bopa_current_rent_due_date(
  p_anchor date,
  p_frequency public.payment_frequency,
  p_reference_date date default public.bopa_lagos_current_date()
)
returns date
language plpgsql
stable
strict
set search_path to 'public'
as $$
declare
  v_first_due date;
  v_index integer;
  v_current_start date;
begin
  v_first_due := public.bopa_anchored_cycle_date(p_anchor, p_frequency, 1);

  if p_reference_date < v_first_due then
    return v_first_due;
  end if;

  v_index := public.bopa_current_rent_cycle_index(
    p_anchor,
    p_frequency,
    p_reference_date
  );
  v_current_start := public.bopa_anchored_cycle_date(
    p_anchor,
    p_frequency,
    v_index
  );

  if v_current_start = p_anchor then
    return v_first_due;
  end if;

  return v_current_start;
end;
$$;

-- Complete the Manager tenancy backfill after the anchored date helpers exist.
update public.manager_tenants tenant
set
  payment_frequency = unit.rent_frequency,
  rent_amount = unit.rent_amount,
  rent_cycle_anchor_date = coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
  current_period_start = public.bopa_anchored_cycle_date(
    coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
    unit.rent_frequency,
    public.bopa_current_rent_cycle_index(
      coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
      unit.rent_frequency,
      public.bopa_lagos_current_date()
    )
  ),
  current_period_end = (
    public.bopa_anchored_cycle_date(
      coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
      unit.rent_frequency,
      public.bopa_current_rent_cycle_index(
        coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
        unit.rent_frequency,
        public.bopa_lagos_current_date()
      ) + 1
    ) - 1
  ),
  next_rent_due_date = case
    when tenant.status in ('active', 'eviction_notice')
      and coalesce(tenant.current_balance, 0) > 0
      then public.bopa_current_rent_due_date(
        coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
        unit.rent_frequency,
        public.bopa_lagos_current_date()
      )
    else public.bopa_next_rent_due_date(
      coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date),
      unit.rent_frequency,
      public.bopa_lagos_current_date()
    )
  end
from public.manager_units unit
where unit.id = tenant.unit_id
  and coalesce(tenant.rent_cycle_anchor_date, tenant.move_in_date) is not null;

-- Existing Landlord tenancies adopt the selected unit's authoritative rent
-- terms. Their current period is kept only when it is a valid anchored cycle.
update public.tenancies tenancy
set
  rent_amount = unit.rent_amount,
  payment_frequency = unit.rent_frequency,
  current_period_start = case
    when public.bopa_rent_cycle_index(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      unit.rent_frequency,
      coalesce(tenancy.current_period_start, tenancy.start_date)
    ) is not null
      then coalesce(tenancy.current_period_start, tenancy.start_date)
    else public.bopa_anchored_cycle_date(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      unit.rent_frequency,
      public.bopa_current_rent_cycle_index(
        coalesce(tenancy.move_in_date, tenancy.start_date),
        unit.rent_frequency,
        public.bopa_lagos_current_date()
      )
    )
  end
from public.units unit
where unit.id = tenancy.unit_id
  and coalesce(tenancy.move_in_date, tenancy.start_date) is not null;

update public.tenancies tenancy
set
  current_period_end = (
    public.bopa_anchored_cycle_date(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      tenancy.payment_frequency,
      public.bopa_rent_cycle_index(
        coalesce(tenancy.move_in_date, tenancy.start_date),
        tenancy.payment_frequency,
        tenancy.current_period_start
      ) + 1
    ) - 1
  ),
  end_date = (
    public.bopa_anchored_cycle_date(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      tenancy.payment_frequency,
      public.bopa_rent_cycle_index(
        coalesce(tenancy.move_in_date, tenancy.start_date),
        tenancy.payment_frequency,
        tenancy.current_period_start
      ) + 1
    ) - 1
  ),
  next_rent_charge_date = public.bopa_anchored_cycle_date(
    coalesce(tenancy.move_in_date, tenancy.start_date),
    tenancy.payment_frequency,
    public.bopa_rent_cycle_index(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      tenancy.payment_frequency,
      tenancy.current_period_start
    ) + 1
  ),
  next_renewal_date = public.bopa_anchored_cycle_date(
    coalesce(tenancy.move_in_date, tenancy.start_date),
    tenancy.payment_frequency,
    public.bopa_rent_cycle_index(
      coalesce(tenancy.move_in_date, tenancy.start_date),
      tenancy.payment_frequency,
      tenancy.current_period_start
    ) + 1
  )
where tenancy.current_period_start is not null
  and coalesce(tenancy.move_in_date, tenancy.start_date) is not null;

-- Once a unit has a current tenant, its rent configuration is part of that
-- tenancy and cannot be changed underneath the occupant.
create or replace function public.guard_occupied_unit_rent_configuration()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.rent_frequency is not distinct from old.rent_frequency
    and new.rent_amount is not distinct from old.rent_amount
  then
    return new;
  end if;

  if exists (
    select 1
    from public.tenancies tenancy
    where tenancy.unit_id = old.id
      and tenancy.status = 'active'
      and tenancy.deleted_at is null
      and tenancy.archived_at is null
  ) then
    raise exception 'Move the current tenant out before changing this unit rent configuration.';
  end if;

  return new;
end;
$$;

drop trigger if exists unit_rent_configuration_lock on public.units;
create trigger unit_rent_configuration_lock
before update of rent_frequency, rent_amount, annual_rent, monthly_rent
on public.units
for each row execute function public.guard_occupied_unit_rent_configuration();

create or replace function public.guard_manager_unit_rent_configuration()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.rent_frequency is not distinct from old.rent_frequency
    and new.rent_amount is not distinct from old.rent_amount
  then
    return new;
  end if;

  if public.manager_unit_has_current_tenant(old.organization_id, old.id)
    or exists (
      select 1
      from public.manager_tenant_onboarding_requests request
      where request.organization_id = old.organization_id
        and request.unit_id = old.id
        and request.status in (
          'pending', 'submitted', 'agreement_sent',
          'agreement_accepted', 'payment_initialized'
        )
    )
  then
    raise exception 'Complete or cancel the current tenant setup before changing this unit rent configuration.';
  end if;

  return new;
end;
$$;

drop trigger if exists manager_unit_rent_configuration_lock on public.manager_units;
create trigger manager_unit_rent_configuration_lock
before update of rent_frequency, rent_amount
on public.manager_units
for each row execute function public.guard_manager_unit_rent_configuration();

-- Keep every Manager tenant tied to the unit's authoritative rent terms.
create or replace function public.guard_manager_tenant_authoritative_rent()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_unit public.manager_units%rowtype;
  v_cycle_index integer;
begin
  if tg_op = 'UPDATE'
    and old.rent_cycle_anchor_date is not null
    and (
      new.rent_cycle_anchor_date is distinct from old.rent_cycle_anchor_date
      or new.move_in_date is distinct from old.move_in_date
    )
  then
    raise exception 'The original move-in date is the permanent rent-cycle anchor and cannot be changed.';
  end if;

  select * into v_unit
  from public.manager_units
  where id = new.unit_id
    and organization_id = new.organization_id
    and landlord_client_id = new.landlord_client_id
    and property_id = new.property_id;

  if not found then
    raise exception 'The selected manager unit could not be verified.';
  end if;

  new.rent_amount := v_unit.rent_amount;
  new.payment_frequency := v_unit.rent_frequency;
  new.rent_cycle_anchor_date := coalesce(new.move_in_date, new.rent_cycle_anchor_date);

  if new.rent_cycle_anchor_date is not null then
    v_cycle_index := public.bopa_current_rent_cycle_index(
      new.rent_cycle_anchor_date,
      new.payment_frequency,
      public.bopa_lagos_current_date()
    );
    new.current_period_start := public.bopa_anchored_cycle_date(
      new.rent_cycle_anchor_date,
      new.payment_frequency,
      v_cycle_index
    );
    new.current_period_end := (
      public.bopa_anchored_cycle_date(
        new.rent_cycle_anchor_date,
        new.payment_frequency,
        v_cycle_index + 1
      ) - 1
    );
    new.next_rent_due_date := case
      when new.status in ('active', 'eviction_notice')
        then public.bopa_current_rent_due_date(
          new.rent_cycle_anchor_date,
          new.payment_frequency,
          public.bopa_lagos_current_date()
        )
      else public.bopa_next_rent_due_date(
        new.rent_cycle_anchor_date,
        new.payment_frequency,
        public.bopa_lagos_current_date()
      )
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists manager_tenant_authoritative_rent_guard on public.manager_tenants;
create trigger manager_tenant_authoritative_rent_guard
before insert or update of unit_id, move_in_date, rent_amount, payment_frequency, rent_cycle_anchor_date
on public.manager_tenants
for each row execute function public.guard_manager_tenant_authoritative_rent();

-- Keep every Landlord tenancy tied to the selected unit's authoritative terms.
create or replace function public.guard_tenancy_authoritative_unit_rent()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_unit public.units%rowtype;
  v_anchor date;
  v_period_start date;
  v_cycle_index integer;
begin
  if tg_op = 'UPDATE'
    and coalesce(old.move_in_date, old.start_date) is not null
    and coalesce(new.move_in_date, new.start_date)
      is distinct from coalesce(old.move_in_date, old.start_date)
  then
    raise exception 'The original move-in date is the permanent rent-cycle anchor and cannot be changed.';
  end if;

  select * into v_unit from public.units where id = new.unit_id;
  if not found then
    raise exception 'The selected unit could not be verified.';
  end if;

  if v_unit.rent_amount <= 0 then
    raise exception 'Set the unit rent before creating the tenancy.';
  end if;

  new.rent_amount := v_unit.rent_amount;
  new.payment_frequency := v_unit.rent_frequency;
  v_anchor := coalesce(new.move_in_date, new.start_date);

  if v_anchor is null then
    raise exception 'Set the agreed move-in date before creating the tenancy.';
  end if;

  new.move_in_date := v_anchor;
  new.start_date := v_anchor;
  new.rent_due_day := extract(day from v_anchor)::integer;
  new.rent_anchor_month := extract(month from v_anchor)::integer;
  v_period_start := coalesce(new.current_period_start, v_anchor);
  v_cycle_index := public.bopa_rent_cycle_index(
    v_anchor,
    new.payment_frequency,
    v_period_start
  );

  if v_cycle_index is null then
    v_cycle_index := public.bopa_current_rent_cycle_index(
      v_anchor,
      new.payment_frequency,
      public.bopa_lagos_current_date()
    );
    v_period_start := public.bopa_anchored_cycle_date(
      v_anchor,
      new.payment_frequency,
      v_cycle_index
    );
  end if;

  new.current_period_start := v_period_start;
  new.current_period_end := (
    public.bopa_anchored_cycle_date(
      v_anchor,
      new.payment_frequency,
      v_cycle_index + 1
    ) - 1
  );
  new.end_date := new.current_period_end;
  new.next_rent_charge_date := public.bopa_anchored_cycle_date(
    v_anchor,
    new.payment_frequency,
    v_cycle_index + 1
  );
  new.next_renewal_date := new.next_rent_charge_date;

  return new;
end;
$$;

drop trigger if exists tenancy_authoritative_unit_rent_guard on public.tenancies;
create trigger tenancy_authoritative_unit_rent_guard
before insert or update of unit_id, rent_amount, payment_frequency, move_in_date, start_date
on public.tenancies
for each row execute function public.guard_tenancy_authoritative_unit_rent();

-- Recreate the offline Manager tenant RPC with the same signature. Submitted
-- rent and due-date values are ignored; the unit and move-in date are authoritative.
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

-- Manager payment posting advances a cycle only from the original anchor.
create or replace function public.apply_manager_rent_payment_cycle()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant public.manager_tenants%rowtype;
  v_credit numeric(14, 2);
  v_balance_before numeric(14, 2);
  v_balance_after numeric(14, 2);
  v_target_start date;
  v_target_index integer;
  v_target_end date;
  v_following_due_date date;
begin
  if new.status not in ('recorded', 'verified') then
    return new;
  end if;

  if coalesce((new.metadata ->> 'rent_cycle_applied')::boolean, false) then
    return new;
  end if;

  select * into v_tenant
  from public.manager_tenants
  where id = new.tenant_id
  for update;

  if not found or v_tenant.rent_cycle_anchor_date is null then
    return new;
  end if;

  v_credit := greatest(0, coalesce(new.base_rent_amount, new.amount_paid, 0));
  v_balance_before := greatest(0, coalesce(v_tenant.current_balance, 0));
  v_target_start := coalesce(
    new.period_start,
    v_tenant.next_rent_due_date,
    public.bopa_current_rent_due_date(
      v_tenant.rent_cycle_anchor_date,
      v_tenant.payment_frequency,
      new.payment_date
    )
  );
  v_target_index := public.bopa_rent_cycle_index(
    v_tenant.rent_cycle_anchor_date,
    v_tenant.payment_frequency,
    v_target_start
  );

  if v_target_index is null then
    v_target_start := public.bopa_current_rent_due_date(
      v_tenant.rent_cycle_anchor_date,
      v_tenant.payment_frequency,
      new.payment_date
    );
    v_target_index := public.bopa_rent_cycle_index(
      v_tenant.rent_cycle_anchor_date,
      v_tenant.payment_frequency,
      v_target_start
    );
  end if;

  v_target_end := (
    public.bopa_anchored_cycle_date(
      v_tenant.rent_cycle_anchor_date,
      v_tenant.payment_frequency,
      v_target_index + 1
    ) - 1
  );
  v_following_due_date := public.bopa_anchored_cycle_date(
    v_tenant.rent_cycle_anchor_date,
    v_tenant.payment_frequency,
    v_target_index + 1
  );

  if v_balance_before > 0 then
    v_balance_after := greatest(0, v_balance_before - v_credit);
  else
    v_balance_after := greatest(0, v_tenant.rent_amount - v_credit);
  end if;

  v_tenant.current_period_start := v_target_start;
  v_tenant.current_period_end := v_target_end;
  v_tenant.next_rent_due_date := case
    when v_balance_after = 0 then v_following_due_date
    else v_target_start
  end;

  update public.manager_tenants
  set current_balance = v_balance_after,
      current_period_start = v_tenant.current_period_start,
      current_period_end = v_tenant.current_period_end,
      next_rent_due_date = v_tenant.next_rent_due_date,
      updated_at = now()
  where id = v_tenant.id;

  update public.manager_rent_payments
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'rent_cycle_applied', true,
    'rent_cycle_anchor_date', v_tenant.rent_cycle_anchor_date,
    'payment_frequency', v_tenant.payment_frequency,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'current_period_start', v_tenant.current_period_start,
    'current_period_end', v_tenant.current_period_end,
    'next_rent_due_date', v_tenant.next_rent_due_date
  )
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists apply_manager_rent_payment_cycle_trigger on public.manager_rent_payments;
create trigger apply_manager_rent_payment_cycle_trigger
after insert or update of status, base_rent_amount
on public.manager_rent_payments
for each row execute function public.apply_manager_rent_payment_cycle();

-- Renewal periods are always derived from the original move-in/start anchor.
create or replace function public.renew_tenancy_period(p_tenancy_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenancy record;
  v_anchor date;
  v_current_index integer;
  v_new_period_start date;
  v_new_period_end date;
  v_next_charge_date date;
  v_renewal_notice_date date;
begin
  select * into v_tenancy
  from public.tenancies
  where id = p_tenancy_id
    and status = 'active'
    and deleted_at is null
    and archived_at is null
  for update;

  if not found then
    raise exception 'Active tenancy was not found.';
  end if;

  if auth.uid() is not null and auth.uid() <> v_tenancy.landlord_id then
    raise exception 'You do not have permission to renew this tenancy.';
  end if;

  v_anchor := coalesce(v_tenancy.move_in_date, v_tenancy.start_date);
  v_current_index := public.bopa_rent_cycle_index(
    v_anchor,
    v_tenancy.payment_frequency,
    coalesce(v_tenancy.current_period_start, v_tenancy.start_date)
  );

  if v_current_index is null then
    v_current_index := public.bopa_current_rent_cycle_index(
      v_anchor,
      v_tenancy.payment_frequency,
      public.bopa_lagos_current_date()
    );
  end if;

  v_new_period_start := public.bopa_anchored_cycle_date(
    v_anchor, v_tenancy.payment_frequency, v_current_index + 1
  );
  v_next_charge_date := public.bopa_anchored_cycle_date(
    v_anchor, v_tenancy.payment_frequency, v_current_index + 2
  );
  v_new_period_end := v_next_charge_date - 1;
  v_renewal_notice_date := (
    v_new_period_end - make_interval(days => coalesce(v_tenancy.notice_period_days, 90))
  )::date;

  if exists (
    select 1 from public.ledger_entries le
    where le.tenancy_id = v_tenancy.id
      and le.entry_type = 'rent_charge'
      and le.direction = 'debit'
      and le.metadata ->> 'period_start' = v_new_period_start::text
      and le.metadata ->> 'period_end' = v_new_period_end::text
  ) then
    raise exception 'This tenancy has already been renewed for the next period.';
  end if;

  update public.tenancies
  set current_period_start = v_new_period_start,
      current_period_end = v_new_period_end,
      end_date = v_new_period_end,
      move_out_date = v_new_period_end,
      next_rent_charge_date = v_next_charge_date,
      next_renewal_date = v_next_charge_date,
      renewal_notice_date = v_renewal_notice_date,
      updated_at = now()
  where id = v_tenancy.id;

  insert into public.ledger_entries (
    landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction,
    amount, currency_code, description, entry_date, metadata
  ) values (
    v_tenancy.landlord_id, v_tenancy.tenant_id, v_tenancy.id, null,
    'rent_charge', 'debit', v_tenancy.rent_amount, v_tenancy.currency_code,
    'Renewal rent charged for tenancy ' || v_tenancy.tenancy_reference,
    v_new_period_start::timestamptz,
    jsonb_build_object(
      'tenancy_reference', v_tenancy.tenancy_reference,
      'payment_frequency', v_tenancy.payment_frequency,
      'rent_cycle_anchor_date', v_anchor,
      'period_start', v_new_period_start,
      'period_end', v_new_period_end,
      'source', 'manual_renewal_charge'
    )
  );

  return v_tenancy.id;
end;
$$;

create or replace function public.post_due_rent_charges(p_run_date date default public.bopa_lagos_current_date())
returns table(
  tenancy_id uuid,
  landlord_id uuid,
  tenant_id uuid,
  unit_id uuid,
  ledger_entry_id uuid,
  rent_amount numeric,
  currency_code text,
  period_start date,
  period_end date,
  next_rent_charge_date date
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenancy record;
  v_anchor date;
  v_cycle_index integer;
  v_period_start date;
  v_period_end date;
  v_next_charge_date date;
  v_ledger_entry_id uuid;
begin
  for v_tenancy in
    select t.* from public.tenancies t
    where t.status = 'active'
      and t.tenancy_status = 'active'
      and t.deleted_at is null
      and t.archived_at is null
      and t.next_rent_charge_date is not null
      and t.next_rent_charge_date <= p_run_date
    order by t.next_rent_charge_date asc, t.created_at asc
  loop
    v_anchor := coalesce(v_tenancy.move_in_date, v_tenancy.start_date);
    v_period_start := v_tenancy.next_rent_charge_date;

    -- Catch up every missed period in one run while still calculating each
    -- period directly from the original anchor.
    while v_period_start <= p_run_date loop
      v_cycle_index := public.bopa_rent_cycle_index(
        v_anchor, v_tenancy.payment_frequency, v_period_start
      );

      if v_cycle_index is null then
        v_period_start := public.bopa_next_rent_due_date(
          v_anchor, v_tenancy.payment_frequency, v_period_start
        );
        v_cycle_index := public.bopa_rent_cycle_index(
          v_anchor, v_tenancy.payment_frequency, v_period_start
        );
      end if;

      v_next_charge_date := public.bopa_anchored_cycle_date(
        v_anchor, v_tenancy.payment_frequency, v_cycle_index + 1
      );
      v_period_end := v_next_charge_date - 1;

      insert into public.ledger_entries (
        landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction,
        amount, currency_code, description, entry_date, period_start, period_end, metadata
      ) values (
        v_tenancy.landlord_id, v_tenancy.tenant_id, v_tenancy.id, null,
        'rent_charge', 'debit', v_tenancy.rent_amount, v_tenancy.currency_code::text,
        'Rent charge posted for renewal period', now(), v_period_start, v_period_end,
        jsonb_build_object(
          'source', 'automatic_renewal_charge',
          'rent_cycle_anchor_date', v_anchor,
          'period_start', v_period_start,
          'period_end', v_period_end,
          'next_rent_charge_date', v_next_charge_date,
          'payment_frequency', v_tenancy.payment_frequency
        )
      )
      on conflict do nothing
      returning id into v_ledger_entry_id;

      -- Advance the pointer even when the charge already existed, so a stale
      -- tenancy row cannot remain trapped on an old due date.
      update public.tenancies
      set current_period_start = v_period_start,
          current_period_end = v_period_end,
          end_date = v_period_end,
          move_out_date = v_period_end,
          next_rent_charge_date = v_next_charge_date,
          next_renewal_date = v_next_charge_date,
          renewal_notice_date = (
            v_next_charge_date - make_interval(days => coalesce(v_tenancy.notice_period_days, 90))
          )::date,
          updated_at = now()
      where id = v_tenancy.id;

      if v_ledger_entry_id is not null then
        tenancy_id := v_tenancy.id;
        landlord_id := v_tenancy.landlord_id;
        tenant_id := v_tenancy.tenant_id;
        unit_id := v_tenancy.unit_id;
        ledger_entry_id := v_ledger_entry_id;
        rent_amount := v_tenancy.rent_amount;
        currency_code := v_tenancy.currency_code::text;
        period_start := v_period_start;
        period_end := v_period_end;
        next_rent_charge_date := v_next_charge_date;
        return next;
      end if;

      v_ledger_entry_id := null;
      v_period_start := v_next_charge_date;
    end loop;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
