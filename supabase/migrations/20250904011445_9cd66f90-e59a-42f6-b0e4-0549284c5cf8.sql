-- Update pricing calculation functions to use volume-based pricing instead of fixed tier rates
CREATE OR REPLACE FUNCTION public.update_order_client_count_for_customer(short_id text, new_client_count integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_uuid uuid;
  order_postage_cost numeric;
  order_signature_purchased boolean;
  calculated_base_price numeric;
  calculated_final_price numeric;
  per_card_price numeric;
BEGIN
  -- Find the order by short ID and get current data
  SELECT o.id, o.postage_cost, COALESCE(o.signature_purchased, false)
  INTO order_uuid, order_postage_cost, order_signature_purchased
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate per-card price based on volume (early bird pricing)
  CASE 
    WHEN new_client_count <= 250 THEN
      per_card_price := 3.00; -- No sale for 0-250
    WHEN new_client_count <= 500 THEN
      per_card_price := 2.55; -- Sale price for 250-500
    WHEN new_client_count <= 1000 THEN
      per_card_price := 2.13; -- Sale price for 500-1000
    WHEN new_client_count >= 2000 THEN
      per_card_price := 1.91; -- Sale price for 2000+
    ELSE
      per_card_price := 2.50; -- Default fallback
  END CASE;
  
  -- Calculate base price
  calculated_base_price := new_client_count * per_card_price;
  
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