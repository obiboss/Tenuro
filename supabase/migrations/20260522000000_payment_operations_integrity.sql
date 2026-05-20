-- Batch 9: Payment operations integrity (idempotency + duplicate protection)
-- Targets the live application schema (paystack_reference, gateway_payment_intent_id, etc.)

-- One Paystack reference per gateway payment intent
create unique index if not exists gateway_payment_intents_paystack_reference_uidx
  on public.gateway_payment_intents (paystack_reference)
  where paystack_reference is not null;

-- Prevent duplicate webhook event processing (per provider, event type, and reference)
create unique index if not exists gateway_payment_events_provider_event_reference_uidx
  on public.gateway_payment_events (
    provider,
    event_type,
    payment_reference
  );

-- Prevent duplicate allocations per recipient per intent
create unique index if not exists payment_allocations_intent_recipient_uidx
  on public.payment_allocations (
    gateway_payment_intent_id,
    recipient_type
  )
  where gateway_payment_intent_id is not null;

-- Prevent duplicate Paystack rent payment records
create unique index if not exists rent_payments_paystack_gateway_reference_uidx
  on public.rent_payments (payment_reference)
  where payment_method = 'paystack_gateway'
    and payment_reference is not null;
