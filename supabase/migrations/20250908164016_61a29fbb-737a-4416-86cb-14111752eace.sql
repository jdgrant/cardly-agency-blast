-- Add "sent_to_press" status to the order_status enum
ALTER TYPE order_status ADD VALUE 'sent_to_press';

-- Add PCM order ID field to orders table
ALTER TABLE public.orders ADD COLUMN pcm_order_id text;
ALTER TABLE public.orders ADD COLUMN pcm_batch_id integer;