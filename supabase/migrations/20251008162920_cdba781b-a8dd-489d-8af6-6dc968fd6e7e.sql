-- Create a function to send status update emails via edge function
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only trigger if status actually changed and we have contact email
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.contact_email IS NOT NULL THEN
    
    -- Build the payload
    payload := jsonb_build_object(
      'order_id', NEW.id,
      'readable_order_id', NEW.readable_order_id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'contact_email', NEW.contact_email,
      'contact_firstname', NEW.contact_firstname,
      'contact_lastname', NEW.contact_lastname
    );
    
    -- Make async HTTP request to edge function using pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-order-status-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := payload
      );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_order_status_email ON public.orders;
CREATE TRIGGER trigger_order_status_email
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Set the configuration parameters (these will need to be set by Supabase admin)
-- Note: These settings need to be configured in Supabase dashboard
COMMENT ON FUNCTION notify_order_status_change() IS 
  'Sends email notifications when order status changes. Requires app.supabase_url and app.service_role_key to be configured.';