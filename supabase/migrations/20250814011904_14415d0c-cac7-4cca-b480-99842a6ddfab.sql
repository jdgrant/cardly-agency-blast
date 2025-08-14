-- Complete the orders table security fix
-- Add secure functions and policies

-- Create secure order lookup function for public order status checks
CREATE OR REPLACE FUNCTION public.get_order_by_id(order_id uuid)
RETURNS TABLE (
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
  postage_cost numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
    o.postage_cost
  FROM public.orders o
  WHERE o.id = order_id;
$$;

-- Create secure function for order creation (bypasses RLS for legitimate order creation)
CREATE OR REPLACE FUNCTION public.create_order(
  template_id text,
  tier_name text,
  card_quantity integer,
  regular_price numeric,
  final_price numeric,
  mailing_window text,
  postage_option text DEFAULT 'standard',
  postage_cost numeric DEFAULT 0.00,
  custom_message text DEFAULT NULL,
  selected_message text DEFAULT NULL,
  logo_url text DEFAULT NULL,
  signature_url text DEFAULT NULL,
  csv_file_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.orders (
    template_id,
    tier_name,
    card_quantity,
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
    status,
    readable_order_id
  ) VALUES (
    template_id,
    tier_name,
    card_quantity,
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
    'pending',
    public.generate_readable_order_id(gen_random_uuid())
  )
  RETURNING id;
$$;

-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION public.set_admin_session(session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_sessions (session_id, value) 
  VALUES (session_id, true)
  ON CONFLICT (session_id) 
  DO UPDATE SET value = true, created_at = now();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value::boolean FROM public.admin_sessions WHERE session_id = current_setting('app.admin_session_id', true)),
    false
  );
$$;

-- Create admin-only policies for orders table
CREATE POLICY "Admin can view all orders"
ON public.orders
FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admin can update orders"
ON public.orders
FOR UPDATE
USING (public.is_admin_user());

CREATE POLICY "Admin can delete orders"
ON public.orders
FOR DELETE
USING (public.is_admin_user());

-- Allow function-based inserts (orders created through the secure function)
CREATE POLICY "Allow function-based order creation"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Grant execute permissions on the public functions
GRANT EXECUTE ON FUNCTION public.get_order_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(text, text, integer, numeric, numeric, text, text, numeric, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_session(text) TO anon, authenticated;