-- Add drop_date column to orders table
ALTER TABLE public.orders ADD COLUMN drop_date DATE;

-- Create function to calculate drop date from mailing window
CREATE OR REPLACE FUNCTION public.calculate_drop_date(mailing_window_param text, year_param integer DEFAULT NULL)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  target_year integer;
  drop_date_result date;
BEGIN
  -- Use current year if not specified
  target_year := COALESCE(year_param, EXTRACT(YEAR FROM NOW())::integer);
  
  -- Calculate drop date based on mailing window (2 days before first date)
  CASE mailing_window_param
    WHEN 'dec-1-5' THEN
      drop_date_result := (target_year || '-11-29')::date;  -- 2 days before Dec 1
    WHEN 'dec-6-10' THEN  
      drop_date_result := (target_year || '-12-04')::date;  -- 2 days before Dec 6
    WHEN 'dec-11-15' THEN
      drop_date_result := (target_year || '-12-09')::date;  -- 2 days before Dec 11
    WHEN 'dec-16-20' THEN
      drop_date_result := (target_year || '-12-14')::date;  -- 2 days before Dec 16
    ELSE
      -- Default fallback - assume Dec 1-5 window
      drop_date_result := (target_year || '-11-29')::date;
  END CASE;
  
  RETURN drop_date_result;
END;
$$;

-- Update all existing orders with calculated drop dates
UPDATE public.orders 
SET drop_date = public.calculate_drop_date(mailing_window)
WHERE drop_date IS NULL AND mailing_window IS NOT NULL;

-- Create trigger to automatically set drop_date for new orders
CREATE OR REPLACE FUNCTION public.set_order_drop_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Calculate and set drop_date if not already provided
  IF NEW.drop_date IS NULL AND NEW.mailing_window IS NOT NULL THEN
    NEW.drop_date := public.calculate_drop_date(NEW.mailing_window);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS trigger_set_order_drop_date ON public.orders;
CREATE TRIGGER trigger_set_order_drop_date
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_drop_date();

-- Create trigger for UPDATE operations when mailing_window changes
CREATE OR REPLACE FUNCTION public.update_order_drop_date()
RETURNS TRIGGER
LANGUAGE plpgsql  
SET search_path TO 'public'
AS $$
BEGIN
  -- Update drop_date if mailing_window changed and drop_date wasn't manually set
  IF NEW.mailing_window != OLD.mailing_window THEN
    NEW.drop_date := public.calculate_drop_date(NEW.mailing_window);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_order_drop_date
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.mailing_window IS DISTINCT FROM NEW.mailing_window)
  EXECUTE FUNCTION public.update_order_drop_date();

-- Add function to update drop date manually (admin use)
CREATE OR REPLACE FUNCTION public.update_order_drop_date_admin(
  session_id_param text, 
  order_id_param uuid, 
  new_drop_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Update the drop date
  UPDATE public.orders 
  SET drop_date = new_drop_date, updated_at = now()
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;