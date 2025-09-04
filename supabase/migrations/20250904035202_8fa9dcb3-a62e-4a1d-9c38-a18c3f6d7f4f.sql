-- Update the update_order_file_for_customer function to handle cropped signatures
DROP FUNCTION IF EXISTS public.update_order_file_for_customer(text, text, text);

CREATE OR REPLACE FUNCTION public.update_order_file_for_customer(short_id text, file_type text, file_url text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  order_uuid uuid;
BEGIN
  -- Find the order by short ID
  SELECT o.id INTO order_uuid
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update the appropriate field based on file type
  CASE file_type
    WHEN 'logo' THEN
      UPDATE public.orders SET logo_url = file_url, updated_at = now() WHERE id = order_uuid;
    WHEN 'signature' THEN
      UPDATE public.orders SET signature_url = file_url, signature_needs_review = true, updated_at = now() WHERE id = order_uuid;
    WHEN 'cropped_signature' THEN
      UPDATE public.orders SET cropped_signature_url = file_url, signature_needs_review = true, updated_at = now() WHERE id = order_uuid;
    WHEN 'csv' THEN
      UPDATE public.orders SET csv_file_url = file_url, updated_at = now() WHERE id = order_uuid;
    WHEN 'payment' THEN
      UPDATE public.orders SET invoice_paid = true, updated_at = now() WHERE id = order_uuid;
    WHEN 'signature_upgrade' THEN
      UPDATE public.orders SET signature_purchased = true, final_price = final_price + 25, updated_at = now() WHERE id = order_uuid;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$$;