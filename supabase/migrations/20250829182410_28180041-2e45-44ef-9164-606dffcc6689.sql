-- Add signature review tracking field to orders table
ALTER TABLE public.orders 
ADD COLUMN signature_needs_review boolean DEFAULT false;