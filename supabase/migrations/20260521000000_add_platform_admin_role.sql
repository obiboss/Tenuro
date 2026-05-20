-- =====================================================================
-- Add `platform_admin` value to the user_role enum
-- =====================================================================
--
-- Kept in its own migration on purpose. PostgreSQL does not allow a
-- newly added enum value to be referenced inside the same transaction
-- it is added in, so the function and policies that reference
-- `platform_admin` must live in a follow-up migration that runs after
-- this one has committed.
--
-- See `20260521000001_platform_admin_foundation.sql` for the helper
-- function and admin-side RLS policies.
-- =====================================================================

alter type public.user_role
  add value if not exists 'platform_admin';
