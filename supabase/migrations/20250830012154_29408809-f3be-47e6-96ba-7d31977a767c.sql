-- Add cropped signature URL field to orders table
ALTER TABLE public.orders ADD COLUMN cropped_signature_url text;