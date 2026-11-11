-- Removes everything created by migrations/20261111000000_init.sql so it can be run again
-- from a clean slate. DELETES ALL HELPDESK DATA. The storage bucket is kept (the migration
-- re-uses it).

drop policy if exists "staff read ticket attachments" on storage.objects;
drop policy if exists "admins delete ticket attachments" on storage.objects;

drop table if exists
  public.ticket_activity,
  public.ticket_notes,
  public.ticket_attachments,
  public.tickets,
  public.locations,
  public.categories,
  public.departments,
  public.profiles
cascade;

drop sequence if exists public.ticket_number_seq;

drop function if exists public.ticket_daily_counts(integer);
drop function if exists public.log_ticket_activity();
drop function if exists public.ticket_lifecycle();
drop function if exists public.assign_ticket_number();
drop function if exists public.is_admin();
drop function if exists public.is_staff();
drop function if exists public.set_updated_at();

drop type if exists public.ticket_status;
drop type if exists public.ticket_priority;
drop type if exists public.staff_role;
