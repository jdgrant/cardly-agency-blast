-- Update create_order function to include customer contact information
CREATE OR REPLACE FUNCTION public.create_order(
    p_template_id text, 
    p_tier_name text, 
    p_card_quantity integer, 
    p_regular_price numeric, 
    p_final_price numeric, 
    p_mailing_window text, 
    p_postage_option text DEFAULT 'standard'::text, 
    p_postage_cost numeric DEFAULT 0.00, 
    p_custom_message text DEFAULT NULL::text, 
    p_selected_message text DEFAULT NULL::text, 
    p_logo_url text DEFAULT NULL::text, 
    p_signature_url text DEFAULT NULL::text, 
    p_csv_file_url text DEFAULT NULL::text,
    p_contact_name text DEFAULT NULL::text,
    p_contact_email text DEFAULT NULL::text,
    p_contact_phone text DEFAULT NULL::text,
    p_billing_address text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  new_order_id uuid;
  readable_id text;
BEGIN
  -- Basic validation checks
  IF p_template_id IS NULL OR p_template_id = '' THEN
    RAISE EXCEPTION 'Template ID is required';
  END IF;
  
  IF p_card_quantity <= 0 OR p_card_quantity > 10000 THEN
    RAISE EXCEPTION 'Invalid card quantity. Must be between 1 and 10000';
  END IF;
  
  IF p_final_price < 0 OR p_final_price > 100000 THEN
    RAISE EXCEPTION 'Invalid price. Must be between 0 and 100000';
  END IF;
  
  IF p_mailing_window IS NULL OR p_mailing_window = '' THEN
    RAISE EXCEPTION 'Mailing window is required';
  END IF;

  -- Rate limiting: Check if there are too many orders from the same session in recent time
  -- This is a basic protection against spam orders
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE created_at > now() - interval '1 hour' 
    AND template_id = p_template_id
    AND card_quantity = p_card_quantity
    AND final_price = p_final_price
  ) THEN
    RAISE EXCEPTION 'Too many similar orders detected. Please wait before creating another order.';
  END IF;

  -- Insert the order
  INSERT INTO public.orders (
    template_id,
    tier_name,
    card_quantity,
    client_count,
    regular_price,
    final_price,
    mailing_window,
    postage_option,
    postage_cost,
    custom_message,
    selected_message,
    logo_url,
    signature_url,
    csv_file_url,
    contact_name,
    contact_email,
    contact_phone,
    billing_address,
    status
  ) VALUES (
    p_template_id,
    p_tier_name,
    p_card_quantity,
    p_card_quantity, -- client_count = card_quantity
    p_regular_price,
    p_final_price,
    p_mailing_window,
    p_postage_option,
    p_postage_cost,
    p_custom_message,
    p_selected_message,
    p_logo_url,
    p_signature_url,
    p_csv_file_url,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_billing_address,
    'pending'
  )
  RETURNING id INTO new_order_id;

  -- Generate readable order ID
  readable_id := public.generate_readable_order_id(new_order_id);
  
  -- Update the order with readable ID
  UPDATE public.orders 
  SET readable_order_id = readable_id 
  WHERE id = new_order_id;

  RETURN new_order_id;
END;
$$;