begin;

create index if not exists
  offline_mutation_receipts_retention_idx
on public.offline_mutation_receipts (
  status,
  updated_at
);

create or replace function
  public.prune_offline_mutation_receipts(
    p_batch_size integer default 250
  )
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
  v_batch_size integer;
begin
  v_batch_size :=
    greatest(
      1,
      least(
        coalesce(p_batch_size, 250),
        1000
      )
    );

  with candidates as (
    select id
    from public.offline_mutation_receipts
    where
      (
        status = 'completed'
        and updated_at <
          now() - interval '90 days'
      )
      or
      (
        status in (
          'conflict',
          'rejected'
        )
        and updated_at <
          now() - interval '180 days'
      )
      or
      (
        status = 'processing'
        and updated_at <
          now() - interval '24 hours'
      )
    order by updated_at asc
    limit v_batch_size
    for update skip locked
  )
  delete from
    public.offline_mutation_receipts
  where
    id in (
      select id
      from candidates
    );

  get diagnostics
    v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all
on function
  public.prune_offline_mutation_receipts(
    integer
  )
from public, anon, authenticated;

grant execute
on function
  public.prune_offline_mutation_receipts(
    integer
  )
to service_role;

commit;
