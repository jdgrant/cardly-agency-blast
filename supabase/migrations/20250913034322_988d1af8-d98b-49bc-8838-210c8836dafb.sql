-- Create trigger to automatically add paid orders to batches
CREATE OR REPLACE TRIGGER trigger_auto_add_order_to_batch
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_add_order_to_batch();