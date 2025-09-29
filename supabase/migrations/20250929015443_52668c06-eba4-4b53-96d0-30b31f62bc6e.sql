-- Create function to allow admins to update postage option safely
CREATE OR REPLACE FUNCTION public.update_admin_postage_option(
  session_id_param text,
  order_id_param uuid,
  new_postage_option text
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

  -- Validate allowed values
  IF new_postage_option IS NULL OR new_postage_option NOT IN ('standard', 'first-class') THEN
    RAISE EXCEPTION 'Invalid postage option';
  END IF;

  -- Update the order's postage option
  UPDATE public.orders 
  SET 
    postage_option = new_postage_option,
    updated_at = now()
  WHERE id = order_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$function$;