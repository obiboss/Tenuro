-- Developer buyer purchase links (pre-payment buyer onboarding flow)

create table if not exists public.developer_buyer_purchase_links (
  id uuid primary key default gen_random_uuid(),
  developer_account_id uuid not null,
  estate_id uuid not null,
  plot_id uuid not null,
  buyer_id uuid,
  sale_id uuid,
  token_hash text not null unique,
  buyer_name text,
  buyer_phone text not null,
  buyer_email text,
  buyer_full_name text,
  buyer_nin text,
  buyer_address text,
  buyer_next_of_kin_name text,
  buyer_next_of_kin_phone text,
  payment_plan_mode text not null,
  first_payment_amount numeric(14, 2) not null,
  total_price numeric(14, 2) not null,
  note text,
  status text not null default 'pending',
  expires_at timestamptz,
  used_at timestamptz,
  created_by_profile_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint developer_buyer_purchase_links_status_check check (
    status in (
      'pending',
      'details_submitted',
      'payment_started',
      'paid',
      'cancelled',
      'expired'
    )
  ),
  constraint developer_buyer_purchase_links_payment_plan_mode_check check (
    payment_plan_mode in (
      'outright',
      'fixed_installment',
      'flexible'
    )
  ),
  constraint developer_buyer_purchase_links_first_payment_positive check (
    first_payment_amount > 0
  ),
  constraint developer_buyer_purchase_links_total_price_positive check (
    total_price > 0
  ),
  constraint developer_buyer_purchase_links_first_payment_lte_total check (
    first_payment_amount <= total_price
  )
);

create index if not exists developer_buyer_purchase_links_plot_active_idx
  on public.developer_buyer_purchase_links (plot_id, status)
  where status in ('pending', 'details_submitted', 'payment_started');

create index if not exists developer_buyer_purchase_links_developer_account_idx
  on public.developer_buyer_purchase_links (developer_account_id, created_at desc);

create or replace function public.create_developer_buyer_purchase_link(
  p_developer_account_id uuid,
  p_estate_id uuid,
  p_plot_id uuid,
  p_token_hash text,
  p_buyer_phone text,
  p_buyer_name text,
  p_buyer_email text,
  p_payment_plan_mode text,
  p_first_payment_amount numeric,
  p_total_price numeric,
  p_note text,
  p_created_by_profile_id uuid,
  p_expires_at timestamptz default null
)
returns public.developer_buyer_purchase_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plot public.developer_plots%rowtype;
  v_link public.developer_buyer_purchase_links%rowtype;
begin
  select *
  into v_plot
  from public.developer_plots
  where id = p_plot_id
    and developer_account_id = p_developer_account_id
    and estate_id = p_estate_id
  for update;

  if not found then
    raise exception 'Plot was not found for this estate.';
  end if;

  if v_plot.status <> 'available' then
    raise exception 'This plot is not available to reserve.';
  end if;

  if p_first_payment_amount <= 0 or p_total_price <= 0 then
    raise exception 'Payment amounts must be greater than zero.';
  end if;

  if p_first_payment_amount > p_total_price then
    raise exception 'First payment cannot exceed total price.';
  end if;

  if p_payment_plan_mode = 'outright'
    and p_first_payment_amount <> p_total_price then
    raise exception 'Full payment requires the first payment to equal the total price.';
  end if;

  update public.developer_buyer_purchase_links
  set
    status = 'cancelled',
    updated_at = now()
  where plot_id = p_plot_id
    and status in ('pending', 'details_submitted', 'payment_started');

  update public.developer_plots
  set
    status = 'reserved',
    updated_at = now()
  where id = p_plot_id;

  insert into public.developer_buyer_purchase_links (
    developer_account_id,
    estate_id,
    plot_id,
    token_hash,
    buyer_phone,
    buyer_name,
    buyer_email,
    payment_plan_mode,
    first_payment_amount,
    total_price,
    note,
    status,
    expires_at,
    created_by_profile_id
  )
  values (
    p_developer_account_id,
    p_estate_id,
    p_plot_id,
    p_token_hash,
    p_buyer_phone,
    nullif(trim(coalesce(p_buyer_name, '')), ''),
    nullif(trim(coalesce(p_buyer_email, '')), ''),
    p_payment_plan_mode,
    p_first_payment_amount,
    p_total_price,
    nullif(trim(coalesce(p_note, '')), ''),
    'pending',
    p_expires_at,
    p_created_by_profile_id
  )
  returning *
  into v_link;

  return v_link;
end;
$$;
