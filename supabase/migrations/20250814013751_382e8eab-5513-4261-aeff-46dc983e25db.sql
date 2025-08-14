-- Fix RLS policy issue for admin_sessions table
-- Since admin_sessions should never be directly accessible, we create a restrictive policy that denies all access

-- Create a deny-all policy for admin_sessions table
-- This satisfies the RLS requirement while ensuring complete security
CREATE POLICY "Deny all direct access to admin_sessions" 
ON public.admin_sessions 
FOR ALL
USING (false)
WITH CHECK (false);

-- The table can only be accessed through the secure SECURITY DEFINER functions