-- Allow public to update templates (for admin functionality)
CREATE POLICY "Public can update templates" 
ON public.templates 
FOR UPDATE 
USING (true);