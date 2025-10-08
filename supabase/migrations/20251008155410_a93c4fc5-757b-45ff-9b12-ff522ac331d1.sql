-- Create a function to allow customers to update their order status (cancel/restore only)
CREATE OR REPLACE FUNCTION public.update_order_status_customer(
  short_id text,
  new_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_uuid uuid;
BEGIN
  -- Only allow 'cancelled' or 'pending' status changes
  IF new_status NOT IN ('cancelled', 'pending') THEN
    RAISE EXCEPTION 'Invalid status. Only cancelled and pending are allowed.';
  END IF;

  -- Find the order by short ID
  SELECT o.id INTO order_uuid
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Don't allow status changes for orders that are already sent to press
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_uuid 
    AND status = 'sent_to_press'
  ) THEN
    RAISE EXCEPTION 'Cannot modify orders that have been sent to press';
  END IF;
  
  -- Update the order status
  UPDATE public.orders 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;