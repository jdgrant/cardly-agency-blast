-- Remove redundant upload status flags - we'll check URL existence instead
ALTER TABLE public.orders 
DROP COLUMN IF EXISTS logo_uploaded,
DROP COLUMN IF EXISTS signature_submitted, 
DROP COLUMN IF EXISTS mailing_list_uploaded;

-- Update the function to not set boolean flags anymore
CREATE OR REPLACE FUNCTION public.update_order_file_for_customer(
  short_id text,
  file_type text,
  file_url text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      UPDATE public.orders SET signature_url = file_url, updated_at = now() WHERE id = order_uuid;
    WHEN 'csv' THEN
      UPDATE public.orders SET csv_file_url = file_url, updated_at = now() WHERE id = order_uuid;
    WHEN 'payment' THEN
      UPDATE public.orders SET invoice_paid = true, updated_at = now() WHERE id = order_uuid;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$function$;

-- Update admin function to only handle fields that still exist
CREATE OR REPLACE FUNCTION public.update_admin_order_status_fields(
  session_id_param text, 
  order_id_param uuid, 
  field_name text, 
  field_value boolean
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Verify admin session
    IF NOT public.set_and_check_admin_session(session_id_param) THEN
        RAISE EXCEPTION 'Invalid admin session';
    END IF;
    
    -- Update the specific field based on field_name
    CASE field_name
        WHEN 'signature_purchased' THEN
            UPDATE public.orders SET signature_purchased = field_value WHERE id = order_id_param;
        WHEN 'invoice_paid' THEN
            UPDATE public.orders SET invoice_paid = field_value WHERE id = order_id_param;
        ELSE
            RAISE EXCEPTION 'Invalid field name: %', field_name;
    END CASE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    -- Update the updated_at timestamp
    UPDATE public.orders SET updated_at = now() WHERE id = order_id_param;
END;
$function$;