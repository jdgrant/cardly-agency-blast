-- CRITICAL SECURITY FIX: Remove public access to admin_sessions table

-- Drop the dangerous public SELECT policy that allows anyone to read admin sessions
DROP POLICY IF EXISTS "Allow reading admin sessions" ON public.admin_sessions;

-- Update the is_admin_user function to include session expiry
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
$function$;