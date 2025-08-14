-- Fix public access to sensitive customer and order data
-- Add explicit deny policies for public SELECT access

-- Ensure orders table has explicit public SELECT denial
DROP POLICY IF EXISTS "Deny public access to orders" ON public.orders;
CREATE POLICY "Deny public access to orders" 
ON public.orders 
FOR SELECT 
USING (false);

-- Ensure client_records table has explicit public SELECT denial  
DROP POLICY IF EXISTS "Deny public access to client records" ON public.client_records;
CREATE POLICY "Deny public access to client records" 
ON public.client_records 
FOR SELECT 
USING (false);

-- Update admin policies to be more explicit and take precedence
DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
CREATE POLICY "Admin can view all orders" 
ON public.orders 
FOR SELECT 
USING (is_admin_user());

DROP POLICY IF EXISTS "Admin can view client records" ON public.client_records;
CREATE POLICY "Admin can view client records" 
ON public.client_records 
FOR SELECT 
USING (is_admin_user());