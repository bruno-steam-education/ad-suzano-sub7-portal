create table if not exists public.payment_provider_settings (
  provider text primary key,
  handle text not null,
  is_active boolean not null default true,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint payment_provider_settings_provider_check check (provider in ('infinitepay')),
  constraint payment_provider_settings_handle_check check (handle ~ '^[A-Za-z0-9._-]{2,80}$')
);

alter table public.payment_provider_settings enable row level security;

grant select, insert, update on public.payment_provider_settings to authenticated;

create policy "staff read payment provider settings"
on public.payment_provider_settings
for select
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
  )
);

create policy "administrators manage payment provider settings"
on public.payment_provider_settings
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'administrator'
  )
)
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'administrator'
  )
);

