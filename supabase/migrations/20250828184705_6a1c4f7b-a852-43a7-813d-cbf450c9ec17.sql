-- Update cron job to run at 3:00 PM EDT (19:00 UTC) for testing
SELECT cron.unschedule('send-status-emails-daily');

SELECT cron.schedule(
  'send-status-emails-daily',
  '0 19 * * *', -- 3:00 PM EDT (19:00 UTC) every day
  $$
  SELECT
    net.http_post(
      url:='https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/send-status-email-cron',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWJ2bmVpZHNtdHNhemZibWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzM2NTQsImV4cCI6MjA2NjY0OTY1NH0.wqh-oGLHEeSTx-7pUuzk4yRDfV7VZxoaFx-1bwAdLZQ"}'::jsonb,
      body:='{"statusFilter": "not_completed"}'::jsonb
    ) as request_id;
  $$
);