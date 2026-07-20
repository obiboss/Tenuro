begin;

create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_type text not null
    check (workspace_type in ('manager', 'developer')),
  manager_organization_id uuid
    references public.manager_organizations(id)
    on delete cascade,
  developer_account_id uuid
    references public.developer_accounts(id)
    on delete cascade,
  owner_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,
  status text not null default 'trialing'
    check (
      status in (
        'trialing',
        'active',
        'past_due',
        'expired',
        'cancelled'
      )
    ),
  billing_interval text
    check (billing_interval in ('monthly', 'annual')),
  amount_kobo bigint
    check (amount_kobo is null or amount_kobo > 0),
  currency_code text not null default 'NGN'
    check (currency_code = 'NGN'),
  billing_email text,
  trial_started_at timestamptz not null,
  trial_expires_at timestamptz not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  paystack_plan_code text,
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  next_payment_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  last_payment_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (trial_expires_at > trial_started_at),
  check (
    (
      workspace_type = 'manager'
      and manager_organization_id is not null
      and developer_account_id is null
    )
    or
    (
      workspace_type = 'developer'
      and developer_account_id is not null
      and manager_organization_id is null
    )
  )
);

create unique index if not exists
  business_subscriptions_manager_organization_unique
on public.business_subscriptions (manager_organization_id)
where manager_organization_id is not null;

create unique index if not exists
  business_subscriptions_developer_account_unique
on public.business_subscriptions (developer_account_id)
where developer_account_id is not null;

create unique index if not exists
  business_subscriptions_paystack_subscription_unique
on public.business_subscriptions (paystack_subscription_code)
where paystack_subscription_code is not null;

create index if not exists
  business_subscriptions_owner_profile_idx
on public.business_subscriptions (owner_profile_id, workspace_type);

create index if not exists
  business_subscriptions_access_idx
on public.business_subscriptions (
  workspace_type,
  status,
  trial_expires_at,
  current_period_end
);

create table if not exists public.business_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_subscription_id uuid not null
    references public.business_subscriptions(id)
    on delete cascade,
  owner_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,
  payment_reference text not null unique,
  billing_interval text not null
    check (billing_interval in ('monthly', 'annual')),
  expected_amount_kobo bigint not null
    check (expected_amount_kobo > 0),
  currency_code text not null default 'NGN'
    check (currency_code = 'NGN'),
  status text not null default 'initialized'
    check (
      status in (
        'initialized',
        'paid',
        'failed',
        'abandoned',
        'cancelled'
      )
    ),
  paystack_plan_code text not null,
  paystack_access_code text,
  authorization_url text,
  paystack_transaction_id bigint,
  paid_at timestamptz,
  failure_reason text,
  verified_payload jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  business_subscription_payments_subscription_idx
on public.business_subscription_payments (
  business_subscription_id,
  created_at desc
);

create index if not exists
  business_subscription_payments_pending_match_idx
on public.business_subscription_payments (
  paystack_plan_code,
  status,
  created_at desc
);

create table if not exists public.business_subscription_webhook_events (
  id uuid primary key default gen_random_uuid(),
  raw_body_sha256 text not null unique
    check (length(raw_body_sha256) = 64),
  event_type text not null,
  provider_reference text,
  business_subscription_id uuid
    references public.business_subscriptions(id)
    on delete set null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  raw_payload jsonb not null,
  failure_reason text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists
  business_subscription_webhook_events_subscription_idx
on public.business_subscription_webhook_events (
  business_subscription_id,
  received_at desc
);

create or replace function public.set_business_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  business_subscriptions_set_updated_at
on public.business_subscriptions;

create trigger business_subscriptions_set_updated_at
before update on public.business_subscriptions
for each row
execute function public.set_business_subscription_updated_at();

drop trigger if exists
  business_subscription_payments_set_updated_at
on public.business_subscription_payments;

create trigger business_subscription_payments_set_updated_at
before update on public.business_subscription_payments
for each row
execute function public.set_business_subscription_updated_at();

drop trigger if exists
  business_subscription_webhook_events_set_updated_at
on public.business_subscription_webhook_events;

create trigger business_subscription_webhook_events_set_updated_at
before update on public.business_subscription_webhook_events
for each row
execute function public.set_business_subscription_updated_at();

create or replace function public.create_business_subscription_trial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_trial_started_at timestamptz := now();
begin
  if tg_table_name = 'manager_organizations' then
    insert into public.business_subscriptions (
      workspace_type,
      manager_organization_id,
      owner_profile_id,
      billing_email,
      trial_started_at,
      trial_expires_at,
      metadata
    )
    values (
      'manager',
      new.id,
      new.owner_profile_id,
      nullif(lower(trim(new.organization_email)), ''),
      v_trial_started_at,
      v_trial_started_at + interval '2 months',
      jsonb_build_object('trial_source', 'company_created')
    )
    on conflict do nothing;
  elsif tg_table_name = 'developer_accounts' then
    insert into public.business_subscriptions (
      workspace_type,
      developer_account_id,
      owner_profile_id,
      billing_email,
      trial_started_at,
      trial_expires_at,
      metadata
    )
    values (
      'developer',
      new.id,
      new.owner_profile_id,
      nullif(lower(trim(new.company_email)), ''),
      v_trial_started_at,
      v_trial_started_at + interval '2 months',
      jsonb_build_object('trial_source', 'company_created')
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all
on function public.create_business_subscription_trial()
from public, anon, authenticated;

drop trigger if exists
  manager_organization_business_subscription_trial
on public.manager_organizations;

create trigger manager_organization_business_subscription_trial
after insert on public.manager_organizations
for each row
execute function public.create_business_subscription_trial();

drop trigger if exists
  developer_account_business_subscription_trial
on public.developer_accounts;

create trigger developer_account_business_subscription_trial
after insert on public.developer_accounts
for each row
execute function public.create_business_subscription_trial();

with deployment_time as (
  select now() as started_at
)
insert into public.business_subscriptions (
  workspace_type,
  manager_organization_id,
  owner_profile_id,
  billing_email,
  trial_started_at,
  trial_expires_at,
  metadata
)
select
  'manager',
  organization.id,
  organization.owner_profile_id,
  nullif(lower(trim(organization.organization_email)), ''),
  deployment_time.started_at,
  deployment_time.started_at + interval '2 months',
  jsonb_build_object('trial_source', 'existing_company_backfill')
from public.manager_organizations as organization
cross join deployment_time
where not exists (
  select 1
  from public.business_subscriptions as subscription
  where subscription.manager_organization_id = organization.id
);

with deployment_time as (
  select now() as started_at
)
insert into public.business_subscriptions (
  workspace_type,
  developer_account_id,
  owner_profile_id,
  billing_email,
  trial_started_at,
  trial_expires_at,
  metadata
)
select
  'developer',
  account.id,
  account.owner_profile_id,
  nullif(lower(trim(account.company_email)), ''),
  deployment_time.started_at,
  deployment_time.started_at + interval '2 months',
  jsonb_build_object('trial_source', 'existing_company_backfill')
from public.developer_accounts as account
cross join deployment_time
where not exists (
  select 1
  from public.business_subscriptions as subscription
  where subscription.developer_account_id = account.id
);

create or replace function public.business_workspace_subscription_has_access(
  p_workspace_type text,
  p_workspace_id uuid,
  p_at timestamptz default now()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_subscriptions as subscription
    where
      subscription.workspace_type = p_workspace_type
      and (
        (
          p_workspace_type = 'manager'
          and subscription.manager_organization_id = p_workspace_id
        )
        or
        (
          p_workspace_type = 'developer'
          and subscription.developer_account_id = p_workspace_id
        )
      )
      and (
        (
          subscription.status = 'trialing'
          and subscription.trial_expires_at > p_at
        )
        or
        (
          subscription.status in ('active', 'cancelled')
          and subscription.current_period_end > p_at
        )
      )
  );
$$;

revoke all
on function public.business_workspace_subscription_has_access(
  text,
  uuid,
  timestamptz
)
from public, anon;

grant execute
on function public.business_workspace_subscription_has_access(
  text,
  uuid,
  timestamptz
)
to authenticated, service_role;

alter table public.business_subscriptions enable row level security;
alter table public.business_subscription_payments enable row level security;
alter table public.business_subscription_webhook_events enable row level security;

revoke all on table public.business_subscriptions from anon, authenticated;
revoke all on table public.business_subscription_payments from anon, authenticated;
revoke all on table public.business_subscription_webhook_events from anon, authenticated;

grant select, insert, update, delete
on table public.business_subscriptions
to service_role;

grant select, insert, update, delete
on table public.business_subscription_payments
to service_role;

grant select, insert, update, delete
on table public.business_subscription_webhook_events
to service_role;

drop policy if exists
  business_subscriptions_service_role_all
on public.business_subscriptions;

create policy business_subscriptions_service_role_all
on public.business_subscriptions
for all
to service_role
using (true)
with check (true);

drop policy if exists
  business_subscription_payments_service_role_all
on public.business_subscription_payments;

create policy business_subscription_payments_service_role_all
on public.business_subscription_payments
for all
to service_role
using (true)
with check (true);

drop policy if exists
  business_subscription_webhook_events_service_role_all
on public.business_subscription_webhook_events;

create policy business_subscription_webhook_events_service_role_all
on public.business_subscription_webhook_events
for all
to service_role
using (true)
with check (true);

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'manager_landlord_clients',
    'manager_landlord_payout_profiles',
    'manager_landlord_paystack_accounts',
    'manager_landlord_remittances',
    'manager_maintenance_requests',
    'manager_paystack_accounts',
    'manager_properties',
    'manager_property_rules',
    'manager_property_service_charges',
    'manager_property_tenant_requirements',
    'manager_rent_payment_receipts',
    'manager_rent_payment_requests',
    'manager_rent_payments',
    'manager_staff_invites',
    'manager_statement_documents',
    'manager_tenant_agreement_documents',
    'manager_tenant_guarantors',
    'manager_tenant_onboarding_requests',
    'manager_tenants',
    'manager_units'
  ]
  loop
    if to_regclass('public.' || v_table_name) is not null then
      execute format(
        'drop policy if exists business_subscription_required on public.%I',
        v_table_name
      );

      execute format(
        'create policy business_subscription_required on public.%I as restrictive for all to authenticated using (public.business_workspace_subscription_has_access(''manager'', organization_id)) with check (public.business_workspace_subscription_has_access(''manager'', organization_id))',
        v_table_name
      );
    end if;
  end loop;

  foreach v_table_name in array array[
    'developer_buyer_purchase_links',
    'developer_buyer_sale_access_tokens',
    'developer_buyers',
    'developer_document_templates',
    'developer_estates',
    'developer_payment_allocations',
    'developer_payment_intents',
    'developer_payment_plans',
    'developer_payment_schedule_items',
    'developer_paystack_accounts',
    'developer_plot_assignments',
    'developer_plot_types',
    'developer_plots',
    'developer_sale_documents',
    'developer_sale_ledger_entries',
    'developer_sale_payments',
    'developer_sales'
  ]
  loop
    if to_regclass('public.' || v_table_name) is not null then
      execute format(
        'drop policy if exists business_subscription_required on public.%I',
        v_table_name
      );

      execute format(
        'create policy business_subscription_required on public.%I as restrictive for all to authenticated using (public.business_workspace_subscription_has_access(''developer'', developer_account_id)) with check (public.business_workspace_subscription_has_access(''developer'', developer_account_id))',
        v_table_name
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'manager_staff_members'
  ]
  loop
    if to_regclass('public.' || v_table_name) is not null then
      execute format(
        'drop policy if exists business_subscription_required_insert on public.%I',
        v_table_name
      );
      execute format(
        'drop policy if exists business_subscription_required_update on public.%I',
        v_table_name
      );
      execute format(
        'drop policy if exists business_subscription_required_delete on public.%I',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_insert on public.%I as restrictive for insert to authenticated with check (public.business_workspace_subscription_has_access(''manager'', organization_id))',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_update on public.%I as restrictive for update to authenticated using (public.business_workspace_subscription_has_access(''manager'', organization_id)) with check (public.business_workspace_subscription_has_access(''manager'', organization_id))',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_delete on public.%I as restrictive for delete to authenticated using (public.business_workspace_subscription_has_access(''manager'', organization_id))',
        v_table_name
      );
    end if;
  end loop;

  foreach v_table_name in array array[
    'developer_profiles',
    'developer_staff_invites',
    'developer_staff_permissions',
    'developer_staff_role_links'
  ]
  loop
    if to_regclass('public.' || v_table_name) is not null then
      execute format(
        'drop policy if exists business_subscription_required_insert on public.%I',
        v_table_name
      );
      execute format(
        'drop policy if exists business_subscription_required_update on public.%I',
        v_table_name
      );
      execute format(
        'drop policy if exists business_subscription_required_delete on public.%I',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_insert on public.%I as restrictive for insert to authenticated with check (public.business_workspace_subscription_has_access(''developer'', developer_account_id))',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_update on public.%I as restrictive for update to authenticated using (public.business_workspace_subscription_has_access(''developer'', developer_account_id)) with check (public.business_workspace_subscription_has_access(''developer'', developer_account_id))',
        v_table_name
      );
      execute format(
        'create policy business_subscription_required_delete on public.%I as restrictive for delete to authenticated using (public.business_workspace_subscription_has_access(''developer'', developer_account_id))',
        v_table_name
      );
    end if;
  end loop;

  if to_regclass('public.manager_organizations') is not null then
    drop policy if exists
      business_subscription_required_update
    on public.manager_organizations;
    drop policy if exists
      business_subscription_required_delete
    on public.manager_organizations;

    create policy business_subscription_required_update
    on public.manager_organizations
    as restrictive
    for update
    to authenticated
    using (
      public.business_workspace_subscription_has_access('manager', id)
    )
    with check (
      public.business_workspace_subscription_has_access('manager', id)
    );

    create policy business_subscription_required_delete
    on public.manager_organizations
    as restrictive
    for delete
    to authenticated
    using (
      public.business_workspace_subscription_has_access('manager', id)
    );
  end if;

  if to_regclass('public.developer_accounts') is not null then
    drop policy if exists
      business_subscription_required_update
    on public.developer_accounts;
    drop policy if exists
      business_subscription_required_delete
    on public.developer_accounts;

    create policy business_subscription_required_update
    on public.developer_accounts
    as restrictive
    for update
    to authenticated
    using (
      public.business_workspace_subscription_has_access('developer', id)
    )
    with check (
      public.business_workspace_subscription_has_access('developer', id)
    );

    create policy business_subscription_required_delete
    on public.developer_accounts
    as restrictive
    for delete
    to authenticated
    using (
      public.business_workspace_subscription_has_access('developer', id)
    );
  end if;
end;
$$;

do $$
begin
  if
    to_regprocedure(
      'public.apply_offline_safe_mutation_unchecked(uuid,text,uuid,uuid,text,uuid,text,bigint,text,jsonb)'
    ) is null
    and to_regprocedure(
      'public.apply_offline_safe_mutation(uuid,text,uuid,uuid,text,uuid,text,bigint,text,jsonb)'
    ) is not null
  then
    alter function public.apply_offline_safe_mutation(
      uuid,
      text,
      uuid,
      uuid,
      text,
      uuid,
      text,
      bigint,
      text,
      jsonb
    ) rename to apply_offline_safe_mutation_unchecked;
  end if;
end;
$$;

create or replace function public.apply_offline_safe_mutation(
  p_profile_id uuid,
  p_workspace_type text,
  p_workspace_id uuid,
  p_client_mutation_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_base_revision bigint,
  p_request_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or auth.uid() <> p_profile_id then
    return jsonb_build_object(
      'clientMutationId', p_client_mutation_id,
      'status', 'rejected',
      'code', 'OFFLINE_PROFILE_MISMATCH',
      'message', 'This offline change does not belong to your account.'
    );
  end if;

  if not public.business_workspace_subscription_has_access(
    p_workspace_type,
    p_workspace_id
  ) then
    return jsonb_build_object(
      'clientMutationId', p_client_mutation_id,
      'status', 'rejected',
      'code', 'OFFLINE_SUBSCRIPTION_REQUIRED',
      'message', 'Renew your company subscription before offline changes can be saved.'
    );
  end if;

  if to_regprocedure(
    'public.apply_offline_safe_mutation_unchecked(uuid,text,uuid,uuid,text,uuid,text,bigint,text,jsonb)'
  ) is null then
    return jsonb_build_object(
      'clientMutationId', p_client_mutation_id,
      'status', 'rejected',
      'code', 'OFFLINE_SYNC_NOT_READY',
      'message', 'Offline sync is not ready. Please use an internet connection.'
    );
  end if;

  return public.apply_offline_safe_mutation_unchecked(
    p_profile_id,
    p_workspace_type,
    p_workspace_id,
    p_client_mutation_id,
    p_entity_type,
    p_entity_id,
    p_operation,
    p_base_revision,
    p_request_hash,
    p_payload
  );
end;
$$;

do $$
begin
  if to_regprocedure(
    'public.apply_offline_safe_mutation_unchecked(uuid,text,uuid,uuid,text,uuid,text,bigint,text,jsonb)'
  ) is not null then
    revoke all
    on function public.apply_offline_safe_mutation_unchecked(
      uuid,
      text,
      uuid,
      uuid,
      text,
      uuid,
      text,
      bigint,
      text,
      jsonb
    )
    from public, anon, authenticated;
  end if;
end;
$$;

revoke all
on function public.apply_offline_safe_mutation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  bigint,
  text,
  jsonb
)
from public, anon;

grant execute
on function public.apply_offline_safe_mutation(
  uuid,
  text,
  uuid,
  uuid,
  text,
  uuid,
  text,
  bigint,
  text,
  jsonb
)
to authenticated;

commit;
