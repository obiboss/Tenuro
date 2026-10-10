begin;

create or replace function public.consume_public_document_credit_with_identity(
  p_identity_fingerprint text,
  p_product_type text,
  p_landlord_name_fingerprint text,
  p_landlord_phone_fingerprint text,
  p_property_address_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_free_allowance integer := 3;
  v_row public.public_document_entitlements;
  v_claimed boolean := false;
  v_credit_type text;
begin
  if p_product_type not in ('receipt', 'tenancy_agreement') then
    raise exception 'Unsupported public document product';
  end if;

  insert into public.public_document_entitlements (identity_fingerprint, product_type, free_allowance)
  values (p_identity_fingerprint, p_product_type, v_free_allowance)
  on conflict (identity_fingerprint, product_type) do nothing;

  select * into v_row
  from public.public_document_entitlements
  where identity_fingerprint = p_identity_fingerprint
    and product_type = p_product_type
  for update;

  if v_row.free_used < v_row.free_allowance then
    if exists (
      select 1 from public.public_document_identity_claims
      where identity_fingerprint = p_identity_fingerprint
    ) then
      v_claimed := true;
    else
      insert into public.public_document_identity_claims (
        identity_fingerprint, landlord_name_fingerprint,
        landlord_phone_fingerprint, property_address_fingerprint
      ) values (
        p_identity_fingerprint, p_landlord_name_fingerprint,
        p_landlord_phone_fingerprint, p_property_address_fingerprint
      ) on conflict do nothing;
      v_claimed := found;
    end if;

    if v_claimed then
      update public.public_document_entitlements
      set free_used = free_used + 1, updated_at = now()
      where id = v_row.id returning * into v_row;
      v_credit_type := 'free';
    elsif v_row.paid_remaining > 0 then
      update public.public_document_entitlements
      set paid_remaining = paid_remaining - 1, updated_at = now()
      where id = v_row.id returning * into v_row;
      v_credit_type := 'paid';
    else
      return jsonb_build_object('allowed', false, 'free_remaining', 0, 'paid_remaining', 0);
    end if;
  elsif v_row.paid_remaining > 0 then
    update public.public_document_entitlements
    set paid_remaining = paid_remaining - 1, updated_at = now()
    where id = v_row.id returning * into v_row;
    v_credit_type := 'paid';
  else
    return jsonb_build_object('allowed', false, 'free_remaining', 0, 'paid_remaining', 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'free_remaining', greatest(v_row.free_allowance - v_row.free_used, 0),
    'paid_remaining', v_row.paid_remaining,
    'remaining', greatest(v_row.free_allowance - v_row.free_used, 0) + v_row.paid_remaining,
    'supplying_entitlement_id', v_row.id,
    'credit_type', v_credit_type
  );
end;
$$;

create or replace function public.release_exact_public_document_credit(
  p_entitlement_id uuid,
  p_product_type text,
  p_credit_type text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_product_type not in ('receipt', 'tenancy_agreement') then
    raise exception 'Unsupported public document product';
  end if;
  if p_credit_type not in ('free', 'paid') then
    raise exception 'Unsupported public document credit type';
  end if;

  if p_credit_type = 'free' then
    update public.public_document_entitlements
    set free_used = free_used - 1, updated_at = now()
    where id = p_entitlement_id
      and product_type = p_product_type
      and free_used > 0;
  else
    update public.public_document_entitlements
    set paid_remaining = paid_remaining + 1, updated_at = now()
    where id = p_entitlement_id
      and product_type = p_product_type
      and paid_remaining < total_paid_purchased;
  end if;

  return found;
end;
$$;

revoke all on function public.release_public_document_credit(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.release_exact_public_document_credit(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.release_exact_public_document_credit(uuid, text, text)
  to service_role;

commit;
