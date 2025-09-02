-- Remove the problematic set_config function
DROP FUNCTION IF EXISTS public.set_config(text, text, boolean);

-- Create a function to update template preview URL with admin session
CREATE OR REPLACE FUNCTION public.update_template_preview_url(
  session_id_param text,
  template_id_param text,
  new_preview_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin session
  IF NOT public.set_and_check_admin_session(session_id_param) THEN
    RAISE EXCEPTION 'Invalid admin session';
  END IF;
  
  -- Update template preview URL
  UPDATE public.templates 
  SET preview_url = new_preview_url
  WHERE id = template_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
END;
$$;