-- Fix the remaining search_path warning for database functions
CREATE OR REPLACE FUNCTION public.generate_readable_order_id(uuid_val uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    date_part TEXT;
    uuid_suffix TEXT;
BEGIN
    -- Get current date in MMDDYYYY format
    date_part := to_char(NOW(), 'MMDDYYYY');
    
    -- Get last 5 characters of UUID (removing hyphens)
    uuid_suffix := RIGHT(REPLACE(uuid_val::TEXT, '-', ''), 5);
    
    -- Return formatted order ID
    RETURN date_part || '-' || uuid_suffix;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_order_by_short_id(short_id text)
RETURNS SETOF orders
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  select o.*
  from public.orders o
  where left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
$$;