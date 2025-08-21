-- Add customer information fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_address text;