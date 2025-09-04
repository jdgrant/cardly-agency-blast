-- Create function to update client count and recalculate pricing
CREATE OR REPLACE FUNCTION public.update_order_client_count_for_customer(short_id text, new_client_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_uuid uuid;
  tier_name text;
  postage_cost numeric;
  signature_purchased boolean;
  base_price numeric;
  final_price numeric;
BEGIN
  -- Find the order by short ID and get current data
  SELECT o.id, o.tier_name, o.postage_cost, COALESCE(o.signature_purchased, false)
  INTO order_uuid, tier_name, postage_cost, signature_purchased
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate pricing based on tier and client count
  CASE tier_name
    WHEN 'standard' THEN
      base_price := new_client_count * 2.50;
    WHEN 'premium' THEN  
      base_price := new_client_count * 3.50;
    WHEN 'luxury' THEN
      base_price := new_client_count * 4.50;
    ELSE
      base_price := new_client_count * 2.50; -- Default to standard pricing
  END CASE;
  
  -- Add signature cost if purchased
  IF signature_purchased THEN
    base_price := base_price + 25.00;
  END IF;
  
  -- Add postage cost
  final_price := base_price + COALESCE(postage_cost, 0);
  
  -- Update order with new count and pricing
  UPDATE public.orders 
  SET 
    client_count = new_client_count,
    card_quantity = new_client_count,
    regular_price = base_price,
    final_price = final_price,
    updated_at = now() 
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;