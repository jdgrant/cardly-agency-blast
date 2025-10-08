-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_order_status_email ON public.orders;
DROP FUNCTION IF EXISTS notify_order_status_change();