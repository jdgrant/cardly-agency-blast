-- Replace contact_name with contact_firstname and contact_lastname
ALTER TABLE public.orders DROP COLUMN IF EXISTS contact_name;
ALTER TABLE public.orders ADD COLUMN contact_firstname text;
ALTER TABLE public.orders ADD COLUMN contact_lastname text;

-- Update existing records to split "Dummy" into first and last name
UPDATE public.orders 
SET 
  contact_firstname = 'Dummy',
  contact_lastname = 'Customer'
WHERE contact_firstname IS NULL;