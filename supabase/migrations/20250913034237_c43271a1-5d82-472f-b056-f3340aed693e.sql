-- Create function to automatically add orders to batches when paid
CREATE OR REPLACE FUNCTION public.auto_add_order_to_batch()
RETURNS TRIGGER AS $$
DECLARE
  target_batch_id uuid;
  batch_name_pattern text;
BEGIN
  -- Only process when invoice_paid changes from false to true
  IF OLD.invoice_paid = false AND NEW.invoice_paid = true THEN
    
    -- Map mailing window to batch name pattern
    CASE NEW.mailing_window
      WHEN 'dec-1-5' THEN
        batch_name_pattern := 'December 1-5 Batch';
      WHEN 'dec-6-10' THEN
        batch_name_pattern := 'December 6-10 Batch';
      WHEN 'dec-11-15' THEN
        batch_name_pattern := 'December 11-15 Batch';
      WHEN 'dec-16-20' THEN
        batch_name_pattern := 'December 16-20 Batch';
      ELSE
        -- Default to December 1-5 if no match
        batch_name_pattern := 'December 1-5 Batch';
    END CASE;
    
    -- Find the matching batch
    SELECT id INTO target_batch_id
    FROM public.batches
    WHERE name = batch_name_pattern
    AND status = 'pending'
    LIMIT 1;
    
    -- Add order to batch if batch exists
    IF target_batch_id IS NOT NULL THEN
      INSERT INTO public.batch_orders (batch_id, order_id)
      VALUES (target_batch_id, NEW.id)
      ON CONFLICT (batch_id, order_id) DO NOTHING;
      
      -- Log the addition
      RAISE NOTICE 'Order % automatically added to batch %', NEW.id, batch_name_pattern;
    ELSE
      -- Log if no suitable batch found
      RAISE NOTICE 'No suitable batch found for order % with mailing window %', NEW.id, NEW.mailing_window;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;