-- Add columns to store production combined PDF URL and metadata
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS production_combined_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS production_combined_pdf_public_url TEXT,
  ADD COLUMN IF NOT EXISTS production_combined_pdf_generated_at TIMESTAMPTZ;

-- Index to quickly find orders with generated production PDFs
CREATE INDEX IF NOT EXISTS idx_orders_production_pdf_generated_at
  ON public.orders (production_combined_pdf_generated_at);
