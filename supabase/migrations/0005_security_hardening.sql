-- 0005_security_hardening.sql
-- Address security advisor warnings from the initial setup.

-- handle_new_user is a trigger function (SECURITY DEFINER) and must not be
-- callable directly via the REST RPC endpoint. Triggers run as the table owner
-- regardless of these grants, so revoking EXECUTE does not affect signup.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Note: the advisor also flags pg_net living in the `public` schema. pg_net is
-- not relocatable (no SET SCHEMA support) and is unused until Phase 3, so it is
-- left as-is for now.
