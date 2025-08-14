-- Fix templates table security - restrict updates to admin users only
DROP POLICY IF EXISTS "Public can update templates" ON public.templates;

-- Create new admin-only update policy for templates
CREATE POLICY "Admin can update templates" 
ON public.templates 
FOR UPDATE 
USING (is_admin_user());