-- Add explicit deny policy for public access to orders table
-- This ensures customer personal information and order data is protected
CREATE POLICY "Deny public access to orders" 
ON public.orders 
FOR SELECT 
USING (false);

-- This policy explicitly denies all public SELECT access to orders table
-- Only the existing "Admin can view all orders" policy will allow access via is_admin_user()