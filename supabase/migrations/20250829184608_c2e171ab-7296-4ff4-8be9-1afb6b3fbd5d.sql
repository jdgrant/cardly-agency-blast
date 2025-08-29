-- Update final_price to $25 for order 08232025-3a9d0
UPDATE public.orders 
SET final_price = 25.00, updated_at = now() 
WHERE id = 'dc09a0d3-cc62-43f3-89c2-ecc3ae13a9d0';