-- Supabase scheduler for Web Push reminders.
-- This job calls the Vercel /api/dispatch endpoint every minute, so reminders
-- still fire after the PWA/browser is closed.
--
-- Before running in Supabase SQL Editor:
-- 1. Replace YOUR_VERCEL_APP_ORIGIN with the production origin, for example:
--    https://calendar-nine-navy.vercel.app
-- 2. Replace YOUR_DISPATCH_BEARER_TOKEN with one secret accepted by /api/dispatch.
--    Recommended: CRON_SECRET or DISPATCH_SECRET on Vercel.
--    Also accepted: SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY already set on Vercel.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
declare
  job_name text := 'lunar-calendar-dispatch-every-minute';
  app_origin text := 'https://YOUR_VERCEL_APP_ORIGIN';
  dispatch_bearer_token text := 'YOUR_DISPATCH_BEARER_TOKEN';
begin
  if app_origin like '%YOUR_%' or dispatch_bearer_token like '%YOUR_%' then
    raise exception 'Replace app_origin and dispatch_bearer_token before running this SQL.';
  end if;

  if exists (select 1 from cron.job where jobname = job_name) then
    perform cron.unschedule(job_name);
  end if;

  perform cron.schedule(
    job_name,
    '* * * * *',
    format(
      $command$
      select
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', %L
          ),
          body := jsonb_build_object('source', 'supabase-pg-cron'),
          timeout_milliseconds := 10000
        );
      $command$,
      rtrim(app_origin, '/') || '/api/dispatch',
      'Bearer ' || dispatch_bearer_token
    )
  );
end $$;

-- Verify the scheduler:
-- select jobname, schedule, active from cron.job where jobname = 'lunar-calendar-dispatch-every-minute';
--
-- Inspect recent pg_net responses:
-- select status_code, content, created
-- from net._http_response
-- order by created desc
-- limit 10;
