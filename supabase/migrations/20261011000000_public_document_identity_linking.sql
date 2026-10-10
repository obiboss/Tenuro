begin;

create table if not exists public.public_document_identity_groups (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_document_identity_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.public_document_identity_groups(id),
  identity_fingerprint text not null,
  status text not null check (status in ('active', 'proposed', 'rejected', 'revoked')),
  link_reason text not null check (link_reason in ('standalone', 'phone', 'address', 'manual')),
  link_key_fingerprint text,
  phone_key_fingerprint text,
  address_key_fingerprint text,
  linked_to_identity_fingerprint text,
  proposal_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text
);

create unique index if not exists public_document_identity_group_active_member_uidx
  on public.public_document_identity_group_memberships (identity_fingerprint)
  where status = 'active';
create index if not exists public_document_identity_group_phone_idx
  on public.public_document_identity_group_memberships (phone_key_fingerprint, group_id)
  where status = 'active' and phone_key_fingerprint is not null;
create index if not exists public_document_identity_group_address_idx
  on public.public_document_identity_group_memberships (address_key_fingerprint, group_id)
  where status = 'active' and address_key_fingerprint is not null;
create unique index if not exists public_document_identity_group_proposal_uidx
  on public.public_document_identity_group_memberships (
    identity_fingerprint,
    group_id,
    link_reason,
    link_key_fingerprint
  )
  where status = 'proposed';

alter table public.public_document_identity_groups enable row level security;
alter table public.public_document_identity_groups force row level security;
alter table public.public_document_identity_group_memberships enable row level security;
alter table public.public_document_identity_group_memberships force row level security;
revoke all on table public.public_document_identity_groups from anon, authenticated;
revoke all on table public.public_document_identity_group_memberships from anon, authenticated;
grant all on table public.public_document_identity_groups to service_role;
grant all on table public.public_document_identity_group_memberships to service_role;

create or replace function public.prevent_public_document_identity_link_deletion()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Public document identity links are append-only; revoke the row instead';
end;
$$;

drop trigger if exists protect_public_document_identity_group_deletion
  on public.public_document_identity_groups;
create trigger protect_public_document_identity_group_deletion
before delete on public.public_document_identity_groups
for each row execute function public.prevent_public_document_identity_link_deletion();

drop trigger if exists protect_public_document_identity_membership_deletion
  on public.public_document_identity_group_memberships;
create trigger protect_public_document_identity_membership_deletion
before delete on public.public_document_identity_group_memberships
for each row execute function public.prevent_public_document_identity_link_deletion();

create or replace function public.resolve_public_document_identity_group(
  p_identity_fingerprint text,
  p_phone_key_fingerprint text,
  p_address_key_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_group uuid;
  v_candidate_groups uuid[];
  v_candidate_count integer;
  v_group_id uuid;
  v_link_reason text := 'standalone';
  v_link_key text;
  v_linked_to text;
  v_proposal_batch uuid;
  v_candidate uuid;
begin
  if nullif(btrim(p_identity_fingerprint), '') is null then
    raise exception 'Identity fingerprint is required';
  end if;

  perform pg_advisory_xact_lock(hashtext('public-document-link:' || p_identity_fingerprint));

  select group_id into v_current_group
  from public.public_document_identity_group_memberships
  where identity_fingerprint = p_identity_fingerprint and status = 'active';

  select coalesce(array_agg(distinct candidate.group_id), '{}'::uuid[])
  into v_candidate_groups
  from (
    select membership.group_id
    from public.public_document_identity_group_memberships membership
    join public.public_document_identity_groups identity_group
      on identity_group.id = membership.group_id and identity_group.status = 'active'
    where membership.status = 'active'
      and membership.identity_fingerprint <> p_identity_fingerprint
      and (
        (p_phone_key_fingerprint is not null and membership.phone_key_fingerprint = p_phone_key_fingerprint)
        or
        (p_address_key_fingerprint is not null and membership.address_key_fingerprint = p_address_key_fingerprint)
      )
  ) candidate;

  if v_current_group is not null and not (v_current_group = any(v_candidate_groups)) then
    v_candidate_groups := array_append(v_candidate_groups, v_current_group);
  end if;
  v_candidate_count := coalesce(cardinality(v_candidate_groups), 0);

  if v_current_group is not null and v_candidate_count <= 1 then
    update public.public_document_identity_group_memberships
    set phone_key_fingerprint = coalesce(p_phone_key_fingerprint, phone_key_fingerprint),
        address_key_fingerprint = coalesce(p_address_key_fingerprint, address_key_fingerprint),
        updated_at = now()
    where identity_fingerprint = p_identity_fingerprint and status = 'active';
    return v_current_group;
  end if;

  if v_candidate_count = 0 then
    insert into public.public_document_identity_groups default values returning id into v_group_id;
  elsif v_candidate_count = 1 then
    v_group_id := v_candidate_groups[1];
    select
      case when p_phone_key_fingerprint is not null
        and membership.phone_key_fingerprint = p_phone_key_fingerprint
        then 'phone' else 'address' end,
      case when p_phone_key_fingerprint is not null
        and membership.phone_key_fingerprint = p_phone_key_fingerprint
        then p_phone_key_fingerprint else p_address_key_fingerprint end,
      membership.identity_fingerprint
    into v_link_reason, v_link_key, v_linked_to
    from public.public_document_identity_group_memberships membership
    where membership.group_id = v_group_id and membership.status = 'active'
      and (
        (p_phone_key_fingerprint is not null and membership.phone_key_fingerprint = p_phone_key_fingerprint)
        or
        (p_address_key_fingerprint is not null and membership.address_key_fingerprint = p_address_key_fingerprint)
      )
    order by membership.created_at
    limit 1;
  else
    if v_current_group is null then
      insert into public.public_document_identity_groups default values returning id into v_group_id;
      insert into public.public_document_identity_group_memberships (
        group_id, identity_fingerprint, status, link_reason,
        phone_key_fingerprint, address_key_fingerprint
      ) values (
        v_group_id, p_identity_fingerprint, 'active', 'standalone',
        p_phone_key_fingerprint, p_address_key_fingerprint
      );
    else
      v_group_id := v_current_group;
    end if;

    v_proposal_batch := gen_random_uuid();
    foreach v_candidate in array v_candidate_groups loop
      if v_candidate <> v_group_id then
        insert into public.public_document_identity_group_memberships (
          group_id, identity_fingerprint, status, link_reason, link_key_fingerprint,
          phone_key_fingerprint, address_key_fingerprint, proposal_batch_id
        )
        select
          v_candidate,
          p_identity_fingerprint,
          'proposed',
          case when p_phone_key_fingerprint is not null
            and bool_or(member.phone_key_fingerprint = p_phone_key_fingerprint)
            then 'phone' else 'address' end,
          case when p_phone_key_fingerprint is not null
            and bool_or(member.phone_key_fingerprint = p_phone_key_fingerprint)
            then p_phone_key_fingerprint else p_address_key_fingerprint end,
          p_phone_key_fingerprint,
          p_address_key_fingerprint,
          v_proposal_batch
        from public.public_document_identity_group_memberships member
        where member.group_id = v_candidate and member.status = 'active'
        on conflict do nothing;
      end if;
    end loop;
    return v_group_id;
  end if;

  insert into public.public_document_identity_group_memberships (
    group_id, identity_fingerprint, status, link_reason, link_key_fingerprint,
    phone_key_fingerprint, address_key_fingerprint, linked_to_identity_fingerprint
  ) values (
    v_group_id, p_identity_fingerprint, 'active', v_link_reason, v_link_key,
    p_phone_key_fingerprint, p_address_key_fingerprint, v_linked_to
  );
  return v_group_id;
end;
$$;

-- Seed the additive layer from existing generated documents. This does not
-- alter fingerprints, entitlements, payments, or credit balances. The same
-- resolver used at runtime records ambiguous bridge matches as proposals.
do $$
declare
  v_observation record;
  v_identity_fingerprint text;
  v_phone_key text;
  v_address_key text;
begin
  for v_observation in
    select distinct on (source.identity_fingerprint)
      source.identity_fingerprint,
      source.phone_digits,
      source.normalized_address
    from (
      select
        encode(extensions.digest(
          lower(regexp_replace(btrim(receipt.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31)
          || regexp_replace(receipt.landlord_phone_number, '\D', '', 'g')
          || chr(31)
          || lower(regexp_replace(btrim(receipt.property_address), '\s+', ' ', 'g')),
          'sha256'
        ), 'hex') as identity_fingerprint,
        regexp_replace(receipt.landlord_phone_number, '\D', '', 'g') as phone_digits,
        btrim(regexp_replace(
          lower(normalize(receipt.property_address, NFKC)),
          '[^[:alnum:]]+', ' ', 'g'
        )) as normalized_address,
        receipt.created_at
      from public.public_generated_receipts receipt

      union all

      select
        encode(extensions.digest(
          lower(regexp_replace(btrim(agreement.landlord_full_name), '\s+', ' ', 'g'))
          || chr(31)
          || regexp_replace(agreement.landlord_phone_number, '\D', '', 'g')
          || chr(31)
          || lower(regexp_replace(btrim(agreement.property_address), '\s+', ' ', 'g')),
          'sha256'
        ), 'hex') as identity_fingerprint,
        regexp_replace(agreement.landlord_phone_number, '\D', '', 'g') as phone_digits,
        btrim(regexp_replace(
          lower(normalize(agreement.property_address, NFKC)),
          '[^[:alnum:]]+', ' ', 'g'
        )) as normalized_address,
        agreement.created_at
      from public.public_generated_agreements agreement
    ) source
    order by source.identity_fingerprint, source.created_at desc
  loop
    v_identity_fingerprint := v_observation.identity_fingerprint;
    v_phone_key := case when length(v_observation.phone_digits) >= 10 then
      encode(extensions.digest(
        'public-document-link:phone:' || right(v_observation.phone_digits, 10),
        'sha256'
      ), 'hex') else null end;
    v_address_key := case when length(v_observation.normalized_address) >= 15 then
      encode(extensions.digest(
        'public-document-link:address:' || v_observation.normalized_address,
        'sha256'
      ), 'hex') else null end;

    perform public.resolve_public_document_identity_group(
      v_identity_fingerprint,
      v_phone_key,
      v_address_key
    );
  end loop;

  for v_identity_fingerprint in
    select distinct identity_fingerprint
    from (
      select identity_fingerprint from public.public_document_entitlements
      union
      select identity_fingerprint from public.public_document_payments
      union
      select identity_fingerprint from public.public_document_identity_claims
    ) identities
    where not exists (
      select 1
      from public.public_document_identity_group_memberships membership
      where membership.identity_fingerprint = identities.identity_fingerprint
        and membership.status = 'active'
    )
  loop
    perform public.resolve_public_document_identity_group(
      v_identity_fingerprint,
      null,
      null
    );
  end loop;
end;
$$;

create or replace function public.consume_linked_public_document_credit(
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
  v_group_id uuid;
  v_free_allowance integer := 3;
  v_free_used integer;
  v_paid_remaining integer;
  v_spend_entitlement_id uuid;
  v_credit_type text;
  v_claimed boolean := false;
begin
  if p_product_type not in ('receipt', 'tenancy_agreement') then
    raise exception 'Unsupported public document product';
  end if;

  v_group_id := public.resolve_public_document_identity_group(
    p_identity_fingerprint,
    p_link_phone_fingerprint,
    p_link_address_fingerprint
  );
  perform pg_advisory_xact_lock(hashtext('public-document-credit:' || v_group_id::text || ':' || p_product_type));

  insert into public.public_document_entitlements (identity_fingerprint, product_type, free_allowance)
  values (p_identity_fingerprint, p_product_type, v_free_allowance)
  on conflict (identity_fingerprint, product_type) do nothing;

  select coalesce(sum(entitlement.free_used), 0), coalesce(sum(entitlement.paid_remaining), 0)
  into v_free_used, v_paid_remaining
  from public.public_document_identity_group_memberships membership
  join public.public_document_entitlements entitlement
    on entitlement.identity_fingerprint = membership.identity_fingerprint
   and entitlement.product_type = p_product_type
  where membership.group_id = v_group_id and membership.status = 'active';

  if v_free_used < v_free_allowance then
    if exists (
      select 1 from public.public_document_identity_claims claim
      where claim.identity_fingerprint = p_identity_fingerprint
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

      if not v_claimed then
        select exists (
          select 1
          from public.public_document_identity_claims claim
          join public.public_document_identity_group_memberships member
            on member.identity_fingerprint = claim.identity_fingerprint
           and member.group_id = v_group_id and member.status = 'active'
          where claim.landlord_phone_fingerprint = p_landlord_phone_fingerprint
             or claim.property_address_fingerprint = p_property_address_fingerprint
        ) into v_claimed;
      end if;
    end if;

    if v_claimed then
      update public.public_document_entitlements
      set free_used = free_used + 1, updated_at = now()
      where identity_fingerprint = p_identity_fingerprint and product_type = p_product_type
      returning id into v_spend_entitlement_id;
      v_free_used := v_free_used + 1;
      v_credit_type := 'free';
    end if;
  end if;

  if not v_claimed then
    select entitlement.id into v_spend_entitlement_id
    from public.public_document_identity_group_memberships membership
    join public.public_document_entitlements entitlement
      on entitlement.identity_fingerprint = membership.identity_fingerprint
     and entitlement.product_type = p_product_type
    where membership.group_id = v_group_id
      and membership.status = 'active'
      and entitlement.paid_remaining > 0
    order by (membership.identity_fingerprint = p_identity_fingerprint) desc,
      entitlement.created_at, entitlement.id
    limit 1
    for update of entitlement;

    if v_spend_entitlement_id is null then
      return jsonb_build_object(
        'allowed', false,
        'free_remaining', greatest(v_free_allowance - v_free_used, 0),
        'paid_remaining', v_paid_remaining
      );
    end if;

    update public.public_document_entitlements
    set paid_remaining = paid_remaining - 1, updated_at = now()
    where id = v_spend_entitlement_id;
    v_paid_remaining := v_paid_remaining - 1;
    v_credit_type := 'paid';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'free_remaining', greatest(v_free_allowance - v_free_used, 0),
    'paid_remaining', greatest(v_paid_remaining, 0),
    'supplying_entitlement_id', v_spend_entitlement_id,
    'credit_type', v_credit_type,
    'remaining', greatest(v_free_allowance - v_free_used, 0) + greatest(v_paid_remaining, 0)
  );
end;
$$;

revoke all on function public.resolve_public_document_identity_group(text, text, text)
  from public, anon, authenticated;
revoke all on function public.consume_linked_public_document_credit(
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_public_document_identity_group(text, text, text)
  to service_role;
grant execute on function public.consume_linked_public_document_credit(
  text, text, text, text, text, text, text
) to service_role;

commit;
