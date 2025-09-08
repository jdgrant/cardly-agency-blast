-- Create RPC function for updating PCM Order information
CREATE OR REPLACE FUNCTION public.update_pcm_order_info(
  order_id_param uuid,
  pcm_order_id_param text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update PCM order information and status
  UPDATE public.orders 
  SET 
    pcm_order_id = pcm_order_id_param,
    status = CASE 
      WHEN pcm_order_id_param IS NOT NULL AND pcm_order_id IS NULL THEN 'sent_to_press'
      WHEN pcm_order_id_param IS NULL AND pcm_order_id IS NOT NULL AND status = 'sent_to_press' THEN 'approved'
      ELSE status
    END,
    updated_at = now()
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;