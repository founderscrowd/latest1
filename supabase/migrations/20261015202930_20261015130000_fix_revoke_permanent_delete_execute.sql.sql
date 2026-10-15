/*
# Fix: Revoke execute on permanently_delete_expired_groups from all roles

The previous migration tried REVOKE but the function still had EXECUTE grants
inherited from default privileges. This migration explicitly revokes from
anon, authenticated, and also restricts the function to be callable only
by the postgres superuser and pg_cron scheduler.
*/

REVOKE EXECUTE ON FUNCTION public.permanently_delete_expired_groups() FROM anon, authenticated, public;

-- Also revoke from any other roles that might have default grants
REVOKE EXECUTE ON FUNCTION public.permanently_delete_expired_groups() FROM anon;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_expired_groups() FROM authenticated;
