-- CRITICAL SECURITY FIX: Remove public access to admin_sessions table

-- Drop the dangerous public SELECT policy that allows anyone to read admin sessions
DROP POLICY IF EXISTS "Allow reading admin sessions" ON public.admin_sessions;

-- The admin_sessions table should only be accessible by the database functions themselves
-- No external access should be allowed to prevent security bypass attempts

-- Update the is_admin_user function to use a more secure approach
-- This function can access admin_sessions because it runs with SECURITY DEFINER privileges
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT value::boolean 
     FROM public.admin_sessions 
     WHERE session_id = current_setting('app.admin_session_id', true)
     AND created_at > now() - interval '24 hours'), -- Session expires after 24 hours
    false
  );
$function$

-- Update the set_admin_session function to handle session expiry
CREATE OR REPLACE FUNCTION public.set_admin_session(session_id text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Clean up old sessions first (older than 24 hours)
  DELETE FROM public.admin_sessions 
  WHERE created_at < now() - interval '24 hours';
  
  -- Insert or update the new session
  INSERT INTO public.admin_sessions (session_id, value) 
  VALUES (session_id, true)
  ON CONFLICT (session_id) 
  DO UPDATE SET value = true, created_at = now();
$function$

-- Add a function to clear admin sessions (for logout)
CREATE OR REPLACE FUNCTION public.clear_admin_session(session_id text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.admin_sessions 
  WHERE session_id = clear_admin_session.session_id;
$function$

-- Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_admin_session TO anon, authenticated;