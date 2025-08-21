-- Create admin function to update order status fields
CREATE OR REPLACE FUNCTION public.update_admin_order_status_fields(
    session_id_param text,
    order_id_param uuid,
    field_name text,
    field_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
    -- Verify admin session
    IF NOT public.set_and_check_admin_session(session_id_param) THEN
        RAISE EXCEPTION 'Invalid admin session';
    END IF;
    
    -- Update the specific field based on field_name
    CASE field_name
        WHEN 'signature_purchased' THEN
            UPDATE public.orders SET signature_purchased = field_value WHERE id = order_id_param;
        WHEN 'signature_submitted' THEN
            UPDATE public.orders SET signature_submitted = field_value WHERE id = order_id_param;
        WHEN 'mailing_list_uploaded' THEN
            UPDATE public.orders SET mailing_list_uploaded = field_value WHERE id = order_id_param;
        WHEN 'logo_uploaded' THEN
            UPDATE public.orders SET logo_uploaded = field_value WHERE id = order_id_param;
        WHEN 'invoice_paid' THEN
            UPDATE public.orders SET invoice_paid = field_value WHERE id = order_id_param;
        ELSE
            RAISE EXCEPTION 'Invalid field name: %', field_name;
    END CASE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Update the updated_at timestamp
    UPDATE public.orders SET updated_at = now() WHERE id = order_id_param;
END;
$$;