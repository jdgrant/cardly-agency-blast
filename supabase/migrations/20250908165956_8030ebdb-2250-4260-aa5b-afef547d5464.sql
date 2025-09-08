-- Check and fix RLS policies for orders table updates
-- Add policy for admin updates
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;

CREATE POLICY "Admin can update orders" ON public.orders
FOR UPDATE USING (is_admin_user());