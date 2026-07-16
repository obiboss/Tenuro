begin;

create table if not exists public.manager_tenant_guarantors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  landlord_client_id uuid not null,
  property_id uuid not null,
  unit_id uuid not null,
  onboarding_request_id uuid not null,
  position integer not null,
  full_name text not null,
  phone_number text not null,
  email text,
  relationship_to_tenant text not null,
  residential_address text not null,
  occupation text not null,
  employer_or_business text,
  monthly_income numeric(14,2) not null,
  id_type text not null,
  id_number text not null,
  status text not null default 'pending_confirmation',
  confirmation_token_hash text not null,
  confirmation_token_expires_at timestamptz not null,
  confirmation_token_used_at timestamptz,
  responsibility_acknowledged boolean not null default false,
  confirmed_at timestamptz,
  confirmation_ip text,
  confirmation_user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manager_tenant_guarantors_request_fk
    foreign key (onboarding_request_id)
    references public.manager_tenant_onboarding_requests (id)
    on delete cascade,

  constraint manager_tenant_guarantors_organization_fk
    foreign key (organization_id)
    references public.manager_organizations (id)
    on delete cascade,

  constraint manager_tenant_guarantors_landlord_fk
    foreign key (landlord_client_id)
    references public.manager_landlord_clients (id)
    on delete cascade,

  constraint manager_tenant_guarantors_property_fk
    foreign key (property_id, organization_id, landlord_client_id)
    references public.manager_properties (
      id,
      organization_id,
      landlord_client_id
    )
    on delete cascade,

  constraint manager_tenant_guarantors_unit_fk
    foreign key (unit_id)
    references public.manager_units (id)
    on delete cascade,

  constraint manager_tenant_guarantors_position_check
    check (position between 1 and 2),

  constraint manager_tenant_guarantors_status_check
    check (
      status in (
        'pending_confirmation',
        'confirmed',
        'declined',
        'cancelled'
      )
    ),

  constraint manager_tenant_guarantors_name_check
    check (length(btrim(full_name)) >= 2),

  constraint manager_tenant_guarantors_phone_check
    check (length(btrim(phone_number)) >= 7),

  constraint manager_tenant_guarantors_relationship_check
    check (length(btrim(relationship_to_tenant)) >= 2),

  constraint manager_tenant_guarantors_address_check
    check (length(btrim(residential_address)) >= 5),

  constraint manager_tenant_guarantors_occupation_check
    check (length(btrim(occupation)) >= 2),

  constraint manager_tenant_guarantors_income_check
    check (monthly_income >= 0),

  constraint manager_tenant_guarantors_id_type_check
    check (
      id_type in (
        'nin',
        'passport',
        'drivers_license',
        'voters_card'
      )
    ),

  constraint manager_tenant_guarantors_id_number_check
    check (length(btrim(id_number)) >= 3),

  constraint manager_tenant_guarantors_confirmation_check
    check (
      (
        status = 'confirmed'
        and confirmed_at is not null
        and responsibility_acknowledged = true
      )
      or status <> 'confirmed'
    ),

  constraint manager_tenant_guarantors_cancelled_check
    check (status <> 'cancelled' or cancelled_at is not null)
);

create unique index if not exists manager_tenant_guarantors_request_position_uidx
  on public.manager_tenant_guarantors (
    onboarding_request_id,
    position
  );

create unique index if not exists manager_tenant_guarantors_token_uidx
  on public.manager_tenant_guarantors (confirmation_token_hash);

create index if not exists manager_tenant_guarantors_org_idx
  on public.manager_tenant_guarantors (organization_id);

create index if not exists manager_tenant_guarantors_request_status_idx
  on public.manager_tenant_guarantors (
    onboarding_request_id,
    status,
    position
  );

drop trigger if exists trg_manager_tenant_guarantors_updated_at
  on public.manager_tenant_guarantors;

create trigger trg_manager_tenant_guarantors_updated_at
  before update on public.manager_tenant_guarantors
  for each row execute function public.set_updated_at();

alter table public.manager_tenant_guarantors enable row level security;

drop policy if exists "manager_tenant_guarantors_org_owner_all"
  on public.manager_tenant_guarantors;

create policy "manager_tenant_guarantors_org_owner_all"
  on public.manager_tenant_guarantors
  for all to authenticated
  using (public.manager_organization_is_owned(organization_id))
  with check (public.manager_organization_is_owned(organization_id));

drop policy if exists "manager_tenant_guarantors_service_role_all"
  on public.manager_tenant_guarantors;

create policy "manager_tenant_guarantors_service_role_all"
  on public.manager_tenant_guarantors
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete
  on public.manager_tenant_guarantors
  to authenticated;

grant all
  on public.manager_tenant_guarantors
  to service_role;

commit;
