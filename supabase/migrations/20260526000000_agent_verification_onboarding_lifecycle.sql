-- Agent verification & processing fee lifecycle extension (non-destructive)

alter type public.tenant_onboarding_status add value if not exists 'documents_submitted';
alter type public.tenant_onboarding_status add value if not exists 'submitted_for_landlord_review';
alter type public.tenant_onboarding_status add value if not exists 'waitlisted';

alter table public.tenants
  add column if not exists verification_fee_paid_at timestamptz,
  add column if not exists verification_fee_intent_id uuid references public.agent_tenant_processing_fee_intents (id),
  add column if not exists onboarding_submission_timestamp timestamptz,
  add column if not exists waitlist_reason text,
  add column if not exists waitlisted_at timestamptz;

create index if not exists tenants_verification_fee_intent_idx
  on public.tenants (verification_fee_intent_id)
  where verification_fee_intent_id is not null;
