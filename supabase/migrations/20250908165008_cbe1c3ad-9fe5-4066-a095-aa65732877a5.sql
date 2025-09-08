-- Create function to update return address for admin
CREATE OR REPLACE FUNCTION public.update_admin_return_address(
  session_id_param text,
  order_id_param uuid,
  return_name text DEFAULT NULL,
  return_line1 text DEFAULT NULL,
  return_line2 text DEFAULT NULL,
  return_city text DEFAULT NULL,
  return_state text DEFAULT NULL,
  return_zip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify admin session
    IF NOT public.set_and_check_admin_session(session_id_param) THEN
        RAISE EXCEPTION 'Invalid admin session';
    END IF;
    
    -- Update return address fields
    UPDATE public.orders 
    SET 
        return_address_name = return_name,
        return_address_line1 = return_line1,
        return_address_line2 = return_line2,
        return_address_city = return_city,
        return_address_state = return_state,
        return_address_zip = return_zip,
        updated_at = now()
    WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
END;
$function$