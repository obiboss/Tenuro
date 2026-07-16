begin;

alter table public.manager_property_service_charges
  add column if not exists charge_bearer text not null default 'tenant',
  add column if not exists billing_cycle text not null default 'one_time';

update public.manager_property_service_charges
set
  charge_bearer = coalesce(nullif(btrim(charge_bearer), ''), 'tenant'),
  billing_cycle = coalesce(nullif(btrim(billing_cycle), ''), 'one_time');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_property_service_charges_bearer_check'
      and conrelid = 'public.manager_property_service_charges'::regclass
  ) then
    alter table public.manager_property_service_charges
      add constraint manager_property_service_charges_bearer_check
      check (charge_bearer in ('tenant', 'landlord'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_property_service_charges_billing_cycle_check'
      and conrelid = 'public.manager_property_service_charges'::regclass
  ) then
    alter table public.manager_property_service_charges
      add constraint manager_property_service_charges_billing_cycle_check
      check (
        billing_cycle in (
          'one_time',
          'monthly',
          'quarterly',
          'biannual',
          'annual'
        )
      );
  end if;
end
$$;

create index if not exists manager_property_service_charges_payment_lookup_idx
  on public.manager_property_service_charges (
    organization_id,
    property_id,
    status,
    charge_bearer,
    is_required_before_move_in,
    sort_order
  );

commit;
