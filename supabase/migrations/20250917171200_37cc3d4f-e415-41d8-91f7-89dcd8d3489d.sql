-- Ensure the trigger exists for automatic batch assignment
DROP TRIGGER IF EXISTS auto_add_order_to_batch_trigger ON public.orders;

CREATE TRIGGER auto_add_order_to_batch_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_order_to_batch();

-- Create default batches if they don't exist
INSERT INTO public.batches (name, drop_date, status) VALUES
  ('December 1-5 Batch', '2024-11-29', 'pending'),
  ('December 6-10 Batch', '2024-12-04', 'pending'),
  ('December 11-15 Batch', '2024-12-09', 'pending'),
  ('December 16-20 Batch', '2024-12-14', 'pending')
ON CONFLICT (name) DO NOTHING;