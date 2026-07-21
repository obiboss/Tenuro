begin;

-- A single, immutable, platform-wide activity stream. Existing `audit_log`
-- and `audit_logs` tables remain untouched for backwards compatibility.
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  event_name text not null,
  event_category text not null default 'data_change',
  outcome text not null default 'succeeded'
    check (outcome in ('started', 'in_progress', 'succeeded', 'failed', 'cancelled', 'informational')),
  source text not null default 'application'
    check (source in ('application', 'database_trigger', 'webhook', 'cron', 'system')),
  actor_profile_id uuid,
  actor_role text,
  workspace_type text,
  workspace_id text,
  subject_type text,
  subject_id text,
  journey_key text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_created_at_idx
  on public.activity_events (created_at desc);
create index if not exists activity_events_module_created_idx
  on public.activity_events (module, created_at desc);
create index if not exists activity_events_actor_created_idx
  on public.activity_events (actor_profile_id, created_at desc)
  where actor_profile_id is not null;
create index if not exists activity_events_subject_created_idx
  on public.activity_events (subject_type, subject_id, created_at desc)
  where subject_id is not null;
create index if not exists activity_events_journey_created_idx
  on public.activity_events (journey_key, created_at desc)
  where journey_key is not null;
create index if not exists activity_events_outcome_created_idx
  on public.activity_events (outcome, created_at desc);
create unique index if not exists activity_events_legacy_audit_id_uidx
  on public.activity_events ((metadata ->> 'legacy_audit_log_id'))
  where metadata ? 'legacy_audit_log_id';

-- Current state for multi-step work. A journey that stays `in_progress`
-- makes an abandoned or unfinished process visible without guessing from
-- individual row changes.
create table if not exists public.activity_journeys (
  id uuid primary key default gen_random_uuid(),
  journey_key text not null unique,
  journey_type text not null,
  module text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed', 'cancelled')),
  current_step text not null,
  actor_profile_id uuid,
  actor_role text,
  workspace_type text,
  workspace_id text,
  subject_type text,
  subject_id text,
  contact_name text,
  contact_value text,
  last_error_code text,
  last_error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists activity_journeys_status_activity_idx
  on public.activity_journeys (status, last_activity_at desc);
create index if not exists activity_journeys_module_activity_idx
  on public.activity_journeys (module, last_activity_at desc);
create index if not exists activity_journeys_subject_idx
  on public.activity_journeys (subject_type, subject_id)
  where subject_id is not null;

alter table public.activity_events enable row level security;
alter table public.activity_events force row level security;
alter table public.activity_journeys enable row level security;
alter table public.activity_journeys force row level security;

revoke all on table public.activity_events from anon, authenticated;
revoke all on table public.activity_journeys from anon, authenticated;
grant select, insert on table public.activity_events to service_role;
grant select, insert, update on table public.activity_journeys to service_role;

create or replace function public.protect_activity_event_immutability()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Activity events are append-only';
end;
$$;

drop trigger if exists activity_events_immutable on public.activity_events;
create trigger activity_events_immutable
before update or delete on public.activity_events
for each row execute function public.protect_activity_event_immutability();

create or replace function public.activity_jsonb_uuid(
  p_payload jsonb,
  p_keys text[]
)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_value text;
begin
  foreach v_key in array p_keys loop
    v_value := nullif(p_payload ->> v_key, '');
    if v_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      return v_value::uuid;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.activity_module_for_table(p_table_name text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_table_name like 'manager_%' then 'manager'
    when p_table_name like 'developer_%' then 'developer'
    when p_table_name like 'agent_%' then 'agent'
    when p_table_name like 'caretaker_%' then 'caretaker'
    when p_table_name like 'business_subscription_%' or p_table_name in ('business_subscriptions', 'subscriptions', 'subscription_payments') then 'subscriptions'
    when p_table_name like 'demo_%' then 'demo'
    when p_table_name like 'public_%' or p_table_name like '%_usage_events' then 'public_tools'
    when p_table_name like '%payment%' or p_table_name in ('rent_payments', 'ledger_entries', 'tenant_ledger', 'receipts') then 'payments'
    when p_table_name like 'tenant_%' or p_table_name in ('tenants', 'tenancies', 'guarantors') then 'tenant'
    when p_table_name in ('properties', 'blocks', 'units', 'property_rules', 'landlord_settings', 'landlord_tenancy_charges', 'quit_notices') then 'landlord'
    when p_table_name = 'profiles' then 'auth'
    else 'system'
  end
$$;

create or replace function public.capture_activity_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_payload jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_actor_id uuid;
  v_actor_role text;
  v_subject_id text;
  v_workspace_type text;
  v_workspace_id text;
  v_module text;
  v_previous_status text;
  v_current_status text;
  v_changed_columns jsonb := '[]'::jsonb;
  v_journey_key text;
  v_request_id text;
begin
  v_module := public.activity_module_for_table(tg_table_name);
  v_subject_id := nullif(v_payload ->> 'id', '');
  v_actor_id := coalesce(
    auth.uid(),
    public.activity_jsonb_uuid(v_payload, array[
      'updated_by_profile_id', 'recorded_by_profile_id',
      'created_by_profile_id', 'completed_by_profile_id',
      'approved_by_profile_id', 'reviewed_by_profile_id',
      'finalized_by_profile_id', 'owner_profile_id', 'profile_id',
      'actor_profile_id', 'landlord_id'
    ])
  );

  if v_actor_id is not null and to_regclass('public.profiles') is not null then
    execute 'select role::text from public.profiles where id = $1'
      into v_actor_role using v_actor_id;
  end if;

  v_actor_role := coalesce(v_actor_role, case when auth.uid() is null then 'system' else 'user' end);

  if nullif(v_payload ->> 'organization_id', '') is not null then
    v_workspace_type := 'manager';
    v_workspace_id := v_payload ->> 'organization_id';
  elsif nullif(v_payload ->> 'developer_account_id', '') is not null then
    v_workspace_type := 'developer';
    v_workspace_id := v_payload ->> 'developer_account_id';
  elsif v_module in ('landlord', 'tenant', 'caretaker', 'agent', 'payments') then
    v_workspace_type := 'landlord';
    v_workspace_id := coalesce(
      nullif(v_payload ->> 'landlord_id', ''),
      nullif(v_payload ->> 'owner_profile_id', '')
    );
  end if;

  v_previous_status := coalesce(
    nullif(v_old ->> 'status', ''),
    nullif(v_old ->> 'verification_status', ''),
    nullif(v_old ->> 'document_status', ''),
    nullif(v_old ->> 'processing_status', ''),
    nullif(v_old ->> 'signup_status', '')
  );
  v_current_status := coalesce(
    nullif(v_new ->> 'status', ''),
    nullif(v_new ->> 'verification_status', ''),
    nullif(v_new ->> 'document_status', ''),
    nullif(v_new ->> 'processing_status', ''),
    nullif(v_new ->> 'signup_status', '')
  );

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(changed.key order by changed.key), '[]'::jsonb)
      into v_changed_columns
    from (
      select coalesce(n.key, o.key) as key
      from jsonb_each(v_new) n
      full join jsonb_each(v_old) o on o.key = n.key
      where n.value is distinct from o.value
        and coalesce(n.key, o.key) not in ('updated_at', 'last_activity_at')
    ) changed;
  end if;

  if tg_table_name = 'manager_tenant_onboarding_requests' then
    v_journey_key := 'manager_tenant_onboarding:' || coalesce(v_subject_id, 'unknown');
  elsif tg_table_name in ('manager_properties', 'manager_units') then
    v_journey_key := 'manager_property_onboarding:' || coalesce(
      nullif(v_payload ->> 'property_id', ''),
      v_subject_id,
      'unknown'
    );
  elsif tg_table_name in ('properties', 'units') then
    v_journey_key := 'landlord_property_onboarding:' || coalesce(
      nullif(v_payload ->> 'property_id', ''),
      v_subject_id,
      'unknown'
    );
  elsif tg_table_name in ('developer_estates', 'developer_plots') then
    v_journey_key := 'developer_estate_onboarding:' || coalesce(
      nullif(v_payload ->> 'estate_id', ''),
      v_subject_id,
      'unknown'
    );
  elsif tg_table_name = 'demo_requests' then
    v_journey_key := 'demo_request:' || coalesce(v_subject_id, 'unknown');
  end if;

  begin
    v_request_id := nullif(
      (current_setting('request.headers', true)::jsonb ->> 'x-request-id'),
      ''
    );
  exception when others then
    v_request_id := null;
  end;

  insert into public.activity_events (
    module,
    event_name,
    event_category,
    outcome,
    source,
    actor_profile_id,
    actor_role,
    workspace_type,
    workspace_id,
    subject_type,
    subject_id,
    journey_key,
    description,
    metadata,
    request_id
  ) values (
    v_module,
    v_module || '.' || tg_table_name || '.' || lower(tg_op),
    case
      when tg_table_name like '%payment%' or tg_table_name in ('rent_payments', 'ledger_entries', 'tenant_ledger', 'receipts') then 'payment'
      when tg_table_name like '%onboarding%' or tg_table_name in ('profiles', 'properties', 'units', 'developer_estates', 'developer_plots') then 'onboarding'
      when tg_table_name like '%document%' or tg_table_name like '%agreement%' or tg_table_name like '%receipt%' then 'document'
      when tg_table_name like '%staff%' or tg_table_name like '%invite%' or tg_table_name like '%assignment%' then 'access'
      else 'data_change'
    end,
    'succeeded',
    'database_trigger',
    v_actor_id,
    v_actor_role,
    v_workspace_type,
    v_workspace_id,
    tg_table_name,
    v_subject_id,
    v_journey_key,
    initcap(lower(tg_op)) || ' ' || replace(tg_table_name, '_', ' ') || '.',
    jsonb_strip_nulls(jsonb_build_object(
      'table_name', tg_table_name,
      'operation', lower(tg_op),
      'changed_columns', v_changed_columns,
      'previous_status', v_previous_status,
      'current_status', v_current_status
    )),
    v_request_id
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.upsert_activity_journey(
  p_journey_key text,
  p_journey_type text,
  p_module text,
  p_status text,
  p_current_step text,
  p_actor_profile_id uuid default null,
  p_actor_role text default null,
  p_workspace_type text default null,
  p_workspace_id text default null,
  p_subject_type text default null,
  p_subject_id text default null,
  p_contact_name text default null,
  p_contact_value text default null,
  p_last_error_code text default null,
  p_last_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_now timestamptz := now();
begin
  insert into public.activity_journeys (
    journey_key, journey_type, module, status, current_step,
    actor_profile_id, actor_role, workspace_type, workspace_id,
    subject_type, subject_id, contact_name, contact_value,
    last_error_code, last_error_message, metadata,
    started_at, last_activity_at, completed_at, failed_at, cancelled_at
  ) values (
    p_journey_key, p_journey_type, p_module, p_status, p_current_step,
    p_actor_profile_id, p_actor_role, p_workspace_type, p_workspace_id,
    p_subject_type, p_subject_id, p_contact_name, p_contact_value,
    p_last_error_code, left(p_last_error_message, 500), coalesce(p_metadata, '{}'::jsonb),
    v_now, v_now,
    case when p_status = 'completed' then v_now end,
    case when p_status = 'failed' then v_now end,
    case when p_status = 'cancelled' then v_now end
  )
  on conflict (journey_key) do update set
    journey_type = excluded.journey_type,
    module = excluded.module,
    status = excluded.status,
    current_step = excluded.current_step,
    actor_profile_id = coalesce(excluded.actor_profile_id, activity_journeys.actor_profile_id),
    actor_role = coalesce(excluded.actor_role, activity_journeys.actor_role),
    workspace_type = coalesce(excluded.workspace_type, activity_journeys.workspace_type),
    workspace_id = coalesce(excluded.workspace_id, activity_journeys.workspace_id),
    subject_type = coalesce(excluded.subject_type, activity_journeys.subject_type),
    subject_id = coalesce(excluded.subject_id, activity_journeys.subject_id),
    contact_name = coalesce(excluded.contact_name, activity_journeys.contact_name),
    contact_value = coalesce(excluded.contact_value, activity_journeys.contact_value),
    last_error_code = excluded.last_error_code,
    last_error_message = excluded.last_error_message,
    metadata = activity_journeys.metadata || excluded.metadata,
    last_activity_at = v_now,
    completed_at = case
      when excluded.status = 'completed' then coalesce(activity_journeys.completed_at, v_now)
      else null
    end,
    failed_at = case
      when excluded.status = 'failed' then coalesce(activity_journeys.failed_at, v_now)
      else null
    end,
    cancelled_at = case
      when excluded.status = 'cancelled' then coalesce(activity_journeys.cancelled_at, v_now)
      else null
    end
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.sync_activity_journey_from_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_parent jsonb := '{}'::jsonb;
  v_subject_id text := nullif(v_payload ->> 'id', '');
  v_property_id text;
  v_estate_id text;
  v_status text := coalesce(nullif(v_payload ->> 'status', ''), 'in_progress');
  v_journey_status text := 'in_progress';
  v_step text := 'started';
  v_module text := public.activity_module_for_table(tg_table_name);
  v_actor_id uuid := coalesce(
    auth.uid(),
    public.activity_jsonb_uuid(v_payload, array[
      'updated_by_profile_id', 'recorded_by_profile_id',
      'created_by_profile_id', 'completed_by_profile_id',
      'approved_by_profile_id', 'reviewed_by_profile_id',
      'owner_profile_id', 'profile_id', 'landlord_id'
    ])
  );
  v_actor_role text;
  v_child_count bigint := 0;
begin
  if v_actor_id is not null and to_regclass('public.profiles') is not null then
    execute 'select role::text from public.profiles where id = $1'
      into v_actor_role using v_actor_id;
  end if;

  if tg_table_name = 'demo_requests' then
    v_journey_status := case
      when tg_op = 'DELETE' then 'cancelled'
      when v_status = 'completed' then 'completed'
      when v_status = 'cancelled' then 'cancelled'
      else 'in_progress'
    end;
    v_step := case
      when tg_op = 'DELETE' then 'record_deleted'
      when v_status = 'pending' then 'awaiting_contact'
      when v_status = 'contacted' then 'contacted'
      when v_status = 'scheduled' then 'demo_scheduled'
      when v_status = 'completed' then 'demo_completed'
      when v_status = 'cancelled' then 'cancelled'
      else v_status
    end;

    perform public.upsert_activity_journey(
      'demo_request:' || v_subject_id,
      'demo_request', 'demo', v_journey_status, v_step,
      v_actor_id, v_actor_role, null, null,
      'demo_requests', v_subject_id,
      nullif(v_payload ->> 'full_name', ''),
      coalesce(nullif(v_payload ->> 'phone_number', ''), nullif(v_payload ->> 'work_email', '')),
      null, null,
      jsonb_strip_nulls(jsonb_build_object(
        'workspace_type', v_payload ->> 'workspace_type',
        'preferred_date', v_payload ->> 'preferred_date',
        'preferred_time_window', v_payload ->> 'preferred_time_window'
      ))
    );
  elsif tg_table_name = 'manager_tenant_onboarding_requests' then
    v_journey_status := case
      when tg_op = 'DELETE' then 'cancelled'
      when v_status in ('approved', 'payment_paid') then 'completed'
      when v_status in ('rejected', 'cancelled', 'expired', 'payment_expired') then 'cancelled'
      else 'in_progress'
    end;
    v_step := case
      when tg_op = 'DELETE' then 'record_deleted'
      when v_status = 'pending' then 'waiting_for_tenant_details'
      when v_status = 'submitted' then 'awaiting_manager_review'
      when v_status = 'agreement_sent' then 'waiting_for_agreement'
      when v_status = 'agreement_accepted' then 'payment_ready'
      when v_status = 'payment_initialized' then 'waiting_for_payment'
      when v_status = 'payment_paid' then 'tenant_activated'
      when v_status = 'approved' then 'current_tenant_activated'
      else v_status
    end;

    perform public.upsert_activity_journey(
      'manager_tenant_onboarding:' || v_subject_id,
      'tenant_onboarding', 'manager', v_journey_status, v_step,
      v_actor_id, v_actor_role, 'manager', v_payload ->> 'organization_id',
      'manager_tenant_onboarding_requests', v_subject_id,
      coalesce(nullif(v_payload ->> 'tenant_full_name', ''), nullif(v_payload ->> 'invited_tenant_full_name', '')),
      coalesce(nullif(v_payload ->> 'tenant_phone_number', ''), nullif(v_payload ->> 'invited_tenant_phone_number', '')),
      null, null,
      jsonb_strip_nulls(jsonb_build_object(
        'onboarding_type', v_payload ->> 'onboarding_type',
        'property_id', v_payload ->> 'property_id',
        'unit_id', v_payload ->> 'unit_id',
        'screening_result', v_payload ->> 'tenant_screening_result'
      ))
    );
  elsif tg_table_name = 'manager_properties' then
    if to_regclass('public.manager_units') is not null then
      execute 'select count(*) from public.manager_units where property_id = $1::uuid and coalesce(status::text, ''active'') <> ''inactive'''
        into v_child_count using v_subject_id;
    end if;

    if tg_op = 'DELETE' then
      v_journey_status := 'cancelled';
      v_step := 'record_deleted';
    elsif v_status in ('inactive', 'archived') then
      v_journey_status := 'cancelled';
      v_step := 'property_inactive';
    elsif v_child_count = 0 then
      v_journey_status := 'in_progress';
      v_step := 'add_units';
    elsif nullif(v_payload ->> 'existing_tenant_setup_completed_at', '') is not null then
      v_journey_status := 'completed';
      v_step := 'existing_tenants_captured';
    elsif coalesce((v_payload ->> 'existing_tenant_setup_required')::boolean, false) then
      v_journey_status := 'in_progress';
      v_step := 'capture_existing_tenants';
    else
      v_journey_status := 'completed';
      v_step := 'property_ready';
    end if;

    perform public.upsert_activity_journey(
      'manager_property_onboarding:' || v_subject_id,
      'property_onboarding', 'manager', v_journey_status, v_step,
      v_actor_id, v_actor_role, 'manager', v_payload ->> 'organization_id',
      'manager_properties', v_subject_id,
      nullif(v_payload ->> 'property_name', ''), null,
      null, null,
      jsonb_strip_nulls(jsonb_build_object(
        'landlord_client_id', v_payload ->> 'landlord_client_id',
        'has_existing_tenants', v_payload ->> 'existing_tenant_setup_required'
      ))
    );
  elsif tg_table_name = 'manager_units' then
    v_property_id := nullif(v_payload ->> 'property_id', '');
    if v_property_id is not null and to_regclass('public.manager_properties') is not null then
      execute 'select to_jsonb(p) from public.manager_properties p where p.id = $1::uuid'
        into v_parent using v_property_id;
    end if;

    v_child_count := 0;
    if v_property_id is not null and to_regclass('public.manager_units') is not null then
      execute 'select count(*) from public.manager_units where property_id = $1::uuid and coalesce(status::text, ''active'') <> ''inactive'''
        into v_child_count using v_property_id;
    end if;

    if v_child_count = 0 then
      v_step := 'add_units';
    elsif coalesce((v_parent ->> 'existing_tenant_setup_required')::boolean, false)
      and nullif(v_parent ->> 'existing_tenant_setup_completed_at', '') is null then
      v_step := 'capture_existing_tenants';
    else
      v_journey_status := 'completed';
      v_step := 'property_ready';
    end if;

    perform public.upsert_activity_journey(
      'manager_property_onboarding:' || v_property_id,
      'property_onboarding', 'manager', v_journey_status, v_step,
      v_actor_id, v_actor_role, 'manager', v_payload ->> 'organization_id',
      'manager_properties', v_property_id,
      nullif(v_parent ->> 'property_name', ''), null,
      null, null,
      jsonb_build_object('latest_unit_id', v_subject_id, 'unit_count', v_child_count)
    );
  elsif tg_table_name = 'properties' then
    if to_regclass('public.units') is not null then
      execute 'select count(*) from public.units where property_id = $1::uuid and deleted_at is null'
        into v_child_count using v_subject_id;
    end if;

    perform public.upsert_activity_journey(
      'landlord_property_onboarding:' || v_subject_id,
      'property_onboarding', 'landlord',
      case when tg_op = 'DELETE' or v_status in ('inactive', 'archived') then 'cancelled' when v_child_count > 0 then 'completed' else 'in_progress' end,
      case when tg_op = 'DELETE' then 'record_deleted' when v_status in ('inactive', 'archived') then 'property_inactive' when v_child_count > 0 then 'property_ready' else 'add_units' end,
      v_actor_id, v_actor_role, 'landlord', v_payload ->> 'landlord_id',
      'properties', v_subject_id,
      nullif(v_payload ->> 'name', ''), null,
      null, null, '{}'::jsonb
    );
  elsif tg_table_name = 'units' then
    v_property_id := nullif(v_payload ->> 'property_id', '');
    v_child_count := 0;
    if v_property_id is not null and to_regclass('public.units') is not null then
      execute 'select count(*) from public.units where property_id = $1::uuid and deleted_at is null'
        into v_child_count using v_property_id;
    end if;

    perform public.upsert_activity_journey(
      'landlord_property_onboarding:' || v_property_id,
      'property_onboarding', 'landlord',
      case when v_child_count > 0 then 'completed' else 'in_progress' end,
      case when v_child_count > 0 then 'property_ready' else 'add_units' end,
      v_actor_id, v_actor_role, 'landlord', null,
      'properties', v_property_id,
      null, null, null, null,
      jsonb_build_object('latest_unit_id', v_subject_id, 'unit_count', v_child_count)
    );
  elsif tg_table_name = 'developer_estates' then
    if to_regclass('public.developer_plots') is not null then
      execute 'select count(*) from public.developer_plots where estate_id = $1::uuid'
        into v_child_count using v_subject_id;
    end if;

    perform public.upsert_activity_journey(
      'developer_estate_onboarding:' || v_subject_id,
      'property_onboarding', 'developer',
      case when tg_op = 'DELETE' or v_status in ('inactive', 'archived') then 'cancelled' when v_child_count > 0 then 'completed' else 'in_progress' end,
      case when tg_op = 'DELETE' then 'record_deleted' when v_status in ('inactive', 'archived') then 'estate_inactive' when v_child_count > 0 then 'estate_ready' else 'add_plots' end,
      v_actor_id, v_actor_role, 'developer', v_payload ->> 'developer_account_id',
      'developer_estates', v_subject_id,
      coalesce(nullif(v_payload ->> 'estate_name', ''), nullif(v_payload ->> 'name', '')), null,
      null, null, '{}'::jsonb
    );
  elsif tg_table_name = 'developer_plots' then
    v_estate_id := nullif(v_payload ->> 'estate_id', '');
    v_child_count := 0;
    if v_estate_id is not null and to_regclass('public.developer_plots') is not null then
      execute 'select count(*) from public.developer_plots where estate_id = $1::uuid'
        into v_child_count using v_estate_id;
    end if;

    perform public.upsert_activity_journey(
      'developer_estate_onboarding:' || v_estate_id,
      'property_onboarding', 'developer',
      case when v_child_count > 0 then 'completed' else 'in_progress' end,
      case when v_child_count > 0 then 'estate_ready' else 'add_plots' end,
      v_actor_id, v_actor_role, 'developer', v_payload ->> 'developer_account_id',
      'developer_estates', v_estate_id,
      null, null, null, null,
      jsonb_build_object('latest_plot_id', v_subject_id, 'plot_count', v_child_count)
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

-- Attach sanitized row-change auditing to every operational table that is
-- present in the live project. Missing tables are skipped, making this safe
-- across environments with different historical migration sequences.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'profiles',
    'landlord_settings', 'properties', 'blocks', 'units', 'tenants',
    'tenancies', 'property_rules', 'property_applications', 'guarantors',
    'existing_tenant_claims', 'tenant_kyc_profiles',
    'tenant_processing_fee_access', 'tenant_activation_tokens',
    'landlord_tenancy_charges', 'opening_balance_declarations',
    'quit_notices', 'renewal_queue',
    'caretaker_invites', 'caretaker_assignments', 'caretaker_payment_claims',
    'agent_profiles', 'agent_property_listings', 'agent_property_listing_media',
    'agent_paystack_accounts', 'agent_tenant_processing_fee_intents',
    'manager_organizations', 'manager_staff_invites', 'manager_staff_members',
    'manager_landlord_clients', 'manager_landlord_payout_profiles',
    'manager_properties', 'manager_units', 'manager_tenants',
    'manager_tenant_onboarding_requests', 'manager_tenant_guarantors',
    'manager_tenant_agreement_documents', 'manager_property_rules',
    'manager_property_service_charges', 'manager_property_tenant_requirements',
    'manager_maintenance_requests', 'manager_landlord_remittances',
    'manager_rent_payment_requests', 'manager_rent_payments',
    'manager_rent_payment_receipts', 'manager_statement_documents',
    'manager_document_share_links', 'manager_paystack_accounts',
    'manager_landlord_paystack_accounts',
    'developer_accounts', 'developer_profiles', 'developer_staff_role_links',
    'developer_staff_permissions', 'developer_estates', 'developer_plot_types',
    'developer_plots', 'developer_buyers', 'developer_plot_assignments',
    'developer_sales', 'developer_payment_plans',
    'developer_payment_schedule_items', 'developer_payment_intents',
    'developer_sale_payments', 'developer_payment_allocations',
    'developer_sale_ledger_entries', 'developer_document_templates',
    'developer_sale_documents', 'developer_paystack_accounts',
    'developer_buyer_purchase_links', 'developer_buyer_sale_access_tokens',
    'rent_payments', 'ledger_entries', 'tenant_ledger', 'receipts',
    'gateway_payment_intents', 'gateway_payment_events',
    'payment_webhook_events', 'payment_allocations',
    'app_fee_payment_intents', 'landlord_paystack_accounts',
    'landlord_tenant_processing_fee_intents',
    'tenant_application_processing_fee_intents',
    'subscriptions', 'subscription_payments', 'business_subscriptions',
    'business_subscription_payments', 'business_subscription_webhook_events',
    'agreement_templates', 'tenancy_agreement_documents',
    'platform_payment_settings', 'otp_store', 'otp_delivery_logs',
    'notifications', 'public_tool_leads', 'public_generated_agreements',
    'public_generated_receipts', 'agreement_usage_events',
    'receipt_usage_events', 'demo_requests', 'offline_mutation_receipts'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'drop trigger if exists %I on public.%I',
        'activity_audit_' || v_table,
        v_table
      );
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.capture_activity_row_change()',
        'activity_audit_' || v_table,
        v_table
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'demo_requests',
    'manager_tenant_onboarding_requests',
    'manager_properties', 'manager_units',
    'properties', 'units',
    'developer_estates', 'developer_plots'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format(
        'drop trigger if exists %I on public.%I',
        'activity_journey_' || v_table,
        v_table
      );
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.sync_activity_journey_from_row_change()',
        'activity_journey_' || v_table,
        v_table
      );
    end if;
  end loop;
end;
$$;

-- Preserve the application-level events that BOPA already recorded before
-- this unified stream was introduced. Both known historical `audit_logs`
-- layouts are supported and the legacy row id prevents duplicate backfills.
do $$
begin
  if to_regclass('public.audit_logs') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'event_type'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'description'
  ) then
    execute $backfill$
      insert into public.activity_events (
        module, event_name, event_category, outcome, source,
        actor_profile_id, actor_role, workspace_type, workspace_id,
        subject_type, subject_id, description, metadata,
        ip_address, user_agent, created_at
      )
      select
        case
          when a.event_type like 'manager.%' then 'manager'
          when a.event_type like 'developer.%' then 'developer'
          when a.event_type like 'agent.%' then 'agent'
          when a.event_type like 'caretaker.%' then 'caretaker'
          when a.event_type like 'tenant.%' then 'tenant'
          when a.event_type like 'payment.%' or a.event_type like 'receipt.%' then 'payments'
          when a.event_type like 'subscription.%' then 'subscriptions'
          when a.event_type like 'demo.%' then 'demo'
          else 'landlord'
        end,
        a.event_type,
        case
          when a.event_type like 'payment.%' or a.event_type like 'receipt.%' then 'payment'
          when a.event_type like '%onboarding%' or a.event_type like 'tenant.%' then 'onboarding'
          when a.event_type like 'agreement.%' or a.event_type like 'quit_notice.%' then 'document'
          else 'data_change'
        end,
        case
          when a.event_type like '%failed%' then 'failed'
          when a.event_type like '%ignored%' then 'informational'
          else 'succeeded'
        end,
        'application',
        a.actor_profile_id,
        a.actor_role::text,
        case when a.landlord_id is not null then 'landlord' end,
        a.landlord_id::text,
        a.entity_type,
        a.entity_id,
        a.description,
        coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object('legacy_audit_log_id', a.id::text),
        a.ip_address,
        a.user_agent,
        a.created_at
      from public.audit_logs a
      on conflict do nothing
    $backfill$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'action'
  ) then
    execute $backfill$
      insert into public.activity_events (
        module, event_name, event_category, outcome, source,
        actor_profile_id, actor_role, subject_type, subject_id,
        description, metadata, ip_address, user_agent, request_id, created_at
      )
      select
        'system',
        a.action,
        'data_change',
        case when a.action like '%failed%' then 'failed' else 'succeeded' end,
        'application',
        a.actor_id,
        a.actor_role::text,
        a.entity_type,
        a.entity_id,
        replace(a.action, '_', ' '),
        coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object('legacy_audit_log_id', a.id::text),
        a.ip_address,
        a.user_agent,
        a.request_id,
        a.created_at
      from public.audit_logs a
      on conflict do nothing
    $backfill$;
  end if;
end;
$$;

-- Backfill the current state of journeys that began before this migration.
-- Only operational state is copied; tokens, identity documents, bank details,
-- passwords and raw provider payloads are never read into the audit tables.
do $$
declare
  v_payload jsonb;
  v_status text;
  v_journey_status text;
  v_step text;
  v_parent_count bigint;
begin
  if to_regclass('public.demo_requests') is not null then
    for v_payload in execute 'select to_jsonb(t) from public.demo_requests t' loop
      v_status := coalesce(v_payload ->> 'status', 'pending');
      v_journey_status := case
        when v_status = 'completed' then 'completed'
        when v_status = 'cancelled' then 'cancelled'
        else 'in_progress'
      end;
      v_step := case
        when v_status = 'pending' then 'awaiting_contact'
        when v_status = 'contacted' then 'contacted'
        when v_status = 'scheduled' then 'demo_scheduled'
        when v_status = 'completed' then 'demo_completed'
        else 'cancelled'
      end;

      perform public.upsert_activity_journey(
        'demo_request:' || (v_payload ->> 'id'),
        'demo_request', 'demo', v_journey_status, v_step,
        null, 'system', null, null,
        'demo_requests', v_payload ->> 'id',
        nullif(v_payload ->> 'full_name', ''),
        coalesce(nullif(v_payload ->> 'phone_number', ''), nullif(v_payload ->> 'work_email', '')),
        null, null,
        jsonb_strip_nulls(jsonb_build_object(
          'workspace_type', v_payload ->> 'workspace_type',
          'preferred_date', v_payload ->> 'preferred_date',
          'backfilled', true
        ))
      );
    end loop;
  end if;

  if to_regclass('public.manager_tenant_onboarding_requests') is not null then
    for v_payload in execute 'select to_jsonb(t) from public.manager_tenant_onboarding_requests t' loop
      v_status := coalesce(v_payload ->> 'status', 'pending');
      v_journey_status := case
        when v_status in ('approved', 'payment_paid') then 'completed'
        when v_status in ('rejected', 'cancelled', 'expired', 'payment_expired') then 'cancelled'
        else 'in_progress'
      end;
      v_step := case
        when v_status = 'pending' then 'waiting_for_tenant_details'
        when v_status = 'submitted' then 'awaiting_manager_review'
        when v_status = 'agreement_sent' then 'waiting_for_agreement'
        when v_status = 'agreement_accepted' then 'payment_ready'
        when v_status = 'payment_initialized' then 'waiting_for_payment'
        when v_status = 'payment_paid' then 'tenant_activated'
        when v_status = 'approved' then 'current_tenant_activated'
        else v_status
      end;

      perform public.upsert_activity_journey(
        'manager_tenant_onboarding:' || (v_payload ->> 'id'),
        'tenant_onboarding', 'manager', v_journey_status, v_step,
        public.activity_jsonb_uuid(v_payload, array['approved_by_profile_id', 'created_by_profile_id']),
        'manager', 'manager', v_payload ->> 'organization_id',
        'manager_tenant_onboarding_requests', v_payload ->> 'id',
        coalesce(nullif(v_payload ->> 'tenant_full_name', ''), nullif(v_payload ->> 'invited_tenant_full_name', '')),
        coalesce(nullif(v_payload ->> 'tenant_phone_number', ''), nullif(v_payload ->> 'invited_tenant_phone_number', '')),
        null, null,
        jsonb_strip_nulls(jsonb_build_object(
          'onboarding_type', v_payload ->> 'onboarding_type',
          'property_id', v_payload ->> 'property_id',
          'unit_id', v_payload ->> 'unit_id',
          'backfilled', true
        ))
      );
    end loop;
  end if;

  if to_regclass('public.manager_properties') is not null then
    for v_payload in execute 'select to_jsonb(t) from public.manager_properties t' loop
      v_parent_count := 0;
      if to_regclass('public.manager_units') is not null then
        execute 'select count(*) from public.manager_units where property_id = $1::uuid and coalesce(status::text, ''active'') <> ''inactive'''
          into v_parent_count using v_payload ->> 'id';
      end if;

      if coalesce(v_payload ->> 'status', 'active') in ('inactive', 'archived') then
        v_journey_status := 'cancelled';
        v_step := 'property_inactive';
      elsif v_parent_count = 0 then
        v_journey_status := 'in_progress';
        v_step := 'add_units';
      elsif coalesce((v_payload ->> 'existing_tenant_setup_required')::boolean, false)
        and nullif(v_payload ->> 'existing_tenant_setup_completed_at', '') is null then
        v_journey_status := 'in_progress';
        v_step := 'capture_existing_tenants';
      else
        v_journey_status := 'completed';
        v_step := 'property_ready';
      end if;

      perform public.upsert_activity_journey(
        'manager_property_onboarding:' || (v_payload ->> 'id'),
        'property_onboarding', 'manager', v_journey_status, v_step,
        null, 'manager', 'manager', v_payload ->> 'organization_id',
        'manager_properties', v_payload ->> 'id',
        nullif(v_payload ->> 'property_name', ''), null,
        null, null,
        jsonb_build_object('unit_count', v_parent_count, 'backfilled', true)
      );
    end loop;
  end if;

  if to_regclass('public.properties') is not null then
    for v_payload in execute 'select to_jsonb(t) from public.properties t' loop
      v_parent_count := 0;
      if to_regclass('public.units') is not null then
        execute 'select count(*) from public.units where property_id = $1::uuid and deleted_at is null'
          into v_parent_count using v_payload ->> 'id';
      end if;

      perform public.upsert_activity_journey(
        'landlord_property_onboarding:' || (v_payload ->> 'id'),
        'property_onboarding', 'landlord',
        case when v_parent_count > 0 then 'completed' else 'in_progress' end,
        case when v_parent_count > 0 then 'property_ready' else 'add_units' end,
        public.activity_jsonb_uuid(v_payload, array['landlord_id']),
        'landlord', 'landlord', v_payload ->> 'landlord_id',
        'properties', v_payload ->> 'id',
        coalesce(nullif(v_payload ->> 'name', ''), nullif(v_payload ->> 'property_name', '')), null,
        null, null,
        jsonb_build_object('unit_count', v_parent_count, 'backfilled', true)
      );
    end loop;
  end if;

  if to_regclass('public.developer_estates') is not null then
    for v_payload in execute 'select to_jsonb(t) from public.developer_estates t' loop
      v_parent_count := 0;
      if to_regclass('public.developer_plots') is not null then
        execute 'select count(*) from public.developer_plots where estate_id = $1::uuid'
          into v_parent_count using v_payload ->> 'id';
      end if;

      perform public.upsert_activity_journey(
        'developer_estate_onboarding:' || (v_payload ->> 'id'),
        'property_onboarding', 'developer',
        case when v_parent_count > 0 then 'completed' else 'in_progress' end,
        case when v_parent_count > 0 then 'estate_ready' else 'add_plots' end,
        null, 'developer', 'developer', v_payload ->> 'developer_account_id',
        'developer_estates', v_payload ->> 'id',
        coalesce(nullif(v_payload ->> 'estate_name', ''), nullif(v_payload ->> 'name', '')), null,
        null, null,
        jsonb_build_object('plot_count', v_parent_count, 'backfilled', true)
      );
    end loop;
  end if;

  -- Existing authentication accounts that never received a BOPA profile are
  -- the historical sign-ups most likely to have stopped halfway.
  if to_regclass('auth.users') is not null and to_regclass('public.profiles') is not null then
    for v_payload in execute $query$
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'phone', u.phone,
        'full_name', u.raw_user_meta_data ->> 'full_name',
        'role', u.raw_user_meta_data ->> 'role',
        'created_at', u.created_at
      )
      from auth.users u
      left join public.profiles p on p.id = u.id
      where p.id is null
        and u.deleted_at is null
    $query$ loop
      perform public.upsert_activity_journey(
        'signup:orphaned_auth_user:' || (v_payload ->> 'id'),
        'signup', case
          when v_payload ->> 'role' in ('landlord', 'tenant', 'caretaker', 'agent', 'manager', 'developer')
            then v_payload ->> 'role'
          else 'auth'
        end,
        'in_progress', 'profile_missing',
        (v_payload ->> 'id')::uuid,
        nullif(v_payload ->> 'role', ''), null, null,
        'profiles', v_payload ->> 'id',
        nullif(v_payload ->> 'full_name', ''),
        coalesce(nullif(v_payload ->> 'phone', ''), nullif(v_payload ->> 'email', '')),
        'PROFILE_MISSING', 'Authentication account exists, but the BOPA profile was not completed.',
        jsonb_build_object('backfilled', true, 'auth_created_at', v_payload ->> 'created_at')
      );
    end loop;
  end if;
end;
$$;

revoke all on function public.activity_jsonb_uuid(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.activity_module_for_table(text) from public, anon, authenticated;
revoke all on function public.capture_activity_row_change() from public, anon, authenticated;
revoke all on function public.sync_activity_journey_from_row_change() from public, anon, authenticated;
revoke all on function public.protect_activity_event_immutability() from public, anon, authenticated;
revoke all on function public.upsert_activity_journey(
  text, text, text, text, text, uuid, text, text, text, text, text,
  text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.upsert_activity_journey(
  text, text, text, text, text, uuid, text, text, text, text, text,
  text, text, text, text, jsonb
) to service_role;

comment on table public.activity_events is
  'Immutable, sanitized, platform-wide record of meaningful BOPA activity.';
comment on table public.activity_journeys is
  'Current progress of multi-step BOPA sign-up, property, tenant and demo journeys.';

notify pgrst, 'reload schema';

commit;
