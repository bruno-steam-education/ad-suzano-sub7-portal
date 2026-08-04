alter table public.staff_admins
  add column if not exists role text not null default 'technical',
  add column if not exists display_name text;

alter table public.staff_admins
  drop constraint if exists staff_admins_role_check;

alter table public.staff_admins
  add constraint staff_admins_role_check
  check (role in ('technical', 'coordinator'));

update public.staff_admins
set role = 'technical'
where role is null or role not in ('technical', 'coordinator');

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  session_date date not null,
  title text not null default 'Treino',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_category_check
    check (category in ('Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'))
);

create table if not exists public.attendance_records (
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  athlete_id text not null,
  status text not null default 'unmarked',
  note text,
  recorded_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (session_id, athlete_id),
  constraint attendance_records_status_check
    check (status in ('unmarked', 'present', 'absent', 'justified'))
);

create table if not exists public.financial_events (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  event_date date not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  description text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_events_category_check
    check (category in ('Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'))
);

create table if not exists public.financial_payments (
  event_id uuid not null references public.financial_events(id) on delete cascade,
  athlete_id text not null,
  status text not null default 'pending',
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  paid_at timestamptz,
  note text,
  recorded_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (event_id, athlete_id),
  constraint financial_payments_status_check
    check (status in ('pending', 'paid', 'waived'))
);

create index if not exists attendance_sessions_category_date_idx
  on public.attendance_sessions (category, session_date desc);
create index if not exists attendance_records_athlete_idx
  on public.attendance_records (athlete_id);
create index if not exists financial_events_category_date_idx
  on public.financial_events (category, event_date desc);
create index if not exists financial_payments_athlete_idx
  on public.financial_payments (athlete_id);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.financial_events enable row level security;
alter table public.financial_payments enable row level security;

grant select, insert, update, delete on public.attendance_sessions to authenticated;
grant select, insert, update, delete on public.attendance_records to authenticated;
grant select, insert, update on public.financial_events to authenticated;
grant select, insert, update on public.financial_payments to authenticated;

drop policy if exists "staff manage attendance sessions" on public.attendance_sessions;
create policy "staff manage attendance sessions"
on public.attendance_sessions
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
  )
);

drop policy if exists "staff manage attendance records" on public.attendance_records;
create policy "staff manage attendance records"
on public.attendance_records
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
  )
)
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
  )
);

drop policy if exists "coordinators manage financial events" on public.financial_events;
create policy "coordinators manage financial events"
on public.financial_events
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'coordinator'
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'coordinator'
  )
);

drop policy if exists "coordinators manage financial payments" on public.financial_payments;
create policy "coordinators manage financial payments"
on public.financial_payments
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'coordinator'
  )
)
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'coordinator'
  )
);

alter function public.set_athlete_profile_updated_at()
  set search_path = pg_catalog, public;
