/*
# Restrict private conversation function execution

1. Purpose
- Remove the database-wide default EXECUTE permission from the private conversation creation function.

2. Security changes
- Anonymous and public callers can no longer execute `create_private_conversation`.
- Authenticated signed-in users retain EXECUTE permission.
- The function continues to enforce the caller identity internally.

3. Data safety
- No existing rows, columns, or tables are changed.
*/

REVOKE EXECUTE ON FUNCTION public.create_private_conversation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_private_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_private_conversation(uuid) TO authenticated;