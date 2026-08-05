create policy "deny client access to payment webhooks"
on public.payment_webhook_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "administrators manage payment provider settings"
  on public.payment_provider_settings;

create policy "administrators insert payment provider settings"
on public.payment_provider_settings
for insert
to authenticated
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'administrator'
  )
);

create policy "administrators update payment provider settings"
on public.payment_provider_settings
for update
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

create policy "administrators delete payment provider settings"
on public.payment_provider_settings
for delete
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role = 'administrator'
  )
);

create index if not exists attendance_records_recorded_by_idx
  on public.attendance_records (recorded_by);
create index if not exists attendance_sessions_created_by_idx
  on public.attendance_sessions (created_by);
create index if not exists financial_events_created_by_idx
  on public.financial_events (created_by);
create index if not exists financial_payments_recorded_by_idx
  on public.financial_payments (recorded_by);
create index if not exists payment_provider_settings_updated_by_idx
  on public.payment_provider_settings (updated_by);

