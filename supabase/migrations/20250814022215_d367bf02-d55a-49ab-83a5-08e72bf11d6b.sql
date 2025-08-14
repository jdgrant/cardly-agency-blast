-- Create a function that sets session variable and returns admin status
CREATE OR REPLACE FUNCTION public.set_and_check_admin_session(session_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Set the session variable for this connection
  PERFORM set_config('app.admin_session_id', session_id_param, true);
  
  -- Check if this session is valid
  RETURN COALESCE(
    (SELECT value::boolean 
     FROM public.admin_sessions 
     WHERE session_id = session_id_param
     AND created_at > now() - interval '24 hours'),
    false
  );
END;
$function$;

-- Create admin-specific order access function
CREATE OR REPLACE FUNCTION public.get_admin_orders(session_id_param text)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Return all orders for admin
  RETURN QUERY SELECT * FROM public.orders ORDER BY created_at DESC;
END;
$function$;