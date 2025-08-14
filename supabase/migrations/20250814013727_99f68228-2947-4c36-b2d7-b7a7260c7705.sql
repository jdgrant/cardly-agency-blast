-- Add remaining secure functions for admin session management

-- Update set_admin_session function to handle session expiry and cleanup
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
$function$;

-- Add a function to clear admin sessions (for logout)
CREATE OR REPLACE FUNCTION public.clear_admin_session(session_id text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.admin_sessions 
  WHERE session_id = clear_admin_session.session_id;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_admin_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_admin_session TO anon, authenticated;