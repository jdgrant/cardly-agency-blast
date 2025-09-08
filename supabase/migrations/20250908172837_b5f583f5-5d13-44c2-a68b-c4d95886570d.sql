-- Update the orders status check constraint to include all valid status values
ALTER TABLE public.orders 
DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'blocked'::text, 'approved'::text, 'send_to_print'::text, 'sent_to_press'::text, 'sent'::text]));