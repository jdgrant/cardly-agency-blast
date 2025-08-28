-- Remove duplicate cron job (the one with incorrect timing)
SELECT cron.unschedule('daily-status-email-10am-et');