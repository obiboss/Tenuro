-- Track when a tenancy becomes operationally live after agreement acceptance.
-- Agreement setup phase uses agreement_live_at IS NULL instead of enum draft values.

alter table if exists public.tenancies
  add column if not exists agreement_live_at timestamptz;

create index if not exists tenancies_agreement_live_at_idx
  on public.tenancies (agreement_live_at)
  where agreement_live_at is not null;

create index if not exists tenancies_setup_pipeline_idx
  on public.tenancies (landlord_id, tenant_id)
  where agreement_live_at is null
    and deleted_at is null;

-- Backfill existing operational tenancies without assuming enum extensions.
update public.tenancies t
set agreement_live_at = coalesce(
  (
    select tad.tenant_accepted_at
    from public.tenancy_agreement_documents tad
    where tad.tenancy_id = t.id
      and tad.document_status = 'accepted'
    order by tad.created_at desc
    limit 1
  ),
  t.created_at
)
where t.agreement_live_at is null
  and t.tenancy_status = 'active'
  and t.deleted_at is null;
