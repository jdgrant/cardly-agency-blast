-- Create set_config wrapper function for admin session management
CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text, is_local boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT set_config(setting_name, setting_value, is_local);
$$;