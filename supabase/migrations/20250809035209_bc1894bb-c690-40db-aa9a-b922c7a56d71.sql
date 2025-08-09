-- Update the classic-red template with a proper red and green Christmas image
UPDATE public.templates 
SET preview_url = 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=300&h=400&fit=crop&q=80'
WHERE id = 'classic-red';