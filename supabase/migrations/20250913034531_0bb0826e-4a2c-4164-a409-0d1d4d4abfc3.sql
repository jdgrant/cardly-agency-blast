-- Create function to manually process existing paid orders and add them to batches
CREATE OR REPLACE FUNCTION public.process_existing_paid_orders(session_id_param text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  order_record RECORD;
  target_batch_id uuid;
  batch_name_pattern text;
  added_count integer := 0;
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Process all paid orders that aren't already in batches
  FOR order_record IN 
    SELECT o.id, o.mailing_window
    FROM public.orders o
    LEFT JOIN public.batch_orders bo ON o.id = bo.order_id
    WHERE o.invoice_paid = true 
    AND bo.order_id IS NULL -- Not already in a batch
  LOOP
    -- Map mailing window to batch name pattern
    CASE order_record.mailing_window
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
      VALUES (target_batch_id, order_record.id)
      ON CONFLICT (batch_id, order_id) DO NOTHING;
      
      IF FOUND THEN
        added_count := added_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN added_count;
END;
$$;