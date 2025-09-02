-- Remove the duplicate cron job ID 8 to fix email delivery
SELECT cron.unschedule(8);