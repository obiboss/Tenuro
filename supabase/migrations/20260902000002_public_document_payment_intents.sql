begin;

create table if not exists public.public_document_payment_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  identity_fingerprint text not null,
  package_identifier text not null check (package_identifier in ('receipt', 'tenancy_agreement')),
  expected_amount_kobo integer not null check (expected_amount_kobo > 0),
  expected_currency text not null default 'NGN' check (expected_currency = 'NGN'),
  credit_count integer not null check (credit_count > 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_document_payment_intents_fingerprint_created_idx
  on public.public_document_payment_intents (identity_fingerprint, created_at desc);

alter table public.public_document_payment_intents enable row level security;
alter table public.public_document_payment_intents force row level security;
revoke all on table public.public_document_payment_intents from anon, authenticated;
grant all on table public.public_document_payment_intents to service_role;

commit;
