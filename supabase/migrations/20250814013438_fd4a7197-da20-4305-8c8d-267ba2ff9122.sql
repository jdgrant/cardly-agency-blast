-- CRITICAL SECURITY FIX: Remove public access to client_records and implement admin-only access

-- First, drop the dangerous public SELECT policy
DROP POLICY IF EXISTS "Public can view client records" ON public.client_records;

-- Create a secure policy that only allows admin users to view client records
CREATE POLICY "Admin can view client records" 
ON public.client_records 
FOR SELECT 
USING (is_admin_user());

-- Also update the INSERT policy to be more secure - only allow inserts for admin users
DROP POLICY IF EXISTS "Public can insert client records" ON public.client_records;

CREATE POLICY "Admin can insert client records" 
ON public.client_records 
FOR INSERT 
WITH CHECK (is_admin_user());

-- Add UPDATE and DELETE policies for admin users
CREATE POLICY "Admin can update client records" 
ON public.client_records 
FOR UPDATE 
USING (is_admin_user());

CREATE POLICY "Admin can delete client records" 
ON public.client_records 
FOR DELETE 
USING (is_admin_user());

-- Create a secure function for inserting client records during order creation
CREATE OR REPLACE FUNCTION public.insert_client_records(order_id uuid, client_data jsonb[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    client_record jsonb;
BEGIN
    -- Insert each client record
    FOREACH client_record IN ARRAY client_data
    LOOP
        INSERT INTO public.client_records (
            order_id,
            first_name,
            last_name,
            address,
            city,
            state,
            zip
        ) VALUES (
            order_id,
            client_record->>'first_name',
            client_record->>'last_name',
            client_record->>'address',
            client_record->>'city',
            client_record->>'state',
            client_record->>'zip'
        );
    END LOOP;
END;
$$;

-- Grant execute permission to the public role
GRANT EXECUTE ON FUNCTION public.insert_client_records TO anon, authenticated;