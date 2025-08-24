-- Create a secure function to get order details for customer order management
-- This bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_order_for_customer_management(short_id text)
 RETURNS TABLE(
   id uuid, 
   readable_order_id text, 
   template_id text, 
   tier_name text, 
   card_quantity integer, 
   client_count integer, 
   regular_price numeric, 
   final_price numeric, 
   postage_cost numeric, 
   mailing_window text, 
   status text, 
   logo_url text, 
   signature_url text, 
   csv_file_url text, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone, 
   early_bird_discount boolean, 
   postage_option text, 
   selected_message text, 
   custom_message text, 
   front_preview_base64 text, 
   inside_preview_base64 text, 
   contact_firstname text, 
   contact_lastname text, 
   contact_email text, 
   contact_phone text, 
   billing_address text,
   invoice_paid boolean
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    o.id,
    o.readable_order_id,
    o.template_id,
    o.tier_name,
    o.card_quantity,
    o.client_count,
    o.regular_price,
    o.final_price,
    o.postage_cost,
    o.mailing_window,
    o.status,
    o.logo_url,
    o.signature_url,
    o.csv_file_url,
    o.created_at,
    o.updated_at,
    o.early_bird_discount,
    o.postage_option,
    o.selected_message,
    o.custom_message,
    o.front_preview_base64,
    o.inside_preview_base64,
    o.contact_firstname,
    o.contact_lastname,
    o.contact_email,
    o.contact_phone,
    o.billing_address,
    o.invoice_paid
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
$function$;

-- Create a secure function to update order files for customer management
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
      UPDATE public.orders SET csv_file_url = file_url, mailing_list_uploaded = true, updated_at = now() WHERE id = order_uuid;
    WHEN 'payment' THEN
      UPDATE public.orders SET invoice_paid = true, updated_at = now() WHERE id = order_uuid;
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$function$;

-- Create a secure function to update client count for customer management
CREATE OR REPLACE FUNCTION public.update_order_client_count_for_customer(
  short_id text,
  new_client_count integer
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
  
  -- Update client count
  UPDATE public.orders 
  SET client_count = new_client_count, updated_at = now() 
  WHERE id = order_uuid;
  
  RETURN true;
END;
$function$;