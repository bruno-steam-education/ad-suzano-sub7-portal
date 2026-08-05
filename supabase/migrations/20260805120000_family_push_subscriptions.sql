create table if not exists public.family_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  athlete_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_push_subscriptions_athlete_idx
  on public.family_push_subscriptions (athlete_id)
  where is_active = true;

alter table public.family_push_subscriptions enable row level security;
revoke all on public.family_push_subscriptions from anon, authenticated;
