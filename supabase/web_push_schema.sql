-- Idempotent schema for PWA Web Push subscriptions and scheduled reminders.
-- Run this once before installing the cron job if your Supabase tables were created manually.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  endpoint text not null,
  subscription jsonb not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  user_agent text,
  platform text,
  lead_days integer not null default 2,
  notify_hour integer not null default 7,
  notify_mung1 boolean not null default true,
  notify_ram boolean not null default true,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions
  add column if not exists endpoint text,
  add column if not exists subscription jsonb,
  add column if not exists timezone text default 'Asia/Ho_Chi_Minh',
  add column if not exists user_agent text,
  add column if not exists platform text,
  add column if not exists lead_days integer default 2,
  add column if not exists notify_hour integer default 7,
  add column if not exists notify_mung1 boolean default true,
  add column if not exists notify_ram boolean default true,
  add column if not exists is_active boolean default true,
  add column if not exists last_seen_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists push_subscriptions_endpoint_unique
  on public.push_subscriptions (endpoint);

create table if not exists public.scheduled_pushes (
  id uuid primary key default extensions.gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  fire_at timestamptz not null,
  type text not null,
  title text,
  body text,
  url text default '/',
  sent boolean not null default false,
  status text not null default 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.scheduled_pushes
  add column if not exists subscription_id uuid,
  add column if not exists fire_at timestamptz,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists url text default '/',
  add column if not exists sent boolean default false,
  add column if not exists status text default 'pending',
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz default now();

create index if not exists scheduled_pushes_due_idx
  on public.scheduled_pushes (fire_at, status, sent);

create index if not exists scheduled_pushes_subscription_idx
  on public.scheduled_pushes (subscription_id);

create index if not exists scheduled_pushes_note_url_idx
  on public.scheduled_pushes (subscription_id, type, url)
  where type = 'note' and sent = false;
