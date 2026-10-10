begin;

alter table public.public_generated_receipts
  add column if not exists generation_completed_at timestamptz;

alter table public.public_generated_agreements
  add column if not exists generation_completed_at timestamptz;

update public.public_generated_receipts receipt
set generation_completed_at = completed.completed_at
from (
  select receipt_id, min(created_at) as completed_at
  from public.receipt_usage_events
  where receipt_id is not null
  group by receipt_id
) completed
where receipt.id = completed.receipt_id
  and receipt.generation_completed_at is null;

update public.public_generated_agreements agreement
set generation_completed_at = completed.completed_at
from (
  select agreement_id, min(created_at) as completed_at
  from public.agreement_usage_events
  where agreement_id is not null
  group by agreement_id
) completed
where agreement.id = completed.agreement_id
  and agreement.generation_completed_at is null;

create or replace function public.mark_public_receipt_generation_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.receipt_id is not null then
    update public.public_generated_receipts
    set generation_completed_at = coalesce(generation_completed_at, new.created_at)
    where id = new.receipt_id;
  end if;

  return new;
end;
$$;

create or replace function public.mark_public_agreement_generation_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.agreement_id is not null then
    update public.public_generated_agreements
    set generation_completed_at = coalesce(generation_completed_at, new.created_at)
    where id = new.agreement_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_public_receipt_generation_completed
  on public.receipt_usage_events;
create trigger trg_public_receipt_generation_completed
after insert or update of receipt_id on public.receipt_usage_events
for each row execute function public.mark_public_receipt_generation_completed();

drop trigger if exists trg_public_agreement_generation_completed
  on public.agreement_usage_events;
create trigger trg_public_agreement_generation_completed
after insert or update of agreement_id on public.agreement_usage_events
for each row execute function public.mark_public_agreement_generation_completed();

create index if not exists public_generated_receipts_completed_at_idx
  on public.public_generated_receipts (generation_completed_at desc)
  where generation_completed_at is not null;

create index if not exists public_generated_agreements_completed_at_idx
  on public.public_generated_agreements (generation_completed_at desc)
  where generation_completed_at is not null;

create index if not exists public_document_payments_created_at_idx
  on public.public_document_payments (created_at desc);

create or replace function public.get_platform_admin_free_tools(
  p_period_days integer,
  p_product text,
  p_page integer default 1,
  p_page_size integer default 10,
  p_search text default null,
  p_excluded_fingerprints text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_period_start timestamptz;
  v_previous_start timestamptz;
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 10), 1), 100);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_search_pattern text;
  v_excluded_fingerprints text[] := coalesce(
    p_excluded_fingerprints,
    '{}'::text[]
  );
  v_result jsonb;
begin
  if p_period_days is null then
    raise exception 'Free-tools period is required';
  end if;

  if p_product is null then
    raise exception 'Free-tools product is required';
  end if;

  if p_period_days not in (7, 30, 60, 90) then
    raise exception 'Unsupported free-tools period';
  end if;

  if p_product not in ('receipt', 'tenancy_agreement', 'both') then
    raise exception 'Unsupported free-tools product';
  end if;

  if v_search is not null then
    v_search_pattern := '%'
      || replace(
        replace(
          replace(v_search, E'\\', E'\\\\'),
          '%',
          E'\\%'
        ),
        '_',
        E'\\_'
      )
      || '%';
  end if;

  v_period_start := v_now - make_interval(days => p_period_days);
  v_previous_start := v_now - make_interval(days => p_period_days * 2);

  with
  receipt_documents_unfiltered as (
    select
      encode(
        digest(
          lower(regexp_replace(btrim(receipt.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31)
          || regexp_replace(receipt.landlord_phone_number, '\D', '', 'g')
          || chr(31)
          || lower(regexp_replace(btrim(receipt.property_address), '\s+', ' ', 'g')),
          'sha256'
        ),
        'hex'
      ) as identity_fingerprint,
      'receipt'::text as product_type,
      receipt.landlord_full_name,
      receipt.generation_completed_at as completed_at
    from public.public_generated_receipts receipt
    where p_product in ('receipt', 'both')
      and receipt.generation_completed_at >= v_previous_start
      and receipt.generation_completed_at < v_now
  ),
  agreement_documents_unfiltered as (
    select
      encode(
        digest(
          lower(regexp_replace(btrim(agreement.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31)
          || regexp_replace(agreement.landlord_phone_number, '\D', '', 'g')
          || chr(31)
          || lower(regexp_replace(btrim(agreement.property_address), '\s+', ' ', 'g')),
          'sha256'
        ),
        'hex'
      ) as identity_fingerprint,
      'tenancy_agreement'::text as product_type,
      agreement.landlord_full_name,
      agreement.generation_completed_at as completed_at
    from public.public_generated_agreements agreement
    where p_product in ('tenancy_agreement', 'both')
      and agreement.generation_completed_at >= v_previous_start
      and agreement.generation_completed_at < v_now
  ),
  all_documents as (
    select *
    from receipt_documents_unfiltered
    where not (identity_fingerprint = any(v_excluded_fingerprints))

    union all

    select *
    from agreement_documents_unfiltered
    where not (identity_fingerprint = any(v_excluded_fingerprints))
  ),
  current_documents as (
    select *
    from all_documents
    where completed_at >= v_period_start
      and completed_at < v_now
  ),
  previous_documents as (
    select *
    from all_documents
    where completed_at >= v_previous_start
      and completed_at < v_period_start
  ),
  current_document_summary as (
    select
      count(distinct identity_fingerprint)::integer as unique_users,
      count(*)::integer as documents_generated,
      count(*) filter (
        where product_type = 'receipt'
      )::integer as receipts_generated,
      count(*) filter (
        where product_type = 'tenancy_agreement'
      )::integer as agreements_generated
    from current_documents
  ),
  previous_document_summary as (
    select
      count(distinct identity_fingerprint)::integer as unique_users,
      count(*)::integer as documents_generated
    from previous_documents
  ),
  returning_users as (
    select count(*)::integer as returning_count
    from (
      select identity_fingerprint
      from current_documents
      group by identity_fingerprint
      having count(
        distinct (completed_at at time zone 'Africa/Lagos')::date
      ) >= 2
    ) users
  ),
  current_payments as (
    select payment.*
    from public.public_document_payments payment
    where payment.created_at >= v_period_start
      and payment.created_at < v_now
      and (p_product = 'both' or payment.product_type = p_product)
      and not (
        payment.identity_fingerprint = any(v_excluded_fingerprints)
      )
  ),
  previous_payments as (
    select payment.*
    from public.public_document_payments payment
    where payment.created_at >= v_previous_start
      and payment.created_at < v_period_start
      and (p_product = 'both' or payment.product_type = p_product)
      and not (
        payment.identity_fingerprint = any(v_excluded_fingerprints)
      )
  ),
  current_payment_summary as (
    select
      count(distinct identity_fingerprint)::integer as paid_users,
      coalesce(sum(amount_kobo), 0)::bigint as revenue_kobo
    from current_payments
  ),
  previous_payment_summary as (
    select
      count(distinct identity_fingerprint)::integer as paid_users,
      coalesce(sum(amount_kobo), 0)::bigint as revenue_kobo
    from previous_payments
  ),
  active_identity_products as (
    select distinct identity_fingerprint, product_type
    from current_documents
  ),
  active_entitlements as (
    select entitlement.*
    from active_identity_products active
    join public.public_document_entitlements entitlement
      on entitlement.identity_fingerprint = active.identity_fingerprint
     and entitlement.product_type = active.product_type
  ),
  conversion_summary as (
    select
      count(*) filter (
        where free_allowance > 0
          and free_used >= free_allowance
      )::integer as used_all_free,
      count(*) filter (
        where free_allowance > 0
          and free_used >= free_allowance
          and total_paid_purchased > 0
      )::integer as went_on_to_pay,
      count(*) filter (
        where free_allowance > 0
          and free_used >= free_allowance
          and total_paid_purchased = 0
      )::integer as still_unpaid,
      count(*) filter (
        where product_type = 'receipt'
          and free_allowance > 0
          and free_used >= free_allowance
      )::integer as receipts_used_all_free,
      count(*) filter (
        where product_type = 'tenancy_agreement'
          and free_allowance > 0
          and free_used >= free_allowance
      )::integer as agreements_used_all_free,
      count(*) filter (
        where total_paid_purchased > 0
          and free_used < free_allowance
      )::integer as paid_before_free_exhausted
    from active_entitlements
  ),
  current_user_documents as (
    select
      identity_fingerprint,
      count(*)::integer as documents_generated,
      max(completed_at) as last_active,
      (array_agg(
        landlord_full_name
        order by completed_at desc
      ))[1] as landlord_name
    from current_documents
    group by identity_fingerprint
  ),
  selected_entitlements as (
    select
      identity_fingerprint,
      sum(free_used)::integer as free_used,
      sum(free_allowance)::integer as free_allowance,
      sum(paid_remaining)::integer as paid_remaining
    from public.public_document_entitlements
    where p_product = 'both' or product_type = p_product
    group by identity_fingerprint
  ),
  filtered_users as (
    select
      users.identity_fingerprint,
      users.landlord_name,
      users.documents_generated,
      coalesce(entitlements.free_used, 0)::integer as free_used,
      coalesce(entitlements.free_allowance, 0)::integer as free_allowance,
      coalesce(entitlements.paid_remaining, 0)::integer as paid_remaining,
      users.last_active
    from current_user_documents users
    left join selected_entitlements entitlements
      on entitlements.identity_fingerprint = users.identity_fingerprint
    where v_search_pattern is null
       or users.landlord_name ilike v_search_pattern escape E'\\'
  ),
  ranked_users as (
    select
      filtered_users.*,
      row_number() over (
        order by
          documents_generated desc,
          last_active desc,
          landlord_name asc
      ) as row_position
    from filtered_users
  ),
  paged_users as (
    select *
    from ranked_users
    where row_position > ((v_page - 1) * v_page_size)
      and row_position <= (v_page * v_page_size)
    order by row_position
  )
  select jsonb_build_object(
    'period_days', p_period_days,
    'product', p_product,
    'period_start', v_period_start,
    'period_end', v_now,
    'kpis', jsonb_build_object(
      'unique_users', jsonb_build_object(
        'current', current_docs.unique_users,
        'previous', previous_docs.unique_users,
        'returning', returning_summary.returning_count
      ),
      'documents_generated', jsonb_build_object(
        'current', current_docs.documents_generated,
        'previous', previous_docs.documents_generated,
        'receipts', current_docs.receipts_generated,
        'agreements', current_docs.agreements_generated
      ),
      'paid_users', jsonb_build_object(
        'current', current_payment.paid_users,
        'previous', previous_payment.paid_users
      ),
      'revenue', jsonb_build_object(
        'current_kobo', current_payment.revenue_kobo,
        'previous_kobo', previous_payment.revenue_kobo
      )
    ),
    'conversion', jsonb_build_object(
      'used_all_free', conversion.used_all_free,
      'went_on_to_pay', conversion.went_on_to_pay,
      'still_unpaid', conversion.still_unpaid,
      'receipts_used_all_free', conversion.receipts_used_all_free,
      'agreements_used_all_free', conversion.agreements_used_all_free,
      'paid_before_free_exhausted', conversion.paid_before_free_exhausted,
      'percentage', case
        when conversion.used_all_free = 0 then null
        else round(
          conversion.went_on_to_pay::numeric
          * 100
          / conversion.used_all_free,
          1
        )
      end
    ),
    'top_users_total', (
      select count(*)::integer
      from filtered_users
    ),
    'page', v_page,
    'page_size', v_page_size,
    'top_users', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'identity_fingerprint', identity_fingerprint,
            'landlord_name', landlord_name,
            'documents_generated', documents_generated,
            'free_used', free_used,
            'free_allowance', free_allowance,
            'paid_remaining', paid_remaining,
            'last_active', last_active
          )
          order by row_position
        )
        from paged_users
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from current_document_summary current_docs
  cross join previous_document_summary previous_docs
  cross join returning_users returning_summary
  cross join current_payment_summary current_payment
  cross join previous_payment_summary previous_payment
  cross join conversion_summary conversion;

  return v_result;
end;
$$;

revoke all on function public.get_platform_admin_free_tools(
  integer,
  text,
  integer,
  integer,
  text,
  text[]
) from public, anon, authenticated;

grant execute on function public.get_platform_admin_free_tools(
  integer,
  text,
  integer,
  integer,
  text,
  text[]
) to service_role;

commit;
