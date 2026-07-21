-- The offline read snapshot includes this property setup state. Older BOPA
-- databases that predate the manager onboarding update do not have these
-- columns, which makes GET /api/offline/read fail with a 500 on a full sync.
--
-- This migration is safe to apply to databases where the onboarding migration
-- has already been run.

alter table if exists public.manager_properties
  add column if not exists existing_tenant_setup_required boolean not null default false,
  add column if not exists existing_tenant_setup_completed_at timestamptz,
  add column if not exists existing_tenant_setup_completed_by_profile_id uuid
    references public.profiles(id) on delete set null;
