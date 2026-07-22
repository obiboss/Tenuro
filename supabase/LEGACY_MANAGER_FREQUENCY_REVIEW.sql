-- Run after 20260722010000_authoritative_rent_cycles.sql.
-- These are legacy Manager units whose old records contained no frequency
-- history, so the migration provisionally assigned annual frequency.

with units_with_frequency_history as (
  select distinct request.unit_id
  from public.manager_tenant_onboarding_requests request
  where request.tenant_payment_frequency is not null
)
select
  unit.id as unit_id,
  organization.organization_name,
  property.property_name,
  unit.unit_label,
  unit.rent_amount,
  unit.rent_frequency,
  unit.status,
  tenant.full_name as current_tenant,
  tenant.move_in_date,
  tenant.next_rent_due_date
from public.manager_units unit
join public.manager_organizations organization
  on organization.id = unit.organization_id
join public.manager_properties property
  on property.id = unit.property_id
left join public.manager_tenants tenant
  on tenant.unit_id = unit.id
  and tenant.status in ('active', 'eviction_notice')
where not exists (
  select 1
  from units_with_frequency_history history
  where history.unit_id = unit.id
)
order by organization.organization_name, property.property_name, unit.unit_label;

-- Review the result against the tenancy agreement or landlord instruction.
-- Vacant units can be corrected in BOPA after this implementation is deployed.
-- For an occupied legacy unit that was incorrectly inferred as annual, make the
-- correction through a controlled database change after backing up the row, so
-- the unit and current tenant are updated together from the original move-in date.
