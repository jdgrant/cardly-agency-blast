-- Create function to reset client list for an order
CREATE OR REPLACE FUNCTION public.reset_order_client_list(order_readable_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_uuid uuid;
BEGIN
  -- Find the order by readable_order_id
  SELECT o.id INTO order_uuid
  FROM public.orders o
  WHERE o.readable_order_id = order_readable_id;
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete all client records for this order
  DELETE FROM public.client_records WHERE order_id = order_uuid;
  
  -- Reset the order's CSV file URL and client count
  UPDATE public.orders 
  SET 
    csv_file_url = NULL,
    client_count = 0,
    updated_at = now()
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;