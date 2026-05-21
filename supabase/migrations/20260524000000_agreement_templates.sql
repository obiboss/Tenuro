-- Batch 3: Reusable landlord agreement templates
-- Production-safe migration for Tenuro

create table if not exists public.agreement_templates (
  id uuid primary key default gen_random_uuid(),

  landlord_id uuid not null
    references public.profiles(id)
    on delete cascade,

  property_id uuid
    references public.properties(id)
    on delete cascade,

  name text not null default 'Default tenancy agreement',

  template_body text not null default '',

  is_default boolean not null default false,
  is_active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists agreement_templates_landlord_idx
  on public.agreement_templates (landlord_id)
  where deleted_at is null;

create index if not exists agreement_templates_property_idx
  on public.agreement_templates (property_id)
  where property_id is not null
    and deleted_at is null;

create unique index if not exists agreement_templates_landlord_default_uidx
  on public.agreement_templates (landlord_id)
  where property_id is null
    and is_default = true
    and is_active = true
    and deleted_at is null;

create unique index if not exists agreement_templates_property_default_uidx
  on public.agreement_templates (property_id)
  where property_id is not null
    and is_default = true
    and is_active = true
    and deleted_at is null;

-- =====================================================
-- TENANCY AGREEMENT LINKAGE
-- =====================================================

alter table if exists public.tenancy_agreement_documents
  add column if not exists agreement_template_id uuid
    references public.agreement_templates(id)
    on delete set null;

create index if not exists tenancy_agreement_documents_template_idx
  on public.tenancy_agreement_documents (agreement_template_id)
  where agreement_template_id is not null;

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

create or replace function public.set_agreement_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agreement_templates_updated_at
on public.agreement_templates;

create trigger trg_agreement_templates_updated_at
  before update on public.agreement_templates
  for each row
  execute function public.set_agreement_templates_updated_at();

-- =====================================================
-- RLS
-- =====================================================

alter table public.agreement_templates
  enable row level security;

grant all on public.agreement_templates to authenticated;

-- =====================================================
-- LANDLORD ACCESS POLICY
-- =====================================================

drop policy if exists "agreement_templates_landlord_all"
on public.agreement_templates;

create policy "agreement_templates_landlord_all"
on public.agreement_templates
for all
to authenticated
using (
  landlord_id = auth.uid()
)
with check (
  landlord_id = auth.uid()
);

-- =====================================================
-- PLATFORM ADMIN READ ACCESS
-- =====================================================

drop policy if exists "agreement_templates_platform_admin_read"
on public.agreement_templates;

create policy "agreement_templates_platform_admin_read"
on public.agreement_templates
for select
to authenticated
using (
  public.is_platform_admin()
);
