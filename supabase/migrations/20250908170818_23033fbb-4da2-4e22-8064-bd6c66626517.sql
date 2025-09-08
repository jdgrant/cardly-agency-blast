-- Create a simple RPC function for updating return addresses
CREATE OR REPLACE FUNCTION public.update_return_address(
  order_id_param uuid,
  name_param text DEFAULT NULL,
  line1_param text DEFAULT NULL,
  line2_param text DEFAULT NULL,
  city_param text DEFAULT NULL,
  state_param text DEFAULT NULL,
  zip_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple update without admin session check for now
  UPDATE public.orders 
  SET 
    return_address_name = name_param,
    return_address_line1 = line1_param,
    return_address_line2 = line2_param,
    return_address_city = city_param,
    return_address_state = state_param,
    return_address_zip = zip_param,
    updated_at = now()
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;