-- Fix variable naming collision in update_order_client_count_for_customer function
CREATE OR REPLACE FUNCTION public.update_order_client_count_for_customer(short_id text, new_client_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_uuid uuid;
  order_tier_name text;
  order_postage_cost numeric;
  order_signature_purchased boolean;
  calculated_base_price numeric;
  calculated_final_price numeric;
BEGIN
  -- Find the order by short ID and get current data
  SELECT o.id, o.tier_name, o.postage_cost, COALESCE(o.signature_purchased, false)
  INTO order_uuid, order_tier_name, order_postage_cost, order_signature_purchased
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate pricing based on tier and client count
  CASE order_tier_name
    WHEN 'standard' THEN
      calculated_base_price := new_client_count * 2.50;
    WHEN 'premium' THEN  
      calculated_base_price := new_client_count * 3.50;
    WHEN 'luxury' THEN
      calculated_base_price := new_client_count * 4.50;
    ELSE
      calculated_base_price := new_client_count * 2.50; -- Default to standard pricing
  END CASE;
  
  -- Add signature cost if purchased
  IF order_signature_purchased THEN
    calculated_base_price := calculated_base_price + 25.00;
  END IF;
  
  -- Add postage cost
  calculated_final_price := calculated_base_price + COALESCE(order_postage_cost, 0);
  
  -- Update order with new count and pricing
  UPDATE public.orders 
  SET 
    client_count = new_client_count,
    card_quantity = new_client_count,
    regular_price = calculated_base_price,
    final_price = calculated_final_price,
    updated_at = now() 
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;