begin;

create table if not exists public.offline_mutation_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,
  workspace_type text not null
    check (
      workspace_type in (
        'manager',
        'developer'
      )
    ),
  workspace_id uuid not null,
  client_mutation_id uuid not null,
  entity_type text not null
    check (
      entity_type in (
        'manager_maintenance_request',
        'manager_property',
        'manager_tenant',
        'developer_estate',
        'developer_buyer'
      )
    ),
  entity_id uuid not null,
  operation text not null
    check (
      operation in (
        'create',
        'update'
      )
    ),
  request_hash text not null
    check (length(request_hash) = 64),
  status text not null
    check (
      status in (
        'processing',
        'completed',
        'conflict',
        'rejected'
      )
    ),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    profile_id,
    client_mutation_id
  )
);

create index if not exists
  offline_mutation_receipts_workspace_idx
on public.offline_mutation_receipts (
  workspace_type,
  workspace_id,
  created_at desc
);

alter table
  public.offline_mutation_receipts
enable row level security;

revoke all
on table public.offline_mutation_receipts
from anon, authenticated;

create or replace function
  public.apply_offline_safe_mutation(
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
declare
  v_receipt_id uuid;
  v_existing_receipt
    public.offline_mutation_receipts%rowtype;
  v_result jsonb;
  v_entity jsonb;
  v_profile_role text;
  v_manager_role text;
  v_is_developer_owner boolean;
  v_developer_profile_id uuid;
  v_has_buyer_permission boolean := false;
  v_current_revision bigint;
  v_landlord_client_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_maintenance
    public.manager_maintenance_requests%rowtype;
  v_property
    public.manager_properties%rowtype;
  v_tenant
    public.manager_tenants%rowtype;
  v_estate
    public.developer_estates%rowtype;
  v_buyer
    public.developer_buyers%rowtype;
begin
  if
    p_profile_id is null
    or p_workspace_id is null
    or p_client_mutation_id is null
    or p_entity_id is null
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
  then
    return jsonb_build_object(
      'clientMutationId',
      p_client_mutation_id,
      'status',
      'rejected',
      'code',
      'OFFLINE_INVALID_CHANGE',
      'message',
      'This offline change is invalid.'
    );
  end if;

  select role
  into v_profile_role
  from public.profiles
  where
    id = p_profile_id
    and is_active = true;

  if v_profile_role is null then
    return jsonb_build_object(
      'clientMutationId',
      p_client_mutation_id,
      'status',
      'rejected',
      'code',
      'OFFLINE_PROFILE_INACTIVE',
      'message',
      'This account is no longer active.'
    );
  end if;

  if p_workspace_type = 'manager' then
    if v_profile_role <> 'manager' then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_MANAGER_ACCESS_REQUIRED',
        'message',
        'This manager workspace is unavailable.'
      );
    end if;

    select
      case
        when organization.owner_profile_id =
          p_profile_id
        then 'owner'
        else staff.staff_role
      end
    into v_manager_role
    from public.manager_organizations
      as organization
    left join public.manager_staff_members
      as staff
      on staff.organization_id =
        organization.id
      and staff.profile_id =
        p_profile_id
      and staff.status = 'active'
    where
      organization.id = p_workspace_id
      and organization.status = 'active'
      and (
        organization.owner_profile_id =
          p_profile_id
        or staff.id is not null
      )
    limit 1;

    if v_manager_role is null then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_WORKSPACE_ACCESS_REVOKED',
        'message',
        'You no longer have access to this workspace.'
      );
    end if;

    if
      p_entity_type =
        'manager_maintenance_request'
      and v_manager_role not in (
        'owner',
        'manager',
        'maintenance_officer'
      )
    then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_PERMISSION_DENIED',
        'message',
        'You do not have permission to manage maintenance.'
      );
    end if;

    if
      p_entity_type in (
        'manager_property',
        'manager_tenant'
      )
      and v_manager_role not in (
        'owner',
        'manager',
        'property_officer'
      )
    then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_PERMISSION_DENIED',
        'message',
        'You do not have permission to edit this record.'
      );
    end if;
  elsif p_workspace_type = 'developer' then
    if v_profile_role <> 'developer' then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_DEVELOPER_ACCESS_REQUIRED',
        'message',
        'This developer workspace is unavailable.'
      );
    end if;

    select
      account.owner_profile_id =
        p_profile_id
    into v_is_developer_owner
    from public.developer_accounts
      as account
    where
      account.id = p_workspace_id
      and account.status = 'active';

    if v_is_developer_owner is null then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_WORKSPACE_ACCESS_REVOKED',
        'message',
        'You no longer have access to this workspace.'
      );
    end if;

    if not v_is_developer_owner then
      select profile.id
      into v_developer_profile_id
      from public.developer_profiles
        as profile
      where
        profile.developer_account_id =
          p_workspace_id
        and profile.profile_id =
          p_profile_id
        and profile.is_active = true
        and profile.revoked_at is null
      limit 1;

      if v_developer_profile_id is null then
        return jsonb_build_object(
          'clientMutationId',
          p_client_mutation_id,
          'status',
          'rejected',
          'code',
          'OFFLINE_WORKSPACE_ACCESS_REVOKED',
          'message',
          'You no longer have access to this workspace.'
        );
      end if;

      select exists (
        select 1
        from public.developer_staff_permissions
        where
          developer_account_id =
            p_workspace_id
          and developer_profile_id =
            v_developer_profile_id
          and permission_key =
            'buyer:create'
      )
      into v_has_buyer_permission;
    end if;

    if
      p_entity_type = 'developer_estate'
      and not v_is_developer_owner
    then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_PERMISSION_DENIED',
        'message',
        'Only the company owner can edit estate details offline.'
      );
    end if;

    if
      p_entity_type = 'developer_buyer'
      and not (
        v_is_developer_owner
        or v_has_buyer_permission
      )
    then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_PERMISSION_DENIED',
        'message',
        'You do not have permission to edit buyer contact details.'
      );
    end if;
  else
    return jsonb_build_object(
      'clientMutationId',
      p_client_mutation_id,
      'status',
      'rejected',
      'code',
      'OFFLINE_WORKSPACE_INVALID',
      'message',
      'This offline workspace is invalid.'
    );
  end if;

  insert into public.offline_mutation_receipts (
    profile_id,
    workspace_type,
    workspace_id,
    client_mutation_id,
    entity_type,
    entity_id,
    operation,
    request_hash,
    status
  )
  values (
    p_profile_id,
    p_workspace_type,
    p_workspace_id,
    p_client_mutation_id,
    p_entity_type,
    p_entity_id,
    p_operation,
    p_request_hash,
    'processing'
  )
  on conflict (
    profile_id,
    client_mutation_id
  )
  do nothing
  returning id
  into v_receipt_id;

  if v_receipt_id is null then
    select *
    into v_existing_receipt
    from public.offline_mutation_receipts
    where
      profile_id = p_profile_id
      and client_mutation_id =
        p_client_mutation_id
    for update;

    if
      v_existing_receipt.request_hash <>
        p_request_hash
    then
      return jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_MUTATION_ID_REUSED',
        'message',
        'This offline change identifier was already used.'
      );
    end if;

    if
      v_existing_receipt.status =
        'completed'
    then
      return jsonb_set(
        v_existing_receipt.result,
        '{status}',
        '"duplicate"'::jsonb,
        true
      );
    end if;

    if
      v_existing_receipt.status in (
        'conflict',
        'rejected'
      )
    then
      return v_existing_receipt.result;
    end if;

    v_receipt_id :=
      v_existing_receipt.id;
  end if;

  if
    p_workspace_type = 'manager'
    and p_entity_type =
      'manager_maintenance_request'
    and p_operation = 'create'
  then
    v_property_id :=
      (p_payload ->> 'propertyId')::uuid;
    v_unit_id :=
      nullif(
        p_payload ->> 'unitId',
        ''
      )::uuid;
    v_tenant_id :=
      nullif(
        p_payload ->> 'tenantId',
        ''
      )::uuid;

    select landlord_client_id
    into v_landlord_client_id
    from public.manager_properties
    where
      id = v_property_id
      and organization_id =
        p_workspace_id
      and status = 'active';

    if
      v_landlord_client_id is null
      or v_landlord_client_id <>
        (
          p_payload ->>
            'landlordClientId'
        )::uuid
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_PROPERTY_NOT_FOUND',
        'message',
        'The selected property is no longer available.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    if
      v_unit_id is not null
      and not exists (
        select 1
        from public.manager_units
        where
          id = v_unit_id
          and organization_id =
            p_workspace_id
          and property_id =
            v_property_id
          and status <> 'inactive'
      )
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_UNIT_NOT_FOUND',
        'message',
        'The selected unit is no longer available.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    if
      v_tenant_id is not null
      and (
        v_unit_id is null
        or not exists (
          select 1
          from public.manager_tenants
          where
            id = v_tenant_id
            and organization_id =
              p_workspace_id
            and property_id =
              v_property_id
            and unit_id = v_unit_id
            and status in (
              'active',
              'eviction_notice'
            )
        )
      )
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_TENANT_NOT_FOUND',
        'message',
        'The selected tenant is no longer available.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    insert into
      public.manager_maintenance_requests (
        id,
        organization_id,
        landlord_client_id,
        property_id,
        unit_id,
        tenant_id,
        issue_title,
        issue_description,
        priority,
        status,
        estimated_cost,
        actual_cost,
        vendor_name,
        reported_date,
        resolved_date,
        notes,
        metadata,
        created_by_profile_id,
        updated_by_profile_id
      )
    values (
      p_entity_id,
      p_workspace_id,
      v_landlord_client_id,
      v_property_id,
      v_unit_id,
      v_tenant_id,
      trim(
        p_payload ->> 'issueTitle'
      ),
      nullif(
        trim(
          coalesce(
            p_payload ->>
              'issueDescription',
            ''
          )
        ),
        ''
      ),
      (
        p_payload ->> 'priority'
      )::public.manager_maintenance_priority,
      'reported'::public.manager_maintenance_status,
      (
        p_payload ->>
          'estimatedCost'
      )::numeric,
      0,
      nullif(
        trim(
          coalesce(
            p_payload ->>
              'vendorName',
            ''
          )
        ),
        ''
      ),
      (
        p_payload ->>
          'reportedDate'
      )::date,
      null,
      nullif(
        trim(
          coalesce(
            p_payload ->> 'notes',
            ''
          )
        ),
        ''
      ),
      jsonb_build_object(
        'source',
        'bopa_manager_offline_maintenance',
        'offline_client_mutation_id',
        p_client_mutation_id::text
      ),
      p_profile_id,
      p_profile_id
    )
    returning *
    into v_maintenance;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_maintenance_request',
      'entityId',
      v_maintenance.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_maintenance.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_maintenance.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_maintenance.id,
        'property_id',
        v_maintenance.property_id,
        'unit_id',
        v_maintenance.unit_id,
        'tenant_id',
        v_maintenance.tenant_id,
        'issue_title',
        v_maintenance.issue_title,
        'issue_description',
        v_maintenance.issue_description,
        'priority',
        v_maintenance.priority,
        'status',
        v_maintenance.status,
        'estimated_cost',
        v_maintenance.estimated_cost,
        'actual_cost',
        v_maintenance.actual_cost,
        'vendor_name',
        v_maintenance.vendor_name,
        'reported_date',
        v_maintenance.reported_date,
        'resolved_date',
        v_maintenance.resolved_date,
        'notes',
        v_maintenance.notes,
        'created_at',
        v_maintenance.created_at,
        'updated_at',
        v_maintenance.updated_at
      )
    );
  elsif
    p_workspace_type = 'manager'
    and p_entity_type =
      'manager_maintenance_request'
    and p_operation = 'update'
  then
    select *
    into v_maintenance
    from public.manager_maintenance_requests
    where
      id = p_entity_id
      and organization_id =
        p_workspace_id
    for update;

    if not found then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RECORD_NOT_FOUND',
        'message',
        'This maintenance record no longer exists.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    v_current_revision :=
      floor(
        extract(
          epoch from
            v_maintenance.updated_at
        ) * 1000
      )::bigint;

    if
      p_base_revision is null
      or p_base_revision <>
        v_current_revision
    then
      v_entity := jsonb_build_object(
        'entityType',
        'manager_maintenance_request',
        'entityId',
        v_maintenance.id,
        'serverRevision',
        v_current_revision,
        'updatedAt',
        v_maintenance.updated_at,
        'deletedAt',
        null,
        'data',
        jsonb_build_object(
          'id',
          v_maintenance.id,
          'property_id',
          v_maintenance.property_id,
          'unit_id',
          v_maintenance.unit_id,
          'tenant_id',
          v_maintenance.tenant_id,
          'issue_title',
          v_maintenance.issue_title,
          'issue_description',
          v_maintenance.issue_description,
          'priority',
          v_maintenance.priority,
          'status',
          v_maintenance.status,
          'estimated_cost',
          v_maintenance.estimated_cost,
          'actual_cost',
          v_maintenance.actual_cost,
          'vendor_name',
          v_maintenance.vendor_name,
          'reported_date',
          v_maintenance.reported_date,
          'resolved_date',
          v_maintenance.resolved_date,
          'notes',
          v_maintenance.notes,
          'created_at',
          v_maintenance.created_at,
          'updated_at',
          v_maintenance.updated_at
        )
      );

      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'conflict',
        'code',
        'OFFLINE_CONFLICT',
        'message',
        'This maintenance record changed on another device.',
        'serverEntity',
        v_entity
      );

      update public.offline_mutation_receipts
      set
        status = 'conflict',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    if
      p_payload ->> 'status' =
        'resolved'
      and nullif(
        p_payload ->> 'resolvedDate',
        ''
      ) is null
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RESOLVED_DATE_REQUIRED',
        'message',
        'Set a resolved date when the issue is resolved.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    update
      public.manager_maintenance_requests
    set
      issue_title =
        trim(
          p_payload ->> 'issueTitle'
        ),
      issue_description =
        nullif(
          trim(
            coalesce(
              p_payload ->>
                'issueDescription',
              ''
            )
          ),
          ''
        ),
      priority =
        (
          p_payload ->> 'priority'
        )::public.manager_maintenance_priority,
      status =
        (
          p_payload ->> 'status'
        )::public.manager_maintenance_status,
      estimated_cost =
        (
          p_payload ->>
            'estimatedCost'
        )::numeric,
      vendor_name =
        nullif(
          trim(
            coalesce(
              p_payload ->>
                'vendorName',
              ''
            )
          ),
          ''
        ),
      reported_date =
        (
          p_payload ->>
            'reportedDate'
        )::date,
      resolved_date =
        nullif(
          p_payload ->>
            'resolvedDate',
          ''
        )::date,
      notes =
        nullif(
          trim(
            coalesce(
              p_payload ->> 'notes',
              ''
            )
          ),
          ''
        ),
      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        ) ||
        jsonb_build_object(
          'offline_last_mutation_id',
          p_client_mutation_id::text
        ),
      updated_by_profile_id =
        p_profile_id,
      updated_at = now()
    where id = p_entity_id
    returning *
    into v_maintenance;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_maintenance_request',
      'entityId',
      v_maintenance.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_maintenance.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_maintenance.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_maintenance.id,
        'property_id',
        v_maintenance.property_id,
        'unit_id',
        v_maintenance.unit_id,
        'tenant_id',
        v_maintenance.tenant_id,
        'issue_title',
        v_maintenance.issue_title,
        'issue_description',
        v_maintenance.issue_description,
        'priority',
        v_maintenance.priority,
        'status',
        v_maintenance.status,
        'estimated_cost',
        v_maintenance.estimated_cost,
        'actual_cost',
        v_maintenance.actual_cost,
        'vendor_name',
        v_maintenance.vendor_name,
        'reported_date',
        v_maintenance.reported_date,
        'resolved_date',
        v_maintenance.resolved_date,
        'notes',
        v_maintenance.notes,
        'created_at',
        v_maintenance.created_at,
        'updated_at',
        v_maintenance.updated_at
      )
    );

  elsif
    p_workspace_type = 'manager'
    and p_entity_type =
      'manager_property'
    and p_operation = 'update'
  then
    select *
    into v_property
    from public.manager_properties
    where
      id = p_entity_id
      and organization_id =
        p_workspace_id
      and status <> 'archived'
    for update;

    if not found then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RECORD_NOT_FOUND',
        'message',
        'This property no longer exists.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    v_current_revision :=
      floor(
        extract(
          epoch from
            v_property.updated_at
        ) * 1000
      )::bigint;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_property',
      'entityId',
      v_property.id,
      'serverRevision',
      v_current_revision,
      'updatedAt',
      v_property.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_property.id,
        'landlord_client_id',
        v_property.landlord_client_id,
        'property_name',
        v_property.property_name,
        'property_address',
        v_property.property_address,
        'city',
        v_property.city,
        'state',
        v_property.state,
        'lga',
        v_property.lga,
        'status',
        v_property.status,
        'existing_tenant_setup_required',
        v_property.existing_tenant_setup_required,
        'notes',
        v_property.notes,
        'created_at',
        v_property.created_at,
        'updated_at',
        v_property.updated_at
      )
    );

    if
      p_base_revision is null
      or p_base_revision <>
        v_current_revision
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'conflict',
        'code',
        'OFFLINE_CONFLICT',
        'message',
        'This property changed on another device.',
        'serverEntity',
        v_entity
      );

      update public.offline_mutation_receipts
      set
        status = 'conflict',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    update public.manager_properties
    set
      property_name =
        trim(
          p_payload ->> 'propertyName'
        ),
      property_address =
        trim(
          p_payload ->>
            'propertyAddress'
        ),
      city =
        nullif(
          trim(
            coalesce(
              p_payload ->> 'city',
              ''
            )
          ),
          ''
        ),
      notes =
        nullif(
          trim(
            coalesce(
              p_payload ->> 'notes',
              ''
            )
          ),
          ''
        ),
      updated_at = now()
    where id = p_entity_id
    returning *
    into v_property;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_property',
      'entityId',
      v_property.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_property.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_property.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_property.id,
        'landlord_client_id',
        v_property.landlord_client_id,
        'property_name',
        v_property.property_name,
        'property_address',
        v_property.property_address,
        'city',
        v_property.city,
        'state',
        v_property.state,
        'lga',
        v_property.lga,
        'status',
        v_property.status,
        'existing_tenant_setup_required',
        v_property.existing_tenant_setup_required,
        'notes',
        v_property.notes,
        'created_at',
        v_property.created_at,
        'updated_at',
        v_property.updated_at
      )
    );
  elsif
    p_workspace_type = 'manager'
    and p_entity_type =
      'manager_tenant'
    and p_operation = 'update'
  then
    select *
    into v_tenant
    from public.manager_tenants
    where
      id = p_entity_id
      and organization_id =
        p_workspace_id
      and status in (
        'active',
        'eviction_notice'
      )
    for update;

    if not found then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RECORD_NOT_FOUND',
        'message',
        'This tenant is no longer current.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    v_current_revision :=
      floor(
        extract(
          epoch from
            v_tenant.updated_at
        ) * 1000
      )::bigint;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_tenant',
      'entityId',
      v_tenant.id,
      'serverRevision',
      v_current_revision,
      'updatedAt',
      v_tenant.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_tenant.id,
        'property_id',
        v_tenant.property_id,
        'unit_id',
        v_tenant.unit_id,
        'full_name',
        v_tenant.full_name,
        'phone_number',
        v_tenant.phone_number,
        'email',
        v_tenant.email,
        'occupation',
        v_tenant.occupation,
        'rent_amount',
        v_tenant.rent_amount,
        'current_balance',
        v_tenant.current_balance,
        'move_in_date',
        v_tenant.move_in_date,
        'next_rent_due_date',
        v_tenant.next_rent_due_date,
        'move_out_date',
        v_tenant.move_out_date,
        'status',
        v_tenant.status,
        'notes',
        v_tenant.notes,
        'created_at',
        v_tenant.created_at,
        'updated_at',
        v_tenant.updated_at
      )
    );

    if
      p_base_revision is null
      or p_base_revision <>
        v_current_revision
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'conflict',
        'code',
        'OFFLINE_CONFLICT',
        'message',
        'This tenant record changed on another device.',
        'serverEntity',
        v_entity
      );

      update public.offline_mutation_receipts
      set
        status = 'conflict',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    update public.manager_tenants
    set
      full_name =
        trim(
          p_payload ->> 'fullName'
        ),
      phone_number =
        trim(
          p_payload ->> 'phoneNumber'
        ),
      email =
        nullif(
          lower(
            trim(
              coalesce(
                p_payload ->> 'email',
                ''
              )
            )
          ),
          ''
        ),
      occupation =
        nullif(
          trim(
            coalesce(
              p_payload ->>
                'occupation',
              ''
            )
          ),
          ''
        ),
      notes =
        nullif(
          trim(
            coalesce(
              p_payload ->> 'notes',
              ''
            )
          ),
          ''
        ),
      updated_at = now()
    where id = p_entity_id
    returning *
    into v_tenant;

    v_entity := jsonb_build_object(
      'entityType',
      'manager_tenant',
      'entityId',
      v_tenant.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_tenant.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_tenant.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_tenant.id,
        'property_id',
        v_tenant.property_id,
        'unit_id',
        v_tenant.unit_id,
        'full_name',
        v_tenant.full_name,
        'phone_number',
        v_tenant.phone_number,
        'email',
        v_tenant.email,
        'occupation',
        v_tenant.occupation,
        'rent_amount',
        v_tenant.rent_amount,
        'current_balance',
        v_tenant.current_balance,
        'move_in_date',
        v_tenant.move_in_date,
        'next_rent_due_date',
        v_tenant.next_rent_due_date,
        'move_out_date',
        v_tenant.move_out_date,
        'status',
        v_tenant.status,
        'notes',
        v_tenant.notes,
        'created_at',
        v_tenant.created_at,
        'updated_at',
        v_tenant.updated_at
      )
    );

  elsif
    p_workspace_type = 'developer'
    and p_entity_type =
      'developer_estate'
    and p_operation = 'update'
  then
    select *
    into v_estate
    from public.developer_estates
    where
      id = p_entity_id
      and developer_account_id =
        p_workspace_id
      and status <> 'archived'
    for update;

    if not found then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RECORD_NOT_FOUND',
        'message',
        'This estate no longer exists.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    v_current_revision :=
      floor(
        extract(
          epoch from
            v_estate.updated_at
        ) * 1000
      )::bigint;

    v_entity := jsonb_build_object(
      'entityType',
      'developer_estate',
      'entityId',
      v_estate.id,
      'serverRevision',
      v_current_revision,
      'updatedAt',
      v_estate.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_estate.id,
        'estate_name',
        v_estate.estate_name,
        'location',
        v_estate.location,
        'city',
        v_estate.city,
        'state',
        v_estate.state,
        'lga',
        v_estate.lga,
        'status',
        v_estate.status,
        'description',
        v_estate.description,
        'initial_payment_percentage',
        v_estate.initial_payment_percentage,
        'balance_spread_months',
        v_estate.balance_spread_months,
        'land_size_value',
        v_estate.land_size_value,
        'land_size_unit',
        v_estate.land_size_unit,
        'default_plot_size_sqm',
        v_estate.default_plot_size_sqm,
        'planned_plot_count',
        v_estate.planned_plot_count,
        'created_at',
        v_estate.created_at,
        'updated_at',
        v_estate.updated_at
      )
    );

    if
      p_base_revision is null
      or p_base_revision <>
        v_current_revision
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'conflict',
        'code',
        'OFFLINE_CONFLICT',
        'message',
        'This estate changed on another device.',
        'serverEntity',
        v_entity
      );

      update public.offline_mutation_receipts
      set
        status = 'conflict',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    update public.developer_estates
    set
      estate_name =
        trim(
          p_payload ->> 'estateName'
        ),
      location =
        trim(
          p_payload ->> 'location'
        ),
      city =
        nullif(
          trim(
            coalesce(
              p_payload ->> 'city',
              ''
            )
          ),
          ''
        ),
      description =
        nullif(
          trim(
            coalesce(
              p_payload ->>
                'description',
              ''
            )
          ),
          ''
        ),
      updated_at = now()
    where id = p_entity_id
    returning *
    into v_estate;

    v_entity := jsonb_build_object(
      'entityType',
      'developer_estate',
      'entityId',
      v_estate.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_estate.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_estate.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_estate.id,
        'estate_name',
        v_estate.estate_name,
        'location',
        v_estate.location,
        'city',
        v_estate.city,
        'state',
        v_estate.state,
        'lga',
        v_estate.lga,
        'status',
        v_estate.status,
        'description',
        v_estate.description,
        'initial_payment_percentage',
        v_estate.initial_payment_percentage,
        'balance_spread_months',
        v_estate.balance_spread_months,
        'land_size_value',
        v_estate.land_size_value,
        'land_size_unit',
        v_estate.land_size_unit,
        'default_plot_size_sqm',
        v_estate.default_plot_size_sqm,
        'planned_plot_count',
        v_estate.planned_plot_count,
        'created_at',
        v_estate.created_at,
        'updated_at',
        v_estate.updated_at
      )
    );
  elsif
    p_workspace_type = 'developer'
    and p_entity_type =
      'developer_buyer'
    and p_operation = 'update'
  then
    select *
    into v_buyer
    from public.developer_buyers
    where
      id = p_entity_id
      and developer_account_id =
        p_workspace_id
      and status <> 'cancelled'
    for update;

    if not found then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'rejected',
        'code',
        'OFFLINE_RECORD_NOT_FOUND',
        'message',
        'This buyer record no longer exists.'
      );

      update public.offline_mutation_receipts
      set
        status = 'rejected',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    v_current_revision :=
      floor(
        extract(
          epoch from
            v_buyer.updated_at
        ) * 1000
      )::bigint;

    v_entity := jsonb_build_object(
      'entityType',
      'developer_buyer',
      'entityId',
      v_buyer.id,
      'serverRevision',
      v_current_revision,
      'updatedAt',
      v_buyer.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_buyer.id,
        'full_name',
        v_buyer.full_name,
        'phone_number',
        v_buyer.phone_number,
        'email',
        v_buyer.email,
        'status',
        v_buyer.status,
        'created_at',
        v_buyer.created_at,
        'updated_at',
        v_buyer.updated_at
      )
    );

    if
      p_base_revision is null
      or p_base_revision <>
        v_current_revision
    then
      v_result := jsonb_build_object(
        'clientMutationId',
        p_client_mutation_id,
        'status',
        'conflict',
        'code',
        'OFFLINE_CONFLICT',
        'message',
        'This buyer record changed on another device.',
        'serverEntity',
        v_entity
      );

      update public.offline_mutation_receipts
      set
        status = 'conflict',
        result = v_result,
        updated_at = now()
      where id = v_receipt_id;

      return v_result;
    end if;

    update public.developer_buyers
    set
      full_name =
        trim(
          p_payload ->> 'fullName'
        ),
      phone_number =
        trim(
          p_payload ->> 'phoneNumber'
        ),
      email =
        nullif(
          lower(
            trim(
              coalesce(
                p_payload ->> 'email',
                ''
              )
            )
          ),
          ''
        ),
      updated_at = now()
    where id = p_entity_id
    returning *
    into v_buyer;

    v_entity := jsonb_build_object(
      'entityType',
      'developer_buyer',
      'entityId',
      v_buyer.id,
      'serverRevision',
      floor(
        extract(
          epoch from
            v_buyer.updated_at
        ) * 1000
      )::bigint,
      'updatedAt',
      v_buyer.updated_at,
      'deletedAt',
      null,
      'data',
      jsonb_build_object(
        'id',
        v_buyer.id,
        'full_name',
        v_buyer.full_name,
        'phone_number',
        v_buyer.phone_number,
        'email',
        v_buyer.email,
        'status',
        v_buyer.status,
        'created_at',
        v_buyer.created_at,
        'updated_at',
        v_buyer.updated_at
      )
    );
  else
    v_result := jsonb_build_object(
      'clientMutationId',
      p_client_mutation_id,
      'status',
      'rejected',
      'code',
      'OFFLINE_OPERATION_NOT_ALLOWED',
      'message',
      'This action cannot be completed offline.'
    );

    update public.offline_mutation_receipts
    set
      status = 'rejected',
      result = v_result,
      updated_at = now()
    where id = v_receipt_id;

    return v_result;
  end if;

  v_result := jsonb_build_object(
    'clientMutationId',
    p_client_mutation_id,
    'status',
    'applied',
    'entity',
    v_entity
  );

  update public.offline_mutation_receipts
  set
    status = 'completed',
    result = v_result,
    updated_at = now()
  where id = v_receipt_id;

  return v_result;
end;
$$;

revoke all
on function
  public.apply_offline_safe_mutation(
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

grant execute
on function
  public.apply_offline_safe_mutation(
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
to service_role;

commit;
