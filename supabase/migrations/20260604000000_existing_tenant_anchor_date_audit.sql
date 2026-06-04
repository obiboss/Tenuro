create table if not exists public.anchor_date_audit (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete cascade,
  old_date date not null,
  new_date date not null,
  changed_by uuid not null references public.profiles (id),
  changed_at timestamptz not null default now(),
  reason text
);

create index if not exists anchor_date_audit_tenancy_id_idx
  on public.anchor_date_audit (tenancy_id, changed_at desc);
