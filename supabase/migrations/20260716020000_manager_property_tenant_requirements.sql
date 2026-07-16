begin;

create table if not exists public.manager_property_tenant_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  landlord_client_id uuid not null,
  property_id uuid not null,
  requirement_code text not null,
  title text not null,
  question_text text not null,
  description text,
  answer_type text not null,
  expected_boolean boolean,
  minimum_value numeric(14,2),
  maximum_value numeric(14,2),
  required_guarantor_count integer,
  mismatch_action text not null default 'review',
  include_in_agreement boolean not null default true,
  agreement_clause text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_by_profile_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manager_property_tenant_requirements_property_fk
    foreign key (property_id, organization_id, landlord_client_id)
    references public.manager_properties (
      id,
      organization_id,
      landlord_client_id
    )
    on delete cascade,

  constraint manager_property_tenant_requirements_profile_fk
    foreign key (created_by_profile_id)
    references public.profiles (id)
    on delete set null,

  constraint manager_property_tenant_requirements_code_check
    check (
      requirement_code in (
        'pets',
        'subletting',
        'minimum_monthly_income',
        'employment_required',
        'maximum_occupants',
        'business_use',
        'smoking',
        'guarantor_required',
        'custom_yes_no'
      )
    ),

  constraint manager_property_tenant_requirements_answer_type_check
    check (answer_type in ('yes_no', 'money', 'integer')),

  constraint manager_property_tenant_requirements_mismatch_action_check
    check (mismatch_action in ('review', 'decline')),

  constraint manager_property_tenant_requirements_status_check
    check (status in ('active', 'inactive', 'archived')),

  constraint manager_property_tenant_requirements_title_check
    check (length(btrim(title)) > 0),

  constraint manager_property_tenant_requirements_question_check
    check (length(btrim(question_text)) > 0),

  constraint manager_property_tenant_requirements_sort_check
    check (sort_order >= 0),

  constraint manager_property_tenant_requirements_archive_check
    check (status <> 'archived' or archived_at is not null),

  constraint manager_property_tenant_requirements_agreement_check
    check (
      include_in_agreement = false
      or length(btrim(coalesce(agreement_clause, ''))) > 0
    ),

  constraint manager_property_tenant_requirements_value_check
    check (
      (
        answer_type = 'yes_no'
        and expected_boolean is not null
        and minimum_value is null
        and maximum_value is null
      )
      or
      (
        answer_type = 'money'
        and expected_boolean is null
        and minimum_value is not null
        and minimum_value >= 0
        and maximum_value is null
      )
      or
      (
        answer_type = 'integer'
        and expected_boolean is null
        and minimum_value is null
        and maximum_value is not null
        and maximum_value >= 1
        and maximum_value = trunc(maximum_value)
      )
    ),

  constraint manager_property_tenant_requirements_guarantor_check
    check (
      (
        requirement_code = 'guarantor_required'
        and answer_type = 'yes_no'
        and expected_boolean = true
        and required_guarantor_count between 1 and 2
      )
      or
      (
        requirement_code <> 'guarantor_required'
        and required_guarantor_count is null
      )
    )
);

create index if not exists manager_property_tenant_requirements_org_idx
  on public.manager_property_tenant_requirements (organization_id);

create index if not exists manager_property_tenant_requirements_property_idx
  on public.manager_property_tenant_requirements (
    property_id,
    status,
    sort_order
  );

create unique index if not exists manager_property_tenant_requirements_active_question_uidx
  on public.manager_property_tenant_requirements (
    property_id,
    lower(btrim(question_text))
  )
  where status = 'active';

create unique index if not exists manager_property_tenant_requirements_active_preset_uidx
  on public.manager_property_tenant_requirements (
    property_id,
    requirement_code
  )
  where status = 'active'
    and requirement_code <> 'custom_yes_no';

drop trigger if exists trg_manager_property_tenant_requirements_updated_at
  on public.manager_property_tenant_requirements;

create trigger trg_manager_property_tenant_requirements_updated_at
  before update on public.manager_property_tenant_requirements
  for each row execute function public.set_updated_at();

alter table public.manager_property_tenant_requirements
  enable row level security;

drop policy if exists "manager_property_tenant_requirements_org_owner_all"
  on public.manager_property_tenant_requirements;

create policy "manager_property_tenant_requirements_org_owner_all"
  on public.manager_property_tenant_requirements
  for all to authenticated
  using (public.manager_organization_is_owned(organization_id))
  with check (public.manager_organization_is_owned(organization_id));

drop policy if exists "manager_property_tenant_requirements_service_role_all"
  on public.manager_property_tenant_requirements;

create policy "manager_property_tenant_requirements_service_role_all"
  on public.manager_property_tenant_requirements
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete
  on public.manager_property_tenant_requirements
  to authenticated;

grant all
  on public.manager_property_tenant_requirements
  to service_role;

alter table public.manager_tenant_onboarding_requests
  add column if not exists tenant_requirements_snapshot jsonb
    not null default '[]'::jsonb,
  add column if not exists tenant_requirement_answers jsonb
    not null default '[]'::jsonb,
  add column if not exists tenant_screening_result text
    not null default 'not_screened',
  add column if not exists tenant_screening_reasons jsonb
    not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_tenant_onboarding_screening_result_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint manager_tenant_onboarding_screening_result_check
      check (
        tenant_screening_result in (
          'not_screened',
          'eligible',
          'review',
          'declined'
        )
      );
  end if;
end
$$;

commit;
