begin;

create table if not exists public.public_document_identity_claims (
  id uuid primary key default gen_random_uuid(),
  identity_fingerprint text not null unique,
  landlord_name_fingerprint text not null,
  landlord_phone_fingerprint text not null,
  property_address_fingerprint text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists public_document_identity_claims_address_uidx
  on public.public_document_identity_claims (property_address_fingerprint);
create unique index if not exists public_document_identity_claims_name_phone_uidx
  on public.public_document_identity_claims (landlord_name_fingerprint, landlord_phone_fingerprint);
create unique index if not exists public_document_identity_claims_name_address_uidx
  on public.public_document_identity_claims (landlord_name_fingerprint, property_address_fingerprint);

alter table public.public_document_identity_claims enable row level security;
alter table public.public_document_identity_claims force row level security;
revoke all on table public.public_document_identity_claims from anon, authenticated;
grant all on table public.public_document_identity_claims to service_role;

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
  v_free_allowance integer;
  v_row public.public_document_entitlements;
  v_claimed boolean := false;
begin
  if p_product_type = 'receipt' then
    v_free_allowance := 3;
  elsif p_product_type = 'tenancy_agreement' then
    v_free_allowance := 3;
  else
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
        identity_fingerprint,
        landlord_name_fingerprint,
        landlord_phone_fingerprint,
        property_address_fingerprint
      )
      values (
        p_identity_fingerprint,
        p_landlord_name_fingerprint,
        p_landlord_phone_fingerprint,
        p_property_address_fingerprint
      )
      on conflict do nothing;
      v_claimed := found;
    end if;

    if v_claimed then
      update public.public_document_entitlements
      set free_used = free_used + 1, updated_at = now()
      where id = v_row.id
      returning * into v_row;
    elsif v_row.paid_remaining > 0 then
      update public.public_document_entitlements
      set paid_remaining = paid_remaining - 1, updated_at = now()
      where id = v_row.id
      returning * into v_row;
    else
      return jsonb_build_object('allowed', false, 'free_remaining', 0, 'paid_remaining', 0);
    end if;
  elsif v_row.paid_remaining > 0 then
    update public.public_document_entitlements
    set paid_remaining = paid_remaining - 1, updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    return jsonb_build_object('allowed', false, 'free_remaining', 0, 'paid_remaining', 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'free_remaining', greatest(v_row.free_allowance - v_row.free_used, 0),
    'paid_remaining', v_row.paid_remaining,
    'remaining', greatest(v_row.free_allowance - v_row.free_used, 0) + v_row.paid_remaining
  );
end;
$$;

revoke all on function public.consume_public_document_credit_with_identity(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.consume_public_document_credit_with_identity(text, text, text, text, text) to service_role;

commit;
