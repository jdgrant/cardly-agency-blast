-- Drop and recreate get_order_by_id function to include promo_code
DROP FUNCTION IF EXISTS public.get_order_by_id(uuid, text);

CREATE OR REPLACE FUNCTION public.get_order_by_id(order_id uuid, session_id_param text DEFAULT NULL::text)
RETURNS TABLE(
  id uuid, 
  readable_order_id text, 
  status text, 
  card_quantity integer, 
  final_price numeric, 
  mailing_window text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  template_id text, 
  tier_name text, 
  client_count integer, 
  postage_option text, 
  postage_cost numeric, 
  regular_price numeric, 
  logo_url text, 
  signature_url text, 
  cropped_signature_url text, 
  csv_file_url text, 
  early_bird_discount boolean, 
  selected_message text, 
  custom_message text, 
  front_preview_base64 text, 
  inside_preview_base64 text, 
  production_combined_pdf_public_url text, 
  production_combined_pdf_path text, 
  production_combined_pdf_generated_at timestamp with time zone, 
  contact_firstname text, 
  contact_lastname text, 
  contact_email text, 
  contact_phone text, 
  billing_address text, 
  signature_purchased boolean, 
  invoice_paid boolean, 
  signature_needs_review boolean, 
  promo_code text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    o.id,
    o.readable_order_id,
    o.status,
    o.card_quantity,
    o.final_price,
    o.mailing_window,
    o.created_at,
    o.updated_at,
    o.template_id,
    o.tier_name,
    o.client_count,
    o.postage_option,
    o.postage_cost,
    o.regular_price,
    o.logo_url,
    o.signature_url,
    o.cropped_signature_url,
    o.csv_file_url,
    o.early_bird_discount,
    o.selected_message,
    o.custom_message,
    o.front_preview_base64,
    o.inside_preview_base64,
    o.production_combined_pdf_public_url,
    o.production_combined_pdf_path,
    o.production_combined_pdf_generated_at,
    o.contact_firstname,
    o.contact_lastname,
    o.contact_email,
    o.contact_phone,
    o.billing_address,
    COALESCE(o.signature_purchased, false),
    COALESCE(o.invoice_paid, false),
    COALESCE(o.signature_needs_review, false),
    o.promo_code
  FROM public.orders o
  WHERE o.id = order_id;
$function$;