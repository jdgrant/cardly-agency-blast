-- Update existing orders with null contact information to have dummy data
UPDATE public.orders 
SET 
    contact_firstname = 'John',
    contact_lastname = 'Doe', 
    contact_email = 'customer@example.com',
    contact_phone = '(555) 123-4567',
    billing_address = '123 Main St, Anytown, ST 12345'
WHERE 
    contact_firstname IS NULL 
    OR contact_lastname IS NULL 
    OR contact_email IS NULL 
    OR contact_phone IS NULL 
    OR billing_address IS NULL;