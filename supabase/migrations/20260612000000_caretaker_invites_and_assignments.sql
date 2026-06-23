-- Caretaker invites + align caretaker_assignments with permissions/revoked_at model.

alter type public.user_role add value if not exists 'caretaker';

alter table public.caretaker_assignments
  add column if not exists permissions jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'caretaker_assignments'
      and column_name = 'is_active'
  ) then
    update public.caretaker_assignments
    set revoked_at = coalesce(revoked_at, now())
    where is_active = false
      and revoked_at is null;

    alter table public.caretaker_assignments
      drop column is_active;
  end if;
end $$;

alter table public.caretaker_assignments
  drop column if exists assigned_at,
  drop column if exists metadata,
  drop column if exists updated_at;

drop trigger if exists trg_caretaker_assignments_updated_at on public.caretaker_assignments;

create or replace function public.caretaker_has_property_access(p_property_id uuid)
returns boolean language sql stable
set search_path to 'public'
as $$
  select exists (
    select 1 from public.caretaker_assignments
    where caretaker_profile_id = auth.uid()
      and property_id = p_property_id
      and revoked_at is null
  )
$$;

create table if not exists public.caretaker_invites (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.profiles(id) on delete cascade,
  caretaker_name text not null,
  caretaker_phone text not null,
  property_ids uuid[] not null,
  permissions jsonb not null default '{}'::jsonb,
  token text not null unique,
  note text,
  expires_at timestamptz not null,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint caretaker_invites_property_ids_not_empty
    check (cardinality(property_ids) > 0)
);

create index if not exists caretaker_invites_landlord_idx
  on public.caretaker_invites (landlord_id);

create index if not exists caretaker_invites_token_idx
  on public.caretaker_invites (token);

alter table public.caretaker_invites enable row level security;

drop policy if exists "caretaker_invites_landlord_all" on public.caretaker_invites;
create policy "caretaker_invites_landlord_all" on public.caretaker_invites
  for all to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

grant select, insert, update on public.caretaker_invites to authenticated;
grant all on public.caretaker_invites to service_role;
