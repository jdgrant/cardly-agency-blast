-- Create admin function to create promo codes
CREATE OR REPLACE FUNCTION public.create_admin_promocode(
  session_id_param text,
  code_param text,
  discount_percentage_param numeric,
  expires_at_param timestamp with time zone DEFAULT NULL,
  max_uses_param integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_promo_id uuid;
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Create the promo code
  INSERT INTO public.promocodes (
    code,
    discount_percentage,
    expires_at,
    max_uses
  ) VALUES (
    UPPER(code_param),
    discount_percentage_param,
    expires_at_param,
    max_uses_param
  )
  RETURNING id INTO new_promo_id;
  
  RETURN new_promo_id;
END;
$function$;

-- Create admin function to get promo codes
CREATE OR REPLACE FUNCTION public.get_admin_promocodes(session_id_param text)
RETURNS SETOF promocodes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Return all promo codes for admin
  RETURN QUERY 
  SELECT * FROM public.promocodes 
  ORDER BY created_at DESC;
END;
$function$;