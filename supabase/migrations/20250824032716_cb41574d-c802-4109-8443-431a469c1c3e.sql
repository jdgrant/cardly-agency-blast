-- Create promocodes table
CREATE TABLE public.promocodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_percentage numeric NOT NULL DEFAULT 15.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can view all promocodes" 
ON public.promocodes 
FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Admin can create promocodes" 
ON public.promocodes 
FOR INSERT 
WITH CHECK (is_admin_user());

CREATE POLICY "Admin can update promocodes" 
ON public.promocodes 
FOR UPDATE 
USING (is_admin_user());

CREATE POLICY "Admin can delete promocodes" 
ON public.promocodes 
FOR DELETE 
USING (is_admin_user());

-- Create function to get active promocodes for public use
CREATE OR REPLACE FUNCTION public.get_promocode(code_param text)
RETURNS TABLE(
  id uuid,
  code text,
  discount_percentage numeric,
  is_active boolean,
  max_uses integer,
  current_uses integer,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.code,
    p.discount_percentage,
    p.is_active,
    p.max_uses,
    p.current_uses,
    p.expires_at
  FROM public.promocodes p
  WHERE p.code = code_param 
    AND p.is_active = true
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (p.max_uses IS NULL OR p.current_uses < p.max_uses);
$$;

-- Create function to increment promocode usage
CREATE OR REPLACE FUNCTION public.use_promocode(code_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.promocodes 
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE code = code_param 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
    
  RETURN FOUND;
END;
$$;