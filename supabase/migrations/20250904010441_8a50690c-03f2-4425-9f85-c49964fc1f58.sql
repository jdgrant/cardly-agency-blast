-- Create function to completely reset an order (client list, pricing, and signature upgrade)
CREATE OR REPLACE FUNCTION public.reset_order_completely(order_readable_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_uuid uuid;
  order_tier_name text;
  order_postage_cost numeric;
  base_price numeric;
  final_price numeric;
BEGIN
  -- Find the order by readable_order_id and get tier info
  SELECT o.id, o.tier_name, o.postage_cost
  INTO order_uuid, order_tier_name, order_postage_cost
  FROM public.orders o
  WHERE o.readable_order_id = order_readable_id;
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delete all client records for this order
  DELETE FROM public.client_records WHERE order_id = order_uuid;
  
  -- Calculate base pricing without signature upgrade (0 clients)
  CASE order_tier_name
    WHEN 'standard' THEN
      base_price := 0 * 2.50;
    WHEN 'premium' THEN  
      base_price := 0 * 3.50;
    WHEN 'luxury' THEN
      base_price := 0 * 4.50;
    ELSE
      base_price := 0 * 2.50; -- Default to standard pricing
  END CASE;
  
  -- Calculate final price with postage but no signature upgrade
  final_price := base_price + COALESCE(order_postage_cost, 0);
  
  -- Reset the order completely
  UPDATE public.orders 
  SET 
    csv_file_url = NULL,
    client_count = 0,
    card_quantity = 0,
    signature_purchased = false,
    signature_url = NULL,
    cropped_signature_url = NULL,
    regular_price = base_price,
    final_price = final_price,
    updated_at = now()
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;