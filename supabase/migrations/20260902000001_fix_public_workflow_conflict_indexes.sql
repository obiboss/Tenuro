begin;

drop index if exists public.receipt_usage_events_workflow_key_uidx;
drop index if exists public.agreement_usage_events_workflow_key_uidx;

create unique index receipt_usage_events_workflow_key_uidx
  on public.receipt_usage_events (workflow_key);
create unique index agreement_usage_events_workflow_key_uidx
  on public.agreement_usage_events (workflow_key);

commit;