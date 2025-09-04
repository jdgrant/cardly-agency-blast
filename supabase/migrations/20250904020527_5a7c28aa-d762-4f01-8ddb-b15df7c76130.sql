-- Function to update order with promo code and recalculated pricing
CREATE OR REPLACE FUNCTION public.apply_promocode_to_order(
  order_readable_id text,
  promo_code_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_uuid uuid;
  current_regular_price numeric;
  promo_discount_percentage numeric;
  calculated_final_price numeric;
BEGIN
  -- Find the order by readable_order_id
  SELECT o.id, o.regular_price INTO order_uuid, current_regular_price
  FROM public.orders o
  WHERE o.readable_order_id = order_readable_id;
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get promo code details
  SELECT p.discount_percentage INTO promo_discount_percentage
  FROM public.promocodes p
  WHERE p.code = promo_code_param 
    AND p.is_active = true
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (p.max_uses IS NULL OR p.current_uses < p.max_uses);
    
  IF promo_discount_percentage IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calculate new final price
  calculated_final_price := current_regular_price - (current_regular_price * (promo_discount_percentage / 100));
  
  -- Update the order with promo code and new final price
  UPDATE public.orders 
  SET 
    promo_code = promo_code_param,
    final_price = calculated_final_price,
    updated_at = now()
  WHERE id = order_uuid;
  
  -- Increment promo code usage
  UPDATE public.promocodes 
  SET 
    current_uses = current_uses + 1,
    updated_at = now()
  WHERE code = promo_code_param;
  
  RETURN true;
END;
$function$