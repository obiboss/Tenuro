begin;

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_type text not null
    check (workspace_type in ('manager', 'developer')),
  full_name text not null
    check (char_length(full_name) between 2 and 120),
  company_name text not null
    check (char_length(company_name) between 2 and 160),
  work_email text not null
    check (char_length(work_email) between 5 and 254),
  phone_number text not null
    check (phone_number ~ '^\+234[789][01][0-9]{8}$'),
  preferred_date date not null,
  preferred_time_window text not null
    check (
      preferred_time_window in (
        'morning',
        'afternoon',
        'evening'
      )
    ),
  message text,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'contacted',
        'scheduled',
        'completed',
        'cancelled'
      )
    ),
  source_path text not null default '/contact',
  request_fingerprint_hash text not null
    check (length(request_fingerprint_hash) = 64),
  notification_status text not null default 'pending'
    check (
      notification_status in (
        'pending',
        'sent',
        'failed',
        'not_configured'
      )
    ),
  notification_provider_id text,
  notification_error text,
  contacted_at timestamptz,
  scheduled_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_requests_queue_idx
on public.demo_requests (status, created_at desc);

create index if not exists demo_requests_workspace_idx
on public.demo_requests (workspace_type, created_at desc);

create index if not exists demo_requests_phone_recent_idx
on public.demo_requests (phone_number, created_at desc);

create index if not exists demo_requests_email_recent_idx
on public.demo_requests (work_email, created_at desc);

create index if not exists demo_requests_fingerprint_recent_idx
on public.demo_requests (request_fingerprint_hash, created_at desc);

create or replace function public.set_demo_request_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists demo_requests_set_updated_at
on public.demo_requests;

create trigger demo_requests_set_updated_at
before update on public.demo_requests
for each row
execute function public.set_demo_request_updated_at();

alter table public.demo_requests enable row level security;
alter table public.demo_requests force row level security;

revoke all on table public.demo_requests from anon, authenticated;
revoke all on function public.set_demo_request_updated_at()
from public, anon, authenticated;

comment on table public.demo_requests is
  'Public Manager and Developer demo requests. Access is restricted to server-side service-role operations.';

commit;
