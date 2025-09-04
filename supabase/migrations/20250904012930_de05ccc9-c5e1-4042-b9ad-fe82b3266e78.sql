-- Create a 95% off promo code for testing
INSERT INTO public.promocodes (code, discount_percentage, is_active, max_uses, current_uses, expires_at)
VALUES ('TEST95', 95.00, true, 100, 0, '2025-12-31 23:59:59'::timestamp)
ON CONFLICT (code) DO UPDATE SET
  discount_percentage = 95.00,
  is_active = true,
  max_uses = 100,
  expires_at = '2025-12-31 23:59:59'::timestamp;