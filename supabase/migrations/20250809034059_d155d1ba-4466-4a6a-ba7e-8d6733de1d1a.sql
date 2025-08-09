-- Add message fields to orders table
ALTER TABLE public.orders 
ADD COLUMN selected_message TEXT,
ADD COLUMN custom_message TEXT;