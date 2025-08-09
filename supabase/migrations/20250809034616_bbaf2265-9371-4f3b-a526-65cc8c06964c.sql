-- Update the order to reference the correct template ID
UPDATE public.orders 
SET template_id = 'classic-red'
WHERE id = 'da50c3dc-a92e-4653-bb8d-b0328a526925';

-- Remove the incorrect template-1 that was added
DELETE FROM public.templates WHERE id = 'template-1';