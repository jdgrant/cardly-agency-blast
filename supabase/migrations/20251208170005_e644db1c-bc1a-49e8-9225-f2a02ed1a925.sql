-- Update calculate_drop_date to handle null/default case
CREATE OR REPLACE FUNCTION public.calculate_drop_date(mailing_window_param text, year_param integer DEFAULT NULL::integer)
 RETURNS date
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  target_year integer;
  drop_date_result date;
BEGIN
  -- Use current year if not specified
  target_year := COALESCE(year_param, EXTRACT(YEAR FROM NOW())::integer);
  
  -- If mailing window is null or empty, default to 2 days from now
  IF mailing_window_param IS NULL OR mailing_window_param = '' THEN
    RETURN (NOW() + interval '2 days')::date;
  END IF;
  
  -- Calculate drop date based on mailing window (2 days before first date)
  CASE mailing_window_param
    WHEN 'dec-1-5' THEN
      drop_date_result := (target_year || '-11-29')::date;
    WHEN 'dec-6-10' THEN  
      drop_date_result := (target_year || '-12-04')::date;
    WHEN 'dec-11-15' THEN
      drop_date_result := (target_year || '-12-09')::date;
    WHEN 'dec-16-20' THEN
      drop_date_result := (target_year || '-12-14')::date;
    WHEN 'dec-21-24' THEN
      drop_date_result := (target_year || '-12-19')::date;
    ELSE
      -- Default to 2 days from now
      drop_date_result := (NOW() + interval '2 days')::date;
  END CASE;
  
  RETURN drop_date_result;
END;
$function$;

-- Update auto_add_order_to_batch trigger to handle dec-21-24
CREATE OR REPLACE FUNCTION public.auto_add_order_to_batch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
      WHEN 'dec-21-24' THEN
        batch_name_pattern := 'December 21-24 Batch';
      ELSE
        -- Default to December 21-24 if no match
        batch_name_pattern := 'December 21-24 Batch';
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
      
      RAISE NOTICE 'Order % automatically added to batch %', NEW.id, batch_name_pattern;
    ELSE
      RAISE NOTICE 'No suitable batch found for order % with mailing window %', NEW.id, NEW.mailing_window;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;