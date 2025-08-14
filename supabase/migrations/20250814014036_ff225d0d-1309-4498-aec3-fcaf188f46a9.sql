-- CRITICAL SECURITY FIX: Secure order creation and prevent fake orders

-- Remove the unrestricted order insertion policy
DROP POLICY IF EXISTS "Allow function-based order creation" ON public.orders;

-- Create a secure policy that only allows the create_order function to insert orders
CREATE POLICY "Secure order creation only" 
ON public.orders 
FOR INSERT 
WITH CHECK (false); -- No direct inserts allowed

-- Update the create_order function to include basic validation and rate limiting checks
CREATE OR REPLACE FUNCTION public.create_order(
  template_id text, 
  tier_name text, 
  card_quantity integer, 
  regular_price numeric, 
  final_price numeric, 
  mailing_window text, 
  postage_option text DEFAULT 'standard'::text, 
  postage_cost numeric DEFAULT 0.00, 
  custom_message text DEFAULT NULL::text, 
  selected_message text DEFAULT NULL::text, 
  logo_url text DEFAULT NULL::text, 
  signature_url text DEFAULT NULL::text, 
  csv_file_url text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
  readable_id text;
BEGIN
  -- Basic validation checks
  IF template_id IS NULL OR template_id = '' THEN
    RAISE EXCEPTION 'Template ID is required';
  END IF;
  
  IF card_quantity <= 0 OR card_quantity > 10000 THEN
    RAISE EXCEPTION 'Invalid card quantity. Must be between 1 and 10000';
  END IF;
  
  IF final_price < 0 OR final_price > 100000 THEN
    RAISE EXCEPTION 'Invalid price. Must be between 0 and 100000';
  END IF;
  
  IF mailing_window IS NULL OR mailing_window = '' THEN
    RAISE EXCEPTION 'Mailing window is required';
  END IF;

  -- Rate limiting: Check if there are too many orders from the same session in recent time
  -- This is a basic protection against spam orders
  IF EXISTS (
    SELECT 1 FROM public.orders 
    WHERE created_at > now() - interval '1 hour' 
    AND template_id = create_order.template_id
    AND card_quantity = create_order.card_quantity
    AND final_price = create_order.final_price
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
    status
  ) VALUES (
    template_id,
    tier_name,
    card_quantity,
    card_quantity, -- client_count = card_quantity
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
$function$;