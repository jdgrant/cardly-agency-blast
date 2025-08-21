-- Create admin function to get client records for orders
CREATE OR REPLACE FUNCTION get_admin_clients_for_orders(session_id_param text)
RETURNS TABLE (
    order_id uuid,
    first_name text,
    last_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Check if the session_id exists and is valid for admin access
    IF NOT EXISTS (
        SELECT 1 FROM admin_sessions 
        WHERE session_id = session_id_param AND value = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid admin session';
    END IF;

    -- Return first client record for each order (for customer name display)
    RETURN QUERY
    SELECT DISTINCT ON (cr.order_id)
        cr.order_id,
        cr.first_name,
        cr.last_name
    FROM client_records cr
    WHERE cr.order_id IS NOT NULL
    ORDER BY cr.order_id, cr.created_at ASC;
END;
$$;