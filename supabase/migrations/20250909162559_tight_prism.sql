-- Fix infinite recursion in user_presence RLS policy
-- This migration fixes the circular dependency between user_presence and conversation_participants tables

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view presence of conversation participants" ON public.user_presence;

-- Create a simpler policy that doesn't cause recursion
-- Users can view presence of all authenticated users (simpler approach)
CREATE POLICY "Authenticated users can view all presence" ON public.user_presence
FOR SELECT USING (auth.role() = 'authenticated');

-- Alternative: If you want more restrictive access, you can use this policy instead
-- But it requires careful implementation to avoid recursion
-- CREATE POLICY "Users can view presence of conversation participants" ON public.user_presence
-- FOR SELECT USING (
--     user_id = auth.uid() OR
--     EXISTS (
--         SELECT 1 FROM public.group_members gm1
--         JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
--         WHERE gm1.user_id = auth.uid() 
--         AND gm2.user_id = user_presence.user_id
--         AND gm1.status = 'approved' 
--         AND gm2.status = 'approved'
--     )
-- );