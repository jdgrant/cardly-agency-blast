-- Add the missing template-1 that the order is referencing
INSERT INTO public.templates (id, name, preview_url, description) 
VALUES (
  'template-1', 
  'Holiday Classic',
  'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=300&h=400&fit=crop',
  'Classic holiday design with festive elements'
);