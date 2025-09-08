-- Create a function that just updates PCM info without session check
CREATE OR REPLACE FUNCTION public.force_update_pcm_info(
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
  -- Just update it - no session check BS
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