-- Create a simple function to update PCM info with admin session check
CREATE OR REPLACE FUNCTION public.update_pcm_info_simple(
  session_id_param text,
  order_id_param uuid,
  pcm_order_id_param text,
  pcm_batch_id_param integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Direct update - no BS
  UPDATE public.orders 
  SET 
    pcm_order_id = pcm_order_id_param,
    pcm_batch_id = pcm_batch_id_param,
    status = 'sent_to_press',
    updated_at = now()
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;