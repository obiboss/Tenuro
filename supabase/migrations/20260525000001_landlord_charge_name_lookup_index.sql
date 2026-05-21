-- Replace unique active charge name index with non-unique lookup index.
-- Duplicate active charge names are enforced in the application layer.

drop index if exists landlord_tenancy_charges_active_name_uidx;

create index if not exists landlord_tenancy_charges_tenancy_name_idx
  on public.landlord_tenancy_charges (
    tenancy_id,
    lower(charge_name)
  )
  where status = 'active';
