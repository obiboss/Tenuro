-- Backfill legacy profile_complete rows to submitted_for_landlord_review.
-- Runs in a separate migration so new enum values are committed before use.

update public.tenants
set
  onboarding_status = 'submitted_for_landlord_review',
  onboarding_submission_timestamp = coalesce(
    onboarding_submission_timestamp,
    onboarding_token_used_at,
    updated_at
  )
where onboarding_status = 'profile_complete';
