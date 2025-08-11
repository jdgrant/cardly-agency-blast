-- Set a fixed search_path for the newly added function to satisfy security best practices
alter function public.find_order_by_short_id(short_id text)
  set search_path = public;