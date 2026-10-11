begin;

create or replace function public.consume_configured_paid_public_document_credit(
  p_identity_fingerprint text,
  p_product_type text,
  p_landlord_name_fingerprint text,
  p_landlord_phone_fingerprint text,
  p_property_address_fingerprint text,
  p_link_phone_fingerprint text,
  p_link_address_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_linking_enabled boolean := false;
  v_group_id uuid;
  v_entitlement_id uuid;
  v_free_allowance integer := 3;
  v_free_used integer := 0;
  v_paid_remaining integer := 0;
begin
  if p_product_type not in ('receipt', 'tenancy_agreement') then
    raise exception 'Unsupported public document product';
  end if;

  select enabled into v_linking_enabled
  from public.public_document_feature_settings
  where feature_key = 'identity_linking';

  if coalesce(v_linking_enabled, false) then
    v_group_id := public.resolve_public_document_identity_group(
      p_identity_fingerprint,
      p_link_phone_fingerprint,
      p_link_address_fingerprint
    );
    perform pg_advisory_xact_lock(
      hashtext('public-document-credit:' || v_group_id::text || ':' || p_product_type)
    );

    insert into public.public_document_entitlements (
      identity_fingerprint,
      product_type,
      free_allowance
    ) values (
      p_identity_fingerprint,
      p_product_type,
      v_free_allowance
    ) on conflict (identity_fingerprint, product_type) do nothing;

    select
      coalesce(sum(entitlement.free_used), 0),
      coalesce(sum(entitlement.paid_remaining), 0)
    into v_free_used, v_paid_remaining
    from public.public_document_identity_group_memberships membership
    join public.public_document_entitlements entitlement
      on entitlement.identity_fingerprint = membership.identity_fingerprint
     and entitlement.product_type = p_product_type
    where membership.group_id = v_group_id
      and membership.status = 'active';

    select entitlement.id into v_entitlement_id
    from public.public_document_identity_group_memberships membership
    join public.public_document_entitlements entitlement
      on entitlement.identity_fingerprint = membership.identity_fingerprint
     and entitlement.product_type = p_product_type
    where membership.group_id = v_group_id
      and membership.status = 'active'
      and entitlement.paid_remaining > 0
    order by
      (membership.identity_fingerprint = p_identity_fingerprint) desc,
      entitlement.created_at,
      entitlement.id
    limit 1
    for update of entitlement;

    if v_entitlement_id is null then
      return jsonb_build_object(
        'allowed', false,
        'free_remaining', greatest(v_free_allowance - v_free_used, 0),
        'paid_remaining', v_paid_remaining
      );
    end if;

    update public.public_document_entitlements
    set paid_remaining = paid_remaining - 1, updated_at = now()
    where id = v_entitlement_id;

    v_paid_remaining := v_paid_remaining - 1;
  else
    perform pg_advisory_xact_lock(
      hashtext('public-document-credit:' || p_identity_fingerprint || ':' || p_product_type)
    );

    insert into public.public_document_entitlements (
      identity_fingerprint,
      product_type,
      free_allowance
    ) values (
      p_identity_fingerprint,
      p_product_type,
      v_free_allowance
    ) on conflict (identity_fingerprint, product_type) do nothing;

    select id, free_allowance, free_used, paid_remaining
    into v_entitlement_id, v_free_allowance, v_free_used, v_paid_remaining
    from public.public_document_entitlements
    where identity_fingerprint = p_identity_fingerprint
      and product_type = p_product_type
    for update;

    if v_paid_remaining <= 0 then
      return jsonb_build_object(
        'allowed', false,
        'free_remaining', greatest(v_free_allowance - v_free_used, 0),
        'paid_remaining', 0
      );
    end if;

    update public.public_document_entitlements
    set paid_remaining = paid_remaining - 1, updated_at = now()
    where id = v_entitlement_id;

    v_paid_remaining := v_paid_remaining - 1;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'free_remaining', greatest(v_free_allowance - v_free_used, 0),
    'paid_remaining', greatest(v_paid_remaining, 0),
    'remaining', greatest(v_free_allowance - v_free_used, 0) + greatest(v_paid_remaining, 0),
    'supplying_entitlement_id', v_entitlement_id,
    'credit_type', 'paid'
  );
end;
$$;

revoke all on function public.consume_configured_paid_public_document_credit(
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.consume_configured_paid_public_document_credit(
  text, text, text, text, text, text, text
) to service_role;

-- Make the newly added RPC visible to PostgREST immediately after deployment.
notify pgrst, 'reload schema';

commit;
