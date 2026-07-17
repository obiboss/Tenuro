begin;

create unique index if not exists
  manager_statement_documents_share_scope_uidx
  on public.manager_statement_documents (
    id,
    organization_id,
    landlord_client_id
  );

create table if not exists public.manager_document_share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  landlord_client_id uuid not null,
  statement_document_id uuid not null,
  token_hash text not null unique,
  status text not null default 'active',
  expires_at timestamptz not null,
  max_access_count integer not null default 100,
  access_count integer not null default 0,
  first_accessed_at timestamptz,
  last_accessed_at timestamptz,
  revoked_at timestamptz,
  created_by_profile_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manager_document_share_links_document_scope_fk
    foreign key (
      statement_document_id,
      organization_id,
      landlord_client_id
    )
    references public.manager_statement_documents (
      id,
      organization_id,
      landlord_client_id
    )
    on delete cascade,

  constraint manager_document_share_links_profile_fk
    foreign key (created_by_profile_id)
    references public.profiles (id)
    on delete set null,

  constraint manager_document_share_links_status_check
    check (status in ('active', 'revoked', 'expired')),

  constraint manager_document_share_links_token_hash_check
    check (token_hash ~ '^[a-f0-9]{64}$'),

  constraint manager_document_share_links_expiry_check
    check (expires_at > created_at),

  constraint manager_document_share_links_access_count_check
    check (
      access_count >= 0
      and max_access_count between 1 and 500
      and access_count <= max_access_count
    ),

  constraint manager_document_share_links_revoked_check
    check (
      (
        status = 'revoked'
        and revoked_at is not null
      )
      or
      (
        status <> 'revoked'
        and revoked_at is null
      )
    )
);

create unique index if not exists
  manager_document_share_links_active_document_uidx
  on public.manager_document_share_links (
    statement_document_id
  )
  where status = 'active';

create index if not exists
  manager_document_share_links_org_created_idx
  on public.manager_document_share_links (
    organization_id,
    created_at desc
  );

create index if not exists
  manager_document_share_links_expiry_idx
  on public.manager_document_share_links (
    status,
    expires_at
  )
  where status = 'active';

drop trigger if exists
  trg_manager_document_share_links_updated_at
  on public.manager_document_share_links;

create trigger trg_manager_document_share_links_updated_at
  before update on public.manager_document_share_links
  for each row execute function public.set_updated_at();

alter table public.manager_document_share_links
  enable row level security;

drop policy if exists
  "manager_document_share_links_org_owner_select"
  on public.manager_document_share_links;

create policy "manager_document_share_links_org_owner_select"
  on public.manager_document_share_links
  for select
  to authenticated
  using (
    public.manager_organization_is_owned(organization_id)
  );

drop policy if exists
  "manager_document_share_links_service_role_all"
  on public.manager_document_share_links;

create policy "manager_document_share_links_service_role_all"
  on public.manager_document_share_links
  for all
  to service_role
  using (true)
  with check (true);

revoke all
  on public.manager_document_share_links
  from anon;

revoke insert, update, delete
  on public.manager_document_share_links
  from authenticated;

grant select
  on public.manager_document_share_links
  to authenticated;

grant all
  on public.manager_document_share_links
  to service_role;

create or replace function
  public.create_manager_statement_document_share_link(
    p_organization_id uuid,
    p_landlord_client_id uuid,
    p_statement_document_id uuid,
    p_token_hash text,
    p_expires_at timestamptz,
    p_created_by_profile_id uuid,
    p_max_access_count integer default 100,
    p_metadata jsonb default '{}'::jsonb
  )
returns setof public.manager_document_share_links
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expires_at <= now() then
    raise exception 'Share expiry must be in the future.';
  end if;

  if p_max_access_count < 1 or p_max_access_count > 500 then
    raise exception 'Invalid maximum access count.';
  end if;

  if not exists (
    select 1
    from public.manager_statement_documents document
    where document.id = p_statement_document_id
      and document.organization_id = p_organization_id
      and document.landlord_client_id = p_landlord_client_id
  ) then
    raise exception 'Statement document not found.';
  end if;

  update public.manager_document_share_links
  set
    status = 'revoked',
    revoked_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'revoked_reason',
        'replaced_by_new_share_link'
      )
  where statement_document_id = p_statement_document_id
    and status = 'active';

  return query
  insert into public.manager_document_share_links (
    organization_id,
    landlord_client_id,
    statement_document_id,
    token_hash,
    status,
    expires_at,
    max_access_count,
    access_count,
    created_by_profile_id,
    metadata
  )
  values (
    p_organization_id,
    p_landlord_client_id,
    p_statement_document_id,
    p_token_hash,
    'active',
    p_expires_at,
    p_max_access_count,
    0,
    p_created_by_profile_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *;
end;
$$;

create or replace function
  public.consume_manager_statement_document_share_link(
    p_token_hash text
  )
returns setof public.manager_document_share_links
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.manager_document_share_links
  set status = 'expired'
  where token_hash = p_token_hash
    and status = 'active'
    and (
      expires_at <= now()
      or access_count >= max_access_count
    );

  return query
  update public.manager_document_share_links
  set
    access_count = access_count + 1,
    first_accessed_at = coalesce(
      first_accessed_at,
      now()
    ),
    last_accessed_at = now()
  where token_hash = p_token_hash
    and status = 'active'
    and expires_at > now()
    and access_count < max_access_count
  returning *;
end;
$$;

revoke all
  on function
    public.create_manager_statement_document_share_link(
      uuid,
      uuid,
      uuid,
      text,
      timestamptz,
      uuid,
      integer,
      jsonb
    )
  from public,
       anon,
       authenticated;

grant execute
  on function
    public.create_manager_statement_document_share_link(
      uuid,
      uuid,
      uuid,
      text,
      timestamptz,
      uuid,
      integer,
      jsonb
    )
  to service_role;

revoke all
  on function
    public.consume_manager_statement_document_share_link(text)
  from public,
       anon,
       authenticated;

grant execute
  on function
    public.consume_manager_statement_document_share_link(text)
  to service_role;

commit;
