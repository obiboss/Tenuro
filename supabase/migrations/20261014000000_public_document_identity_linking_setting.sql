begin;

create table if not exists public.public_document_feature_settings (
  feature_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.public_document_feature_settings (feature_key, enabled)
values ('identity_linking', false)
on conflict (feature_key) do nothing;

alter table public.public_document_feature_settings enable row level security;
alter table public.public_document_feature_settings force row level security;
revoke all on table public.public_document_feature_settings from anon, authenticated;
grant all on table public.public_document_feature_settings to service_role;

create or replace function public.consume_configured_public_document_credit(
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
begin
  select enabled into v_linking_enabled
  from public.public_document_feature_settings
  where feature_key = 'identity_linking';

  if coalesce(v_linking_enabled, false) then
    return public.consume_linked_public_document_credit(
      p_identity_fingerprint, p_product_type,
      p_landlord_name_fingerprint, p_landlord_phone_fingerprint,
      p_property_address_fingerprint, p_link_phone_fingerprint,
      p_link_address_fingerprint
    );
  end if;

  return public.consume_public_document_credit_with_identity(
    p_identity_fingerprint, p_product_type,
    p_landlord_name_fingerprint, p_landlord_phone_fingerprint,
    p_property_address_fingerprint
  );
end;
$$;

revoke all on function public.consume_configured_public_document_credit(
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.consume_configured_public_document_credit(
  text, text, text, text, text, text, text
) to service_role;

commit;
