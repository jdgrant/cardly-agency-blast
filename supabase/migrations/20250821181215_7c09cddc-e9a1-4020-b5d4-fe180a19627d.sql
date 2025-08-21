-- Fill blank contact information with "Dummy" values for existing orders
UPDATE public.orders 
SET 
  contact_name = COALESCE(NULLIF(contact_name, ''), 'Dummy'),
  contact_email = COALESCE(NULLIF(contact_email, ''), 'dummy@example.com'),
  contact_phone = COALESCE(NULLIF(contact_phone, ''), '555-0123'),
  billing_address = COALESCE(NULLIF(billing_address, ''), '123 Dummy Street, Dummy City, DC 12345')
WHERE 
  contact_name IS NULL OR contact_name = '' OR
  contact_email IS NULL OR contact_email = '' OR
  contact_phone IS NULL OR contact_phone = '' OR
  billing_address IS NULL OR billing_address = '';