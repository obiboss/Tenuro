begin;

create or replace function public.get_platform_admin_credit_reconciliation(
  p_product text,
  p_excluded_fingerprints text[] default '{}'::text[]
)
returns jsonb
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
with
documents as (
  select
    encode(extensions.digest(
      lower(regexp_replace(btrim(receipt.landlord_full_name), '\s+', ' ', 'g'))
      || chr(31) || regexp_replace(receipt.landlord_phone_number, '\D', '', 'g')
      || chr(31) || lower(regexp_replace(btrim(receipt.property_address), '\s+', ' ', 'g')),
      'sha256'
    ), 'hex') as identity_fingerprint,
    'receipt'::text as product_type,
    receipt.landlord_full_name,
    receipt.generation_completed_at
  from public.public_generated_receipts receipt
  where receipt.generation_completed_at is not null

  union all

  select
    encode(extensions.digest(
      lower(regexp_replace(btrim(agreement.landlord_full_name), '\s+', ' ', 'g'))
      || chr(31) || regexp_replace(agreement.landlord_phone_number, '\D', '', 'g')
      || chr(31) || lower(regexp_replace(btrim(agreement.property_address), '\s+', ' ', 'g')),
      'sha256'
    ), 'hex') as identity_fingerprint,
    'tenancy_agreement'::text as product_type,
    agreement.landlord_full_name,
    agreement.generation_completed_at
  from public.public_generated_agreements agreement
  where agreement.generation_completed_at is not null
),
filtered_documents as (
  select * from documents
  where not (identity_fingerprint = any(coalesce(p_excluded_fingerprints, '{}'::text[])))
    and (p_product = 'both' or product_type = p_product)
),
document_totals as (
  select identity_fingerprint, product_type, count(*)::integer as completed,
    (array_agg(landlord_full_name order by generation_completed_at desc))[1] as landlord_name
  from filtered_documents
  group by identity_fingerprint, product_type
),
entitlements as (
  select entitlement.*,
    (entitlement.free_used + entitlement.total_paid_purchased - entitlement.paid_remaining)::integer as consumed
  from public.public_document_entitlements entitlement
  where not (entitlement.identity_fingerprint = any(coalesce(p_excluded_fingerprints, '{}'::text[])))
    and (p_product = 'both' or entitlement.product_type = p_product)
),
products as (
  select unnest(case when p_product = 'both'
    then array['receipt', 'tenancy_agreement']::text[]
    else array[p_product]::text[] end) as product_type
),
summary as (
  select product.product_type,
    coalesce((select sum(completed) from document_totals d where d.product_type = product.product_type), 0)::integer as completed_documents,
    coalesce((select sum(consumed) from entitlements e where e.product_type = product.product_type), 0)::integer as consumed_credits,
    coalesce((
      select sum(d.completed) from document_totals d
      where d.product_type = product.product_type
        and not exists (
          select 1 from entitlements e
          where e.identity_fingerprint = d.identity_fingerprint
            and e.product_type = d.product_type
        )
    ), 0)::integer as legacy_documents,
    coalesce((
      select sum(greatest(e.consumed - coalesce(d.completed, 0), 0))
      from entitlements e
      left join document_totals d
        on d.identity_fingerprint = e.identity_fingerprint
       and d.product_type = e.product_type
      where e.product_type = product.product_type
    ), 0)::integer as consumed_without_completion
  from products product
),
failure_details as (
  select
    e.product_type,
    e.identity_fingerprint,
    coalesce(d.landlord_name, latest.landlord_name, 'Unknown landlord') as landlord_name,
    e.consumed,
    coalesce(d.completed, 0)::integer as completed,
    greatest(e.consumed - coalesce(d.completed, 0), 0)::integer as missing_completions
  from entitlements e
  left join document_totals d
    on d.identity_fingerprint = e.identity_fingerprint
   and d.product_type = e.product_type
  left join lateral (
    select source.landlord_full_name as landlord_name
    from (
      select receipt.landlord_full_name, receipt.created_at
      from public.public_generated_receipts receipt
      where e.product_type = 'receipt'
        and encode(extensions.digest(
          lower(regexp_replace(btrim(receipt.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31) || regexp_replace(receipt.landlord_phone_number, '\D', '', 'g')
          || chr(31) || lower(regexp_replace(btrim(receipt.property_address), '\s+', ' ', 'g')),
          'sha256'
        ), 'hex') = e.identity_fingerprint
      union all
      select agreement.landlord_full_name, agreement.created_at
      from public.public_generated_agreements agreement
      where e.product_type = 'tenancy_agreement'
        and encode(extensions.digest(
          lower(regexp_replace(btrim(agreement.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31) || regexp_replace(agreement.landlord_phone_number, '\D', '', 'g')
          || chr(31) || lower(regexp_replace(btrim(agreement.property_address), '\s+', ' ', 'g')),
          'sha256'
        ), 'hex') = e.identity_fingerprint
    ) source
    order by source.created_at desc
    limit 1
  ) latest on true
  where e.consumed > coalesce(d.completed, 0)
)
select jsonb_build_object(
  'summary', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_type', product_type,
      'completed_documents', completed_documents,
      'consumed_credits', consumed_credits,
      'legacy_documents', legacy_documents,
      'consumed_without_completion', consumed_without_completion
    ) order by product_type)
    from summary
  ), '[]'::jsonb),
  'failures', coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_type', product_type,
      'identity_fingerprint', identity_fingerprint,
      'landlord_name', landlord_name,
      'consumed', consumed,
      'completed', completed,
      'missing_completions', missing_completions
    ) order by missing_completions desc, landlord_name)
    from failure_details
  ), '[]'::jsonb)
);
$$;

revoke all on function public.get_platform_admin_credit_reconciliation(text, text[])
  from public, anon, authenticated;
grant execute on function public.get_platform_admin_credit_reconciliation(text, text[])
  to service_role;

commit;
