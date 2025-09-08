-- Create function to get client records for a specific order with admin session validation
CREATE OR REPLACE FUNCTION public.get_clients_for_order(order_id_param uuid, session_id_param text)
RETURNS TABLE(
  id uuid,
  order_id uuid,
  first_name text,
  last_name text,
  address text,
  city text,
  state text,
  zip text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if the session_id exists and is valid for admin access
    IF NOT EXISTS (
        SELECT 1 FROM admin_sessions 
        WHERE session_id = session_id_param AND value = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin session';
    END IF;

    -- Return client records for the specific order
    RETURN QUERY
    SELECT 
        cr.id,
        cr.order_id,
        cr.first_name,
        cr.last_name,
        cr.address,
        cr.city,
        cr.state,
        cr.zip,
        cr.created_at
    FROM client_records cr
    WHERE cr.order_id = order_id_param
    ORDER BY cr.created_at ASC;
END;
$function$