-- Add status column to orders table if it doesn't exist
-- Update default status to 'pending'
-- Add other status options: blocked, approved, sent
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create an enum for order status to ensure data consistency
CREATE TYPE public.order_status AS ENUM ('pending', 'blocked', 'approved', 'sent');

-- Add constraint to ensure status uses valid values
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'blocked', 'approved', 'sent'));