-- Function to find an order by the first 8 chars of its UUID (ignoring dashes, case-insensitive)
create or replace function public.find_order_by_short_id(short_id text)
returns setof public.orders
language sql
stable
as $$
  select o.*
  from public.orders o
  where left(replace(lower(o.id::text), '-', ''), 8) = lower(short_id);
$$;

-- Expression index to speed up short-id lookups
create index if not exists orders_id_prefix8_idx
on public.orders ((left(replace(lower(id::text), '-', ''), 8)));
