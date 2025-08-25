-- Remove the redundant "Deny public access to orders" SELECT policy
-- This policy conflicts with the admin policy and creates confusion
DROP POLICY IF EXISTS "Deny public access to orders" ON public.orders;

-- The remaining admin policies are sufficient:
-- - "Admin can view all orders" (SELECT) - allows is_admin_user()
-- - "Admin can update orders" (UPDATE) - allows is_admin_user() 
-- - "Admin can delete orders" (DELETE) - allows is_admin_user()
-- - "Secure order creation only" (INSERT) - prevents direct inserts, forces use of secure functions

-- Ensure the is_admin_user function is secure and robust
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT value::boolean 
     FROM public.admin_sessions 
     WHERE session_id = current_setting('app.admin_session_id', true)
     AND created_at > now() - interval '24 hours' 
     AND value = true), -- Explicitly check for true
    false
  );
$$;