-- Create batches table for grouping orders by drop date
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  drop_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pcm_batch_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create batch_orders junction table to associate orders with batches
CREATE TABLE public.batch_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  order_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(batch_id, order_id)
);

-- Add foreign key constraints
ALTER TABLE public.batch_orders 
  ADD CONSTRAINT batch_orders_batch_id_fkey 
  FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE;

ALTER TABLE public.batch_orders 
  ADD CONSTRAINT batch_orders_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for batches
CREATE POLICY "Admin can manage batches" 
ON public.batches 
FOR ALL 
USING (is_admin_user()) 
WITH CHECK (is_admin_user());

-- Create RLS policies for batch_orders
CREATE POLICY "Admin can manage batch orders" 
ON public.batch_orders 
FOR ALL 
USING (is_admin_user()) 
WITH CHECK (is_admin_user());

-- Create database functions for batch management
CREATE OR REPLACE FUNCTION public.get_batches(session_id_param text)
RETURNS TABLE(
  id uuid,
  name text,
  drop_date date,
  status text,
  pcm_batch_id integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  order_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.drop_date,
    b.status,
    b.pcm_batch_id,
    b.created_at,
    b.updated_at,
    COALESCE(COUNT(bo.order_id), 0) as order_count
  FROM public.batches b
  LEFT JOIN public.batch_orders bo ON b.id = bo.batch_id
  GROUP BY b.id, b.name, b.drop_date, b.status, b.pcm_batch_id, b.created_at, b.updated_at
  ORDER BY b.drop_date DESC, b.created_at DESC;
END;
$function$;

-- Function to create a new batch
CREATE OR REPLACE FUNCTION public.create_batch(
  session_id_param text,
  batch_name text,
  batch_drop_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_batch_id uuid;
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Create the batch
  INSERT INTO public.batches (name, drop_date)
  VALUES (batch_name, batch_drop_date)
  RETURNING id INTO new_batch_id;
  
  RETURN new_batch_id;
END;
$function$;

-- Function to add orders to a batch
CREATE OR REPLACE FUNCTION public.add_orders_to_batch(
  session_id_param text,
  batch_id_param uuid,
  order_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  added_count integer := 0;
  order_id uuid;
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Add each order to the batch
  FOREACH order_id IN ARRAY order_ids
  LOOP
    INSERT INTO public.batch_orders (batch_id, order_id)
    VALUES (batch_id_param, order_id)
    ON CONFLICT (batch_id, order_id) DO NOTHING;
    
    IF FOUND THEN
      added_count := added_count + 1;
    END IF;
  END LOOP;
  
  RETURN added_count;
END;
$function$;

-- Function to get orders in a batch
CREATE OR REPLACE FUNCTION public.get_batch_orders(
  session_id_param text,
  batch_id_param uuid
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  RETURN QUERY
  SELECT o.*
  FROM public.orders o
  INNER JOIN public.batch_orders bo ON o.id = bo.order_id
  WHERE bo.batch_id = batch_id_param
  ORDER BY bo.added_at ASC;
END;
$function$;