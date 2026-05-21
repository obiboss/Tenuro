-- =====================================================
-- Landlord tenancy charges: legacy column safety
-- Ensures production inserts satisfy NOT NULL legacy fields
-- =====================================================

alter table if exists public.landlord_tenancy_charges
  add column if not exists label text,
  add column if not exists currency_code text,
  add column if not exists is_refundable boolean,
  add column if not exists is_required_before_move_in boolean;

update public.landlord_tenancy_charges
set currency_code = coalesce(nullif(trim(currency_code), ''), 'NGN')
where currency_code is null
   or trim(currency_code) = '';

update public.landlord_tenancy_charges
set is_refundable = false
where is_refundable is null;

update public.landlord_tenancy_charges
set is_required_before_move_in = true
where is_required_before_move_in is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'landlord_tenancy_charges'
      and column_name = 'charge_name'
  ) then
    execute $sql$
      update public.landlord_tenancy_charges
      set label = nullif(trim(charge_name), '')
      where (label is null or trim(label) = '')
        and charge_name is not null
        and trim(charge_name) <> ''
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'landlord_tenancy_charges'
      and column_name = 'label'
  ) then
    execute $sql$
      update public.landlord_tenancy_charges
      set charge_name = nullif(trim(label), '')
      where (charge_name is null or trim(charge_name) = '')
        and label is not null
        and trim(label) <> ''
    $sql$;
  end if;
end $$;

create or replace function public.sync_landlord_tenancy_charge_legacy_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.charge_name is not null and trim(new.charge_name) <> '' then
      if new.label is null or trim(new.label) = '' then
        new.label := trim(new.charge_name);
      end if;
    elsif new.label is not null and trim(new.label) <> '' then
      if new.charge_name is null or trim(new.charge_name) = '' then
        new.charge_name := trim(new.label);
      end if;
    end if;

    if new.currency_code is null or trim(new.currency_code) = '' then
      new.currency_code := 'NGN';
    end if;

    if new.is_refundable is null then
      new.is_refundable := false;
    end if;

    if new.is_required_before_move_in is null then
      new.is_required_before_move_in := true;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_landlord_tenancy_charges_legacy_sync
  on public.landlord_tenancy_charges;

create trigger trg_landlord_tenancy_charges_legacy_sync
before insert or update on public.landlord_tenancy_charges
for each row
execute function public.sync_landlord_tenancy_charge_legacy_fields();
