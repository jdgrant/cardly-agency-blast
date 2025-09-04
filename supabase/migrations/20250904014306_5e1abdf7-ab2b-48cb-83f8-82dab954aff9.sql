-- Add promo_code field to orders table to track applied promotional codes
ALTER TABLE public.orders 
ADD COLUMN promo_code TEXT;

-- Add index for better query performance
CREATE INDEX idx_orders_promo_code ON public.orders(promo_code);