-- Batch 10: Receipt + ledger integrity (production-safe, schema-aware)

-- One receipt number per landlord for posted payments
create unique index if not exists rent_payments_landlord_receipt_number_uidx
  on public.rent_payments (landlord_id, receipt_number)
  where receipt_number is not null
    and status = 'posted';

-- One receipt storage path per posted payment
create unique index if not exists rent_payments_receipt_path_uidx
  on public.rent_payments (receipt_path)
  where receipt_path is not null
    and status = 'posted';

-- Ledger lookup + duplicate payment credit protection
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ledger_entries'
      and column_name = 'reference_payment_id'
  ) then

    execute $sql$
      create index if not exists ledger_entries_tenancy_payment_ref_idx
        on public.ledger_entries (
          tenancy_id,
          reference_payment_id
        )
        where reference_payment_id is not null
    $sql$;

    execute $sql$
      create unique index if not exists ledger_entries_payment_credit_uidx
        on public.ledger_entries (
          reference_payment_id,
          entry_type
        )
        where entry_type = 'payment'
          and reference_payment_id is not null
    $sql$;

  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ledger_entries'
      and column_name = 'payment_id'
  ) then

    execute $sql$
      create index if not exists ledger_entries_tenancy_payment_ref_idx
        on public.ledger_entries (
          tenancy_id,
          payment_id
        )
        where payment_id is not null
    $sql$;

    execute $sql$
      create unique index if not exists ledger_entries_payment_credit_uidx
        on public.ledger_entries (
          payment_id,
          entry_type
        )
        where entry_type = 'payment'
          and payment_id is not null
    $sql$;

  end if;
end $$;
