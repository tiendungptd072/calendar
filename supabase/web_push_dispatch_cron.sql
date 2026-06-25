-- Supabase scheduler for Web Push reminders.
-- Replace YOUR_VERCEL_APP_URL and YOUR_CRON_SECRET before running this in Supabase SQL Editor.
-- This is needed for note reminders to fire while the PWA is closed.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('lunar-calendar-dispatch-every-minute')
where exists (
  select 1
  from cron.job
  where jobname = 'lunar-calendar-dispatch-every-minute'
);

select cron.schedule(
  'lunar-calendar-dispatch-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://YOUR_VERCEL_APP_URL/api/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := jsonb_build_object('source', 'supabase-pg-cron'),
      timeout_milliseconds := 10000
    );
  $$
);
