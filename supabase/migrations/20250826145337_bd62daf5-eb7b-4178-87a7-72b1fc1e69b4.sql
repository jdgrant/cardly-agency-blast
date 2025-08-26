-- Create new cron job for 11 AM ET (16:00 UTC during daylight saving time)
SELECT cron.schedule(
  'daily-status-email-11am-et',
  '0 16 * * *', -- 11 AM ET = 16:00 UTC (during daylight saving time)
  $$
  SELECT
    net.http_post(
        url:='https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/send-status-email-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzaWJ2bmVpZHNtdHNhemZibWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzM2NTQsImV4cCI6MjA2NjY0OTY1NH0.wqh-oGLHEeSTx-7pUuzk4yRDfV7VZxoaFx-1bwAdLZQ"}'::jsonb,
        body:='{"statusFilter": "not_completed"}'::jsonb
    ) as request_id;
  $$
);