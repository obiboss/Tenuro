-- Public buyer purchase flow: prepare sale/payment plan from purchase link (token-authorized).
-- Does not use auth.uid() developer ownership checks. Existing developer-dashboard RPCs remain unchanged.

create or replace function public.create_public_buyer_purchase_sale_from_link(
  p_purchase_link_id uuid,
  p_buyer_full_name text,
  p_buyer_phone text,
  p_buyer_email text,
  p_buyer_nin text,
  p_buyer_address text,
  p_buyer_next_of_kin_name text,
  p_buyer_next_of_kin_phone text
)
returns table (
  sale_id uuid,
  schedule_item_id uuid,
  buyer_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.developer_buyer_purchase_links%rowtype;
  v_plot public.developer_plots%rowtype;
  v_buyer public.developer_buyers%rowtype;
  v_assignment public.developer_plot_assignments%rowtype;
  v_sale public.developer_sales%rowtype;
  v_payment_plan public.developer_payment_plans%rowtype;
  v_schedule_item_id uuid;
  v_sale_date date;
  v_first_payment numeric(14, 2);
  v_total_price numeric(14, 2);
  v_balance numeric(14, 2);
  v_balance_due_date date;
  v_balance_label text;
  v_sale_reference text;
begin
  if p_purchase_link_id is null then
    raise exception 'Purchase link is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_full_name, '')), '') is null then
    raise exception 'Buyer full name is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_phone, '')), '') is null then
    raise exception 'Buyer phone is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_nin, '')), '') is null then
    raise exception 'Buyer NIN is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_address, '')), '') is null then
    raise exception 'Buyer address is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_next_of_kin_name, '')), '') is null then
    raise exception 'Next of kin name is required.';
  end if;

  if nullif(trim(coalesce(p_buyer_next_of_kin_phone, '')), '') is null then
    raise exception 'Next of kin phone is required.';
  end if;

  select *
  into v_link
  from public.developer_buyer_purchase_links
  where id = p_purchase_link_id
  for update;

  if not found then
    raise exception 'Purchase link was not found.';
  end if;

  if v_link.status not in ('pending', 'details_submitted', 'payment_started') then
    raise exception 'This purchase link is no longer active.';
  end if;

  if v_link.expires_at is not null and v_link.expires_at <= now() then
    raise exception 'This purchase link has expired.';
  end if;

  if v_link.sale_id is not null and v_link.buyer_id is not null then
    select dpsi.id
    into v_schedule_item_id
    from public.developer_payment_schedule_items dpsi
    where dpsi.developer_account_id = v_link.developer_account_id
      and dpsi.sale_id = v_link.sale_id
      and dpsi.sort_order = 0
    order by dpsi.created_at asc
    limit 1;

    if v_schedule_item_id is null then
      raise exception 'Payment schedule could not be prepared.';
    end if;

    return query
    select v_link.sale_id, v_schedule_item_id, v_link.buyer_id;
    return;
  end if;

  select *
  into v_plot
  from public.developer_plots
  where id = v_link.plot_id
    and developer_account_id = v_link.developer_account_id
    and estate_id = v_link.estate_id
  for update;

  if not found then
    raise exception 'Plot was not found for this purchase link.';
  end if;

  if v_plot.status <> 'reserved' then
    raise exception 'This plot is not reserved for purchase.';
  end if;

  v_first_payment := v_link.first_payment_amount;
  v_total_price := v_link.total_price;

  if v_first_payment <= 0 or v_total_price <= 0 then
    raise exception 'Payment amounts must be greater than zero.';
  end if;

  if v_first_payment > v_total_price then
    raise exception 'First payment cannot exceed total price.';
  end if;

  select *
  into v_buyer
  from public.developer_buyers
  where developer_account_id = v_link.developer_account_id
    and phone_number = p_buyer_phone
  for update;

  if found then
    update public.developer_buyers
    set
      full_name = trim(p_buyer_full_name),
      phone_number = p_buyer_phone,
      email = nullif(trim(coalesce(p_buyer_email, '')), ''),
      nin = trim(p_buyer_nin),
      next_of_kin_name = trim(p_buyer_next_of_kin_name),
      next_of_kin_phone = p_buyer_next_of_kin_phone,
      residential_address = trim(p_buyer_address),
      status = 'assigned',
      updated_at = now()
    where id = v_buyer.id
    returning *
    into v_buyer;
  else
    insert into public.developer_buyers (
      developer_account_id,
      full_name,
      phone_number,
      email,
      nin,
      next_of_kin_name,
      next_of_kin_phone,
      residential_address,
      status
    )
    values (
      v_link.developer_account_id,
      trim(p_buyer_full_name),
      p_buyer_phone,
      nullif(trim(coalesce(p_buyer_email, '')), ''),
      trim(p_buyer_nin),
      trim(p_buyer_next_of_kin_name),
      p_buyer_next_of_kin_phone,
      trim(p_buyer_address),
      'assigned'
    )
    returning *
    into v_buyer;
  end if;

  select *
  into v_assignment
  from public.developer_plot_assignments
  where developer_account_id = v_link.developer_account_id
    and estate_id = v_link.estate_id
    and plot_id = v_link.plot_id
    and buyer_id = v_buyer.id
    and status in ('reserved', 'active')
  order by assigned_at desc
  limit 1
  for update;

  if not found then
    insert into public.developer_plot_assignments (
      developer_account_id,
      estate_id,
      plot_id,
      buyer_id,
      status,
      assignment_note,
      assigned_at
    )
    values (
      v_link.developer_account_id,
      v_link.estate_id,
      v_link.plot_id,
      v_buyer.id,
      'reserved',
      v_link.note,
      now()
    )
    returning *
    into v_assignment;
  end if;

  select *
  into v_sale
  from public.developer_sales
  where plot_assignment_id = v_assignment.id
  limit 1;

  v_sale_date := current_date;

  if not found then
    v_sale_reference :=
      'BVS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

    insert into public.developer_sales (
      developer_account_id,
      estate_id,
      plot_id,
      buyer_id,
      plot_assignment_id,
      sale_reference,
      payment_plan_mode,
      total_price_locked,
      initial_deposit_amount,
      sale_date,
      expected_completion_date,
      status,
      notes
    )
    values (
      v_link.developer_account_id,
      v_link.estate_id,
      v_link.plot_id,
      v_buyer.id,
      v_assignment.id,
      v_sale_reference,
      v_link.payment_plan_mode,
      v_total_price,
      v_first_payment,
      v_sale_date,
      null,
      'active',
      v_link.note
    )
    returning *
    into v_sale;

    update public.developer_plot_assignments
    set
      status = 'converted_to_sale',
      updated_at = now()
    where id = v_assignment.id;

    update public.developer_plots
    set
      status = 'active',
      updated_at = now()
    where id = v_link.plot_id;

    select *
    into v_payment_plan
    from public.developer_payment_plans
    where developer_account_id = v_link.developer_account_id
      and sale_id = v_sale.id
      and status = 'active'
    limit 1;

    if not found then
      insert into public.developer_payment_plans (
        developer_account_id,
        sale_id,
        payment_plan_mode,
        total_amount,
        schedule_start_date,
        status,
        notes
      )
      values (
        v_link.developer_account_id,
        v_sale.id,
        v_link.payment_plan_mode,
        v_total_price,
        v_sale_date,
        'active',
        v_link.note
      )
      returning *
      into v_payment_plan;

      insert into public.developer_payment_schedule_items (
        developer_account_id,
        payment_plan_id,
        sale_id,
        label,
        due_date,
        expected_amount,
        amount_paid,
        status,
        sort_order
      )
      values (
        v_link.developer_account_id,
        v_payment_plan.id,
        v_sale.id,
        'First payment',
        v_sale_date,
        v_first_payment,
        0,
        'pending',
        0
      )
      returning id
      into v_schedule_item_id;

      v_balance := round(v_total_price - v_first_payment, 2);

      if v_balance > 0 then
        v_balance_due_date := v_sale_date + interval '30 days';
        v_balance_label :=
          case
            when v_link.payment_plan_mode = 'flexible' then 'Remaining balance'
            else 'Next installment'
          end;

        insert into public.developer_payment_schedule_items (
          developer_account_id,
          payment_plan_id,
          sale_id,
          label,
          due_date,
          expected_amount,
          amount_paid,
          status,
          sort_order
        )
        values (
          v_link.developer_account_id,
          v_payment_plan.id,
          v_sale.id,
          v_balance_label,
          v_balance_due_date,
          v_balance,
          0,
          'pending',
          1
        );
      end if;
    else
      select dpsi.id
      into v_schedule_item_id
      from public.developer_payment_schedule_items dpsi
      where dpsi.developer_account_id = v_link.developer_account_id
        and dpsi.sale_id = v_sale.id
        and dpsi.sort_order = 0
      order by dpsi.created_at asc
      limit 1;
    end if;
  else
    select dpsi.id
    into v_schedule_item_id
    from public.developer_payment_schedule_items dpsi
    where dpsi.developer_account_id = v_link.developer_account_id
      and dpsi.sale_id = v_sale.id
      and dpsi.sort_order = 0
    order by dpsi.created_at asc
    limit 1;
  end if;

  if v_schedule_item_id is null then
    raise exception 'Payment schedule could not be prepared.';
  end if;

  update public.developer_buyer_purchase_links
  set
    buyer_id = v_buyer.id,
    sale_id = v_sale.id,
    buyer_full_name = trim(p_buyer_full_name),
    buyer_phone = p_buyer_phone,
    buyer_email = nullif(trim(coalesce(p_buyer_email, '')), ''),
    buyer_nin = trim(p_buyer_nin),
    buyer_address = trim(p_buyer_address),
    buyer_next_of_kin_name = trim(p_buyer_next_of_kin_name),
    buyer_next_of_kin_phone = p_buyer_next_of_kin_phone,
    status = 'payment_started',
    updated_at = now()
  where id = v_link.id;

  return query
  select v_sale.id, v_schedule_item_id, v_buyer.id;
end;
$$;
