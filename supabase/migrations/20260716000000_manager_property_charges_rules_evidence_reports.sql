begin;

-- ---------------------------------------------------------------------
-- BOPA Manager property setup, current-occupant evidence and report docs
-- ---------------------------------------------------------------------

create table if not exists public.manager_property_service_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  landlord_client_id uuid not null,
  property_id uuid not null,
  charge_code text,
  charge_name text not null,
  description text,
  amount numeric(12,2) not null,
  currency_code text not null default 'NGN',
  status text not null default 'active',
  is_required_before_move_in boolean not null default true,
  sort_order integer not null default 0,
  created_by_profile_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manager_property_service_charges_property_fk
    foreign key (
      property_id,
      organization_id,
      landlord_client_id
    )
    references public.manager_properties (
      id,
      organization_id,
      landlord_client_id
    )
    on delete cascade,

  constraint manager_property_service_charges_created_by_profile_fk
    foreign key (created_by_profile_id)
    references public.profiles (id)
    on delete set null,

  constraint manager_property_service_charges_amount_positive_check
    check (amount > 0),

  constraint manager_property_service_charges_charge_name_not_blank_check
    check (length(btrim(charge_name)) > 0),

  constraint manager_property_service_charges_currency_code_check
    check (currency_code = 'NGN'),

  constraint manager_property_service_charges_status_check
    check (
      status in (
        'active',
        'inactive',
        'archived'
      )
    ),

  constraint manager_property_service_charges_sort_order_non_negative_check
    check (sort_order >= 0)
);

create index if not exists
  manager_property_service_charges_organization_idx
on public.manager_property_service_charges (organization_id);

create index if not exists
  manager_property_service_charges_landlord_client_idx
on public.manager_property_service_charges (landlord_client_id);

create index if not exists
  manager_property_service_charges_property_idx
on public.manager_property_service_charges (property_id);

create index if not exists
  manager_property_service_charges_property_active_order_idx
on public.manager_property_service_charges (
  property_id,
  sort_order,
  charge_name
)
where status = 'active';

create unique index if not exists
  manager_property_service_charges_active_name_uidx
on public.manager_property_service_charges (
  property_id,
  lower(btrim(charge_name))
)
where status = 'active';

drop trigger if exists
  trg_manager_property_service_charges_updated_at
on public.manager_property_service_charges;

create trigger trg_manager_property_service_charges_updated_at
before update on public.manager_property_service_charges
for each row
execute function public.set_bopa_manager_updated_at();

alter table public.manager_property_service_charges
  enable row level security;

drop policy if exists
  "manager_property_service_charges_org_owner_all"
on public.manager_property_service_charges;

create policy "manager_property_service_charges_org_owner_all"
on public.manager_property_service_charges
for all
to authenticated
using (
  public.manager_organization_is_owned(organization_id)
)
with check (
  public.manager_organization_is_owned(organization_id)
);

drop policy if exists
  "manager_property_service_charges_service_role_all"
on public.manager_property_service_charges;

create policy "manager_property_service_charges_service_role_all"
on public.manager_property_service_charges
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete
on public.manager_property_service_charges
to authenticated;

grant all
on public.manager_property_service_charges
to service_role;

-- ---------------------------------------------------------------------
-- Manager property rules
-- ---------------------------------------------------------------------

create table if not exists public.manager_property_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  landlord_client_id uuid not null,
  property_id uuid not null,
  title text not null,
  description text not null,
  category public.property_rule_category not null default 'other',
  enforcement public.property_rule_enforcement
    not null default 'information_only',
  applies_to public.property_rule_applies_to
    not null default 'new_tenants',
  status public.property_rule_status not null default 'active',
  requires_tenant_acknowledgement boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manager_property_rules_property_fk
    foreign key (
      property_id,
      organization_id,
      landlord_client_id
    )
    references public.manager_properties (
      id,
      organization_id,
      landlord_client_id
    )
    on delete cascade,

  constraint manager_property_rules_created_by_profile_fk
    foreign key (created_by_profile_id)
    references public.profiles (id)
    on delete set null,

  constraint manager_property_rules_title_length_check
    check (char_length(btrim(title)) >= 3),

  constraint manager_property_rules_description_length_check
    check (char_length(btrim(description)) >= 5),

  constraint manager_property_rules_sort_order_non_negative_check
    check (sort_order >= 0),

  constraint manager_property_rules_archived_at_required_check
    check (
      status <> 'archived'
      or archived_at is not null
    )
);

create index if not exists
  manager_property_rules_organization_idx
on public.manager_property_rules (organization_id);

create index if not exists
  manager_property_rules_property_status_sort_idx
on public.manager_property_rules (
  property_id,
  status,
  sort_order
);

create index if not exists
  manager_property_rules_enforcement_status_idx
on public.manager_property_rules (
  enforcement,
  status
);

drop trigger if exists
  trg_manager_property_rules_updated_at
on public.manager_property_rules;

create trigger trg_manager_property_rules_updated_at
before update on public.manager_property_rules
for each row
execute function public.set_bopa_manager_updated_at();

alter table public.manager_property_rules
  enable row level security;

drop policy if exists
  "manager_property_rules_org_owner_all"
on public.manager_property_rules;

create policy "manager_property_rules_org_owner_all"
on public.manager_property_rules
for all
to authenticated
using (
  public.manager_organization_is_owned(organization_id)
)
with check (
  public.manager_organization_is_owned(organization_id)
);

drop policy if exists
  "manager_property_rules_service_role_all"
on public.manager_property_rules;

create policy "manager_property_rules_service_role_all"
on public.manager_property_rules
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete
on public.manager_property_rules
to authenticated;

grant all
on public.manager_property_rules
to service_role;

-- ---------------------------------------------------------------------
-- Existing-tenant last-payment evidence
-- ---------------------------------------------------------------------

alter table public.manager_tenant_onboarding_requests
  add column if not exists
    existing_tenant_last_payment_amount numeric(12,2),
  add column if not exists
    existing_tenant_last_payment_date date,
  add column if not exists
    existing_tenant_last_payment_receipt_path text,
  add column if not exists
    existing_tenant_last_payment_receipt_file_name text,
  add column if not exists
    existing_tenant_last_payment_receipt_mime_type text,
  add column if not exists
    existing_tenant_last_payment_receipt_size_bytes bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_amount_positive_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_amount_positive_check
      check (
        existing_tenant_last_payment_amount is null
        or existing_tenant_last_payment_amount > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_receipt_size_positive_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_receipt_size_positive_check
      check (
        existing_tenant_last_payment_receipt_size_bytes is null
        or existing_tenant_last_payment_receipt_size_bytes > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_receipt_mime_type_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_receipt_mime_type_check
      check (
        existing_tenant_last_payment_receipt_mime_type is null
        or existing_tenant_last_payment_receipt_mime_type in (
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_path_not_blank_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_path_not_blank_check
      check (
        existing_tenant_last_payment_receipt_path is null
        or length(
          btrim(existing_tenant_last_payment_receipt_path)
        ) > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_current_occupant_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_current_occupant_check
      check (
        (
          existing_tenant_last_payment_amount is null
          and existing_tenant_last_payment_date is null
          and existing_tenant_last_payment_receipt_path is null
          and existing_tenant_last_payment_receipt_file_name is null
          and existing_tenant_last_payment_receipt_mime_type is null
          and existing_tenant_last_payment_receipt_size_bytes is null
        )
        or onboarding_type = 'current_occupant'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_tenant_onboarding_existing_payment_core_complete_check'
      and conrelid =
        'public.manager_tenant_onboarding_requests'::regclass
  ) then
    alter table public.manager_tenant_onboarding_requests
      add constraint
        manager_tenant_onboarding_existing_payment_core_complete_check
      check (
        (
          existing_tenant_last_payment_amount is null
          and existing_tenant_last_payment_date is null
          and existing_tenant_last_payment_receipt_path is null
          and existing_tenant_last_payment_receipt_file_name is null
          and existing_tenant_last_payment_receipt_mime_type is null
          and existing_tenant_last_payment_receipt_size_bytes is null
        )
        or (
          existing_tenant_last_payment_amount is not null
          and existing_tenant_last_payment_date is not null
          and existing_tenant_last_payment_receipt_path is not null
        )
      );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Payment-time service-charge snapshots
-- ---------------------------------------------------------------------

alter table public.manager_rent_payment_requests
  add column if not exists
    base_rent_amount numeric(12,2) not null default 0,
  add column if not exists
    service_charge_amount numeric(12,2) not null default 0,
  add column if not exists
    service_charge_items_snapshot jsonb not null default '[]'::jsonb;

update public.manager_rent_payment_requests
set
  base_rent_amount = amount_requested,
  service_charge_amount = 0,
  service_charge_items_snapshot = '[]'::jsonb
where base_rent_amount = 0
  and service_charge_amount = 0
  and service_charge_items_snapshot = '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payment_requests_base_rent_non_negative_check'
      and conrelid =
        'public.manager_rent_payment_requests'::regclass
  ) then
    alter table public.manager_rent_payment_requests
      add constraint
        manager_rent_payment_requests_base_rent_non_negative_check
      check (base_rent_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payment_requests_service_charge_non_negative_check'
      and conrelid =
        'public.manager_rent_payment_requests'::regclass
  ) then
    alter table public.manager_rent_payment_requests
      add constraint
        manager_rent_payment_requests_service_charge_non_negative_check
      check (service_charge_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payment_requests_service_charge_snapshot_array_check'
      and conrelid =
        'public.manager_rent_payment_requests'::regclass
  ) then
    alter table public.manager_rent_payment_requests
      add constraint
        manager_rent_payment_requests_service_charge_snapshot_array_check
      check (
        jsonb_typeof(service_charge_items_snapshot) = 'array'
      );
  end if;
end
$$;

alter table public.manager_rent_payments
  add column if not exists
    base_rent_amount numeric(12,2) not null default 0,
  add column if not exists
    service_charge_amount numeric(12,2) not null default 0,
  add column if not exists
    service_charge_items_snapshot jsonb not null default '[]'::jsonb;

update public.manager_rent_payments
set
  base_rent_amount = amount_paid,
  service_charge_amount = 0,
  service_charge_items_snapshot = '[]'::jsonb
where base_rent_amount = 0
  and service_charge_amount = 0
  and service_charge_items_snapshot = '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payments_base_rent_non_negative_check'
      and conrelid =
        'public.manager_rent_payments'::regclass
  ) then
    alter table public.manager_rent_payments
      add constraint
        manager_rent_payments_base_rent_non_negative_check
      check (base_rent_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payments_service_charge_non_negative_check'
      and conrelid =
        'public.manager_rent_payments'::regclass
  ) then
    alter table public.manager_rent_payments
      add constraint
        manager_rent_payments_service_charge_non_negative_check
      check (service_charge_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_rent_payments_service_charge_snapshot_array_check'
      and conrelid =
        'public.manager_rent_payments'::regclass
  ) then
    alter table public.manager_rent_payments
      add constraint
        manager_rent_payments_service_charge_snapshot_array_check
      check (
        jsonb_typeof(service_charge_items_snapshot) = 'array'
      );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- Property-specific manager report documents
-- ---------------------------------------------------------------------

alter table public.manager_statement_documents
  add column if not exists property_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manager_statement_documents_property_fk'
      and conrelid =
        'public.manager_statement_documents'::regclass
  ) then
    alter table public.manager_statement_documents
      add constraint manager_statement_documents_property_fk
      foreign key (
        property_id,
        organization_id,
        landlord_client_id
      )
      references public.manager_properties (
        id,
        organization_id,
        landlord_client_id
      )
      on delete restrict;
  end if;
end
$$;

alter table public.manager_statement_documents
  drop constraint if exists
    manager_statement_documents_type_check;

alter table public.manager_statement_documents
  drop constraint if exists
    manager_statement_documents_document_type_check;

alter table public.manager_statement_documents
  add constraint manager_statement_documents_document_type_check
  check (
    document_type in (
      'landlord_statement',
      'remittance_summary',
      'property_report'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'manager_statement_documents_property_report_property_required_check'
      and conrelid =
        'public.manager_statement_documents'::regclass
  ) then
    alter table public.manager_statement_documents
      add constraint
        manager_statement_documents_property_report_property_required_check
      check (
        document_type <> 'property_report'
        or property_id is not null
      );
  end if;
end
$$;

create index if not exists
  manager_statement_documents_property_generated_idx
on public.manager_statement_documents (
  organization_id,
  property_id,
  generated_at desc
);

commit;