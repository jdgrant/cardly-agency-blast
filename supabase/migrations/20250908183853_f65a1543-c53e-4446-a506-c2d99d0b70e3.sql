-- Create edge function to cancel PCM orders
CREATE OR REPLACE FUNCTION cancel_pcm_order(
  order_id_param UUID,
  session_id_param TEXT
) 
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_valid BOOLEAN := FALSE;
  order_data RECORD;
BEGIN
  -- Check admin session
  SELECT value INTO admin_valid 
  FROM admin_sessions 
  WHERE session_id = session_id_param;
  
  IF NOT admin_valid THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Get order data
  SELECT * INTO order_data 
  FROM orders 
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Clear PCM info and update status
  UPDATE orders 
  SET 
    pcm_order_id = NULL,
    pcm_batch_id = NULL,
    status = 'pending',
    updated_at = NOW()
  WHERE id = order_id_param;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'PCM order cancelled and cleared'
  );
END;
$$;