-- Add base64 preview columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS front_preview_base64 text,
  ADD COLUMN IF NOT EXISTS inside_preview_base64 text,
  ADD COLUMN IF NOT EXISTS previews_updated_at timestamptz DEFAULT now();

-- Index for queries filtering by previews_updated_at if needed
CREATE INDEX IF NOT EXISTS idx_orders_previews_updated_at ON public.orders(previews_updated_at);
