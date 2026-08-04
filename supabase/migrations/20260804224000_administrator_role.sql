alter table public.staff_admins
  drop constraint if exists staff_admins_role_check;

alter table public.staff_admins
  add constraint staff_admins_role_check
  check (role in ('technical', 'coordinator', 'administrator'));

drop policy if exists "coordinators manage financial events" on public.financial_events;
create policy "coordination and admins manage financial events"
on public.financial_events
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role in ('coordinator', 'administrator')
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role in ('coordinator', 'administrator')
  )
);

drop policy if exists "coordinators manage financial payments" on public.financial_payments;
create policy "coordination and admins manage financial payments"
on public.financial_payments
for all
to authenticated
using (
  exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role in ('coordinator', 'administrator')
  )
)
with check (
  recorded_by = (select auth.uid())
  and exists (
    select 1 from public.staff_admins staff
    where staff.user_id = (select auth.uid())
      and staff.role in ('coordinator', 'administrator')
  )
);
