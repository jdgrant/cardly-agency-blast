-- Add status tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signature_purchased boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signature_submitted boolean DEFAULT false;  
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mailing_list_uploaded boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logo_uploaded boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_paid boolean DEFAULT false;

-- Update existing orders to set logo_uploaded to true if they have a logo_url
UPDATE public.orders SET logo_uploaded = true WHERE logo_url IS NOT NULL AND logo_url != '';

-- Update existing orders to set mailing_list_uploaded to true if they have a csv_file_url  
UPDATE public.orders SET mailing_list_uploaded = true WHERE csv_file_url IS NOT NULL AND csv_file_url != '';

-- Update existing orders to set signature_purchased to true if they have a signature_url
UPDATE public.orders SET signature_purchased = true WHERE signature_url IS NOT NULL AND signature_url != '';

-- Update existing orders to set signature_submitted to true if they have a signature_url (assuming if uploaded, it's submitted)
UPDATE public.orders SET signature_submitted = true WHERE signature_url IS NOT NULL AND signature_url != '';