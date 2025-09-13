-- Delete existing batches first
DELETE FROM public.batches;

-- Create batches that match the wizard mailing windows
INSERT INTO public.batches (name, drop_date, status) VALUES
('December 1-5 Batch', '2025-11-29', 'pending'),
('December 6-10 Batch', '2025-12-04', 'pending'),
('December 11-15 Batch', '2025-12-09', 'pending'),
('December 16-20 Batch', '2025-12-14', 'pending');