-- Create admin function to clear signature data for testing
CREATE OR REPLACE FUNCTION public.clear_order_signatures(session_id_param text, order_id_param uuid)
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
    
    -- Clear all signature related fields
    UPDATE public.orders 
    SET 
        signature_url = NULL,
        cropped_signature_url = NULL,
        signature_needs_review = false,
        updated_at = now()
    WHERE id = order_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
END;
$function$;