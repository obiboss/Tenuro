-- subscriptions.cancellation_reason exists in baseline schema but may be absent
-- on databases created before that column was added (create table if not exists
-- does not backfill new columns onto existing tables).

alter table public.subscriptions
  add column if not exists cancellation_reason text;
