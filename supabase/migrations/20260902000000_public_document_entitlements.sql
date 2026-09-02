begin;

alter table public.receipt_usage_events
  add column if not exists workflow_key text;
alter table public.agreement_usage_events
  add column if not exists workflow_key text;

delete from public.receipt_usage_events event
where event.event_type in ('receipt_generated', 'receipt_downloaded', 'receipt_whatsapp_shared')
  and event.id not in (
    select distinct on (receipt_id) id
    from public.receipt_usage_events
    where receipt_id is not null
      and event_type in ('receipt_generated', 'receipt_downloaded', 'receipt_whatsapp_shared')
    order by receipt_id, created_at desc, id desc
  );
update public.receipt_usage_events
set workflow_key = receipt_id::text
where receipt_id is not null
  and event_type in ('receipt_generated', 'receipt_downloaded', 'receipt_whatsapp_shared')
  and workflow_key is null;

delete from public.agreement_usage_events event
where event.event_type in ('agreement_generated', 'agreement_downloaded', 'agreement_whatsapp_shared')
  and event.id not in (
    select distinct on (agreement_id) id
    from public.agreement_usage_events
    where agreement_id is not null
      and event_type in ('agreement_generated', 'agreement_downloaded', 'agreement_whatsapp_shared')
    order by agreement_id, created_at desc, id desc
  );
update public.agreement_usage_events
set workflow_key = agreement_id::text
where agreement_id is not null
  and event_type in ('agreement_generated', 'agreement_downloaded', 'agreement_whatsapp_shared')
  and workflow_key is null;

drop index if exists public.receipt_usage_events_workflow_key_uidx;
drop index if exists public.agreement_usage_events_workflow_key_uidx;
create unique index receipt_usage_events_workflow_key_uidx
  on public.receipt_usage_events (workflow_key);
create unique index agreement_usage_events_workflow_key_uidx
  on public.agreement_usage_events (workflow_key);

create table if not exists public.public_document_entitlements (
  id uuid primary key default gen_random_uuid(),
  identity_fingerprint text not null,
  product_type text not null check (product_type in ('receipt', 'tenancy_agreement')),
  free_allowance integer not null check (free_allowance >= 0),
  free_used integer not null default 0 check (free_used >= 0),
  paid_remaining integer not null default 0 check (paid_remaining >= 0),
  total_paid_purchased integer not null default 0 check (total_paid_purchased >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_fingerprint, product_type)
);

create table if not exists public.public_document_payments (
  id uuid primary key default gen_random_uuid(),
  identity_fingerprint text not null,
  product_type text not null check (product_type in ('receipt', 'tenancy_agreement')),
  payment_reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  credits_granted integer not null check (credits_granted > 0),
  created_at timestamptz not null default now()
);

create index if not exists public_document_entitlements_identity_idx
  on public.public_document_entitlements (identity_fingerprint);
create index if not exists public_document_payments_identity_idx
  on public.public_document_payments (identity_fingerprint, product_type);

create or replace function public.consume_public_document_credit(
  p_identity_fingerprint text,
  p_product_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_free_allowance integer;
  v_row public.public_document_entitlements;
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

  update public.public_document_entitlements
  set free_used = case when free_used < free_allowance then free_used + 1 else free_used end,
      paid_remaining = case when free_used < free_allowance then paid_remaining else paid_remaining - 1 end,
      updated_at = now()
  where identity_fingerprint = p_identity_fingerprint
    and product_type = p_product_type
    and (free_used < free_allowance or paid_remaining > 0)
  returning * into v_row;

  if not found then
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

create or replace function public.grant_public_document_package(
  p_identity_fingerprint text,
  p_product_type text,
  p_payment_reference text,
  p_amount_kobo integer,
  p_credits integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_free_allowance integer := 3;
  v_inserted boolean;
  v_payment_id uuid;
  v_row public.public_document_entitlements;
begin
  if p_product_type not in ('receipt', 'tenancy_agreement') then
    raise exception 'Unsupported public document product';
  end if;

  insert into public.public_document_payments
    (identity_fingerprint, product_type, payment_reference, amount_kobo, credits_granted)
  values
    (p_identity_fingerprint, p_product_type, p_payment_reference, p_amount_kobo, p_credits)
  on conflict (payment_reference) do nothing
  returning id into v_payment_id;

  v_inserted := v_payment_id is not null;

  insert into public.public_document_entitlements (identity_fingerprint, product_type, free_allowance)
  values (p_identity_fingerprint, p_product_type, v_free_allowance)
  on conflict (identity_fingerprint, product_type) do nothing;

  if v_inserted then
    update public.public_document_entitlements
    set paid_remaining = paid_remaining + p_credits,
        total_paid_purchased = total_paid_purchased + p_credits,
        updated_at = now()
    where identity_fingerprint = p_identity_fingerprint
      and product_type = p_product_type;
  end if;

  select * into v_row
  from public.public_document_entitlements
  where identity_fingerprint = p_identity_fingerprint
    and product_type = p_product_type;

  return jsonb_build_object(
    'granted', v_inserted,
    'free_remaining', greatest(v_row.free_allowance - v_row.free_used, 0),
    'paid_remaining', v_row.paid_remaining,
    'remaining', greatest(v_row.free_allowance - v_row.free_used, 0) + v_row.paid_remaining
  );
end;
$$;

create or replace function public.release_public_document_credit(
  p_identity_fingerprint text,
  p_product_type text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.public_document_entitlements
  set free_used = case when free_used > 0 then free_used - 1 else free_used end,
      paid_remaining = case when free_used > 0 then paid_remaining else paid_remaining + 1 end,
      updated_at = now()
  where identity_fingerprint = p_identity_fingerprint
    and product_type = p_product_type;
end;
$$;

revoke all on function public.consume_public_document_credit(text, text) from public, anon, authenticated;
revoke all on function public.grant_public_document_package(text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_document_credit(text, text) to service_role;
grant execute on function public.grant_public_document_package(text, text, text, integer, integer) to service_role;
grant execute on function public.release_public_document_credit(text, text) to service_role;

alter table public.public_document_entitlements enable row level security;
alter table public.public_document_payments enable row level security;
revoke all on table public.public_document_entitlements from anon, authenticated;
revoke all on table public.public_document_payments from anon, authenticated;
grant all on table public.public_document_entitlements to service_role;
grant all on table public.public_document_payments to service_role;

commit;
