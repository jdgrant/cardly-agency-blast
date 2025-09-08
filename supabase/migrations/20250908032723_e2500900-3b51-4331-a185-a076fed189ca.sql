-- Add return address fields to orders table
ALTER TABLE public.orders ADD COLUMN return_address_name text;
ALTER TABLE public.orders ADD COLUMN return_address_line1 text;
ALTER TABLE public.orders ADD COLUMN return_address_line2 text;
ALTER TABLE public.orders ADD COLUMN return_address_city text;
ALTER TABLE public.orders ADD COLUMN return_address_state text;
ALTER TABLE public.orders ADD COLUMN return_address_zip text;