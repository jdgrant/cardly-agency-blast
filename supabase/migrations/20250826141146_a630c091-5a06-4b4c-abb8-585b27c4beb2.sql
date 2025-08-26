-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create unsubscribe table to track opted-out emails
CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on unsubscribe table
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Admin can manage unsubscribes
CREATE POLICY "Admin can view all unsubscribes" 
ON public.email_unsubscribes 
FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Admin can insert unsubscribes" 
ON public.email_unsubscribes 
FOR INSERT 
WITH CHECK (is_admin_user());

-- Public can unsubscribe themselves (for unsubscribe endpoint)
CREATE POLICY "Public can unsubscribe" 
ON public.email_unsubscribes 
FOR INSERT 
WITH CHECK (true);

-- Create the cron job to send status emails daily at 10 AM ET (3 PM UTC)
SELECT cron.schedule(
  'send-daily-status-emails',
  '0 15 * * *', -- 3 PM UTC = 10 AM ET (accounting for EST/EDT)
  $$
  SELECT net.http_post(
    url:='https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/send-status-email-cron',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWJ2bmVpZHNtdHNhemZibWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzM2NTQsImV4cCI6MjA2NjY0OTY1NH0.wqh-oGLHEeSTx-7pUuzk4yRDfV7VZxoaFx-1bwAdLZQ"}'::jsonb,
    body:='{"statusFilter": "not_completed"}'::jsonb
  ) as request_id;
  $$
);

-- Create function to check if email is unsubscribed
CREATE OR REPLACE FUNCTION public.is_email_unsubscribed(email_address text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.email_unsubscribes 
    WHERE email = email_address
  );
$function$;