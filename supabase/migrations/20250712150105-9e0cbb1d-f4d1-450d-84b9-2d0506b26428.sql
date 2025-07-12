-- Add readable order ID field to orders table
ALTER TABLE public.orders 
ADD COLUMN readable_order_id TEXT UNIQUE;

-- Create function to generate readable order ID
CREATE OR REPLACE FUNCTION generate_readable_order_id(uuid_val UUID)
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    uuid_suffix TEXT;
BEGIN
    -- Get current date in MMDDYYYY format
    date_part := to_char(NOW(), 'MMDDYYYY');
    
    -- Get last 5 characters of UUID (removing hyphens)
    uuid_suffix := RIGHT(REPLACE(uuid_val::TEXT, '-', ''), 5);
    
    -- Return formatted order ID
    RETURN date_part || '-' || uuid_suffix;
END;
$$ LANGUAGE plpgsql;

-- Update existing orders with readable order IDs (if any)
UPDATE public.orders 
SET readable_order_id = generate_readable_order_id(id)
WHERE readable_order_id IS NULL;