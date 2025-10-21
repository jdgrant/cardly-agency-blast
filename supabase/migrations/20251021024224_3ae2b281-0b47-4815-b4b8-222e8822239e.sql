-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update is_admin_user function to use new roles system
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Fix chat_messages RLS policy
DROP POLICY IF EXISTS "Users can view messages from their session" ON public.chat_messages;

CREATE POLICY "Users can view their session messages or admins can view all"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.chat_sessions WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Add authentication check function for order ownership
CREATE OR REPLACE FUNCTION public.verify_order_ownership(order_uuid uuid, user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_uuid 
    AND contact_email = user_email
  ) OR public.has_role(auth.uid(), 'admin');
$$;

-- Update reset_order_completely to require authentication
CREATE OR REPLACE FUNCTION public.reset_order_completely(order_readable_id text, user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_uuid uuid;
  order_tier_name text;
  order_postage_cost numeric;
  calculated_base_price numeric;
  calculated_final_price numeric;
BEGIN
  -- Find the order
  SELECT o.id, o.tier_name, o.postage_cost
  INTO order_uuid, order_tier_name, order_postage_cost
  FROM public.orders o
  WHERE o.readable_order_id = order_readable_id;
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify ownership
  IF NOT public.verify_order_ownership(order_uuid, user_email) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Delete all client records
  DELETE FROM public.client_records WHERE order_id = order_uuid;
  
  -- Calculate pricing
  CASE order_tier_name
    WHEN 'standard' THEN calculated_base_price := 0 * 2.50;
    WHEN 'premium' THEN calculated_base_price := 0 * 3.50;
    WHEN 'luxury' THEN calculated_base_price := 0 * 4.50;
    ELSE calculated_base_price := 0 * 2.50;
  END CASE;
  
  calculated_final_price := calculated_base_price + COALESCE(order_postage_cost, 0);
  
  UPDATE public.orders 
  SET 
    csv_file_url = NULL,
    client_count = 0,
    card_quantity = 0,
    signature_purchased = false,
    signature_url = NULL,
    cropped_signature_url = NULL,
    regular_price = calculated_base_price,
    final_price = calculated_final_price,
    updated_at = now()
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;

-- Update update_order_client_count_for_customer to require authentication
CREATE OR REPLACE FUNCTION public.update_order_client_count_for_customer(short_id text, new_client_count integer, user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_uuid uuid;
  order_postage_cost numeric;
  order_signature_purchased boolean;
  calculated_base_price numeric;
  calculated_final_price numeric;
  per_card_price numeric;
BEGIN
  -- Find the order
  SELECT o.id, o.postage_cost, COALESCE(o.signature_purchased, false)
  INTO order_uuid, order_postage_cost, order_signature_purchased
  FROM public.orders o
  WHERE left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
  
  IF order_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify ownership
  IF NOT public.verify_order_ownership(order_uuid, user_email) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Calculate pricing
  CASE 
    WHEN new_client_count <= 250 THEN per_card_price := 3.00;
    WHEN new_client_count <= 500 THEN per_card_price := 2.55;
    WHEN new_client_count <= 1000 THEN per_card_price := 2.13;
    WHEN new_client_count >= 2000 THEN per_card_price := 1.91;
    ELSE per_card_price := 2.50;
  END CASE;
  
  calculated_base_price := new_client_count * per_card_price;
  
  IF order_signature_purchased THEN
    calculated_base_price := calculated_base_price + 25.00;
  END IF;
  
  calculated_final_price := calculated_base_price + COALESCE(order_postage_cost, 0);
  
  UPDATE public.orders 
  SET 
    client_count = new_client_count,
    card_quantity = new_client_count,
    regular_price = calculated_base_price,
    final_price = calculated_final_price,
    updated_at = now() 
  WHERE id = order_uuid;
  
  RETURN true;
END;
$$;

-- Update update_return_address to require authentication
CREATE OR REPLACE FUNCTION public.update_return_address(
  order_id_param uuid,
  name_param text DEFAULT NULL,
  line1_param text DEFAULT NULL,
  line2_param text DEFAULT NULL,
  city_param text DEFAULT NULL,
  state_param text DEFAULT NULL,
  zip_param text DEFAULT NULL,
  user_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify ownership if user_email provided
  IF user_email IS NOT NULL AND NOT public.verify_order_ownership(order_id_param, user_email) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.orders 
  SET 
    return_address_name = name_param,
    return_address_line1 = line1_param,
    return_address_line2 = line2_param,
    return_address_city = city_param,
    return_address_state = state_param,
    return_address_zip = zip_param,
    updated_at = now()
  WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;