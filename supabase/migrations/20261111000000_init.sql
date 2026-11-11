-- ============================================================================
-- Zuse Technologies — IT Helpdesk
-- Initial schema, Row Level Security, storage and seed data.
--
-- Security model
--   * The public staff portal never talks to these tables with the anon key.
--     Ticket submission runs in a Next.js Server Action that validates input
--     and writes with the service-role key (server-only).
--   * The anon role may only READ active departments / categories / locations
--     (needed to render the public form). Nothing else.
--   * Authenticated users can read/write helpdesk data ONLY if they have an
--     active row in public.profiles (IT Department staff). Being signed in to
--     Supabase is not enough.
--   * Settings and user management additionally require role = 'admin'.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.ticket_status   as enum ('open', 'in_progress', 'on_hold', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high', 'critical');
create type public.staff_role      as enum ('admin', 'agent');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- IT staff profiles (authorisation source of truth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        public.staff_role not null default 'agent',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER so policies can call them without recursive RLS checks.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Configurable lookups
-- ---------------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index departments_name_key on public.departments (lower(name));
create trigger departments_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text not null default 'circle-help',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index categories_name_key on public.categories (lower(name));
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index locations_name_key on public.locations (lower(name));
create trigger locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------
create sequence public.ticket_number_seq start 1001;

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  ticket_number   text not null unique,
  requester_name  text not null check (char_length(requester_name) between 2 and 120),
  requester_email text not null check (char_length(requester_email) between 5 and 254),
  requester_phone text check (requester_phone is null or char_length(requester_phone) <= 30),
  department_id   uuid not null references public.departments (id),
  location_id     uuid not null references public.locations (id),
  room            text check (room is null or char_length(room) <= 80),
  category_id     uuid not null references public.categories (id),
  title           text not null check (char_length(title) between 4 and 150),
  description     text not null check (char_length(description) between 10 and 5000),
  priority        public.ticket_priority not null default 'medium',
  status          public.ticket_status not null default 'open',
  assigned_to     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  first_response_at timestamptz,
  resolved_at     timestamptz,
  closed_at       timestamptz
);

create index tickets_status_idx      on public.tickets (status);
create index tickets_priority_idx    on public.tickets (priority);
create index tickets_created_at_idx  on public.tickets (created_at desc);
create index tickets_assigned_idx    on public.tickets (assigned_to);
create index tickets_category_idx    on public.tickets (category_id);
create index tickets_department_idx  on public.tickets (department_id);
create index tickets_email_idx       on public.tickets (lower(requester_email), created_at desc);

-- Ticket number: ZT-2026-01001
create or replace function public.assign_ticket_number()
returns trigger language plpgsql as $$
begin
  if new.ticket_number is null or new.ticket_number = '' then
    new.ticket_number := 'ZT-' || to_char(now(), 'YYYY') || '-' ||
                         lpad(nextval('public.ticket_number_seq')::text, 5, '0');
  end if;
  return new;
end $$;

create trigger tickets_assign_number before insert on public.tickets
  for each row execute function public.assign_ticket_number();

-- Keep lifecycle timestamps consistent with status.
create or replace function public.ticket_lifecycle()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'resolved' and new.resolved_at is null then
      new.resolved_at := now();
    elsif new.status = 'closed' then
      new.closed_at := coalesce(new.closed_at, now());
      new.resolved_at := coalesce(new.resolved_at, now());
    elsif new.status in ('open', 'in_progress', 'on_hold') then
      new.resolved_at := null;
      new.closed_at := null;
    end if;
    if old.status = 'open' and new.first_response_at is null then
      new.first_response_at := now();
    end if;
  end if;
  return new;
end $$;

create trigger tickets_lifecycle before update on public.tickets
  for each row execute function public.ticket_lifecycle();

-- ---------------------------------------------------------------------------
-- Attachments (files live in the private `ticket-attachments` bucket)
-- ---------------------------------------------------------------------------
create table public.ticket_attachments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  file_path   text not null unique,
  file_name   text not null,
  mime_type   text not null,
  size_bytes  integer not null check (size_bytes > 0),
  created_at  timestamptz not null default now()
);
create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);

-- ---------------------------------------------------------------------------
-- Internal notes (never exposed to the public portal)
-- ---------------------------------------------------------------------------
create table public.ticket_notes (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null check (char_length(body) between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index ticket_notes_ticket_idx on public.ticket_notes (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- Activity log (written by trigger, read-only for staff)
-- ---------------------------------------------------------------------------
create table public.ticket_activity (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  from_value  text,
  to_value    text,
  created_at  timestamptz not null default now()
);
create index ticket_activity_ticket_idx on public.ticket_activity (ticket_id, created_at);

create or replace function public.log_ticket_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into ticket_activity (ticket_id, actor_id, action, to_value)
    values (new.id, null, 'created', new.status::text);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into ticket_activity (ticket_id, actor_id, action, from_value, to_value)
    values (new.id, actor, 'status', old.status::text, new.status::text);
  end if;
  if new.priority is distinct from old.priority then
    insert into ticket_activity (ticket_id, actor_id, action, from_value, to_value)
    values (new.id, actor, 'priority', old.priority::text, new.priority::text);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into ticket_activity (ticket_id, actor_id, action, from_value, to_value)
    values (
      new.id, actor, 'assignment',
      (select full_name from profiles where id = old.assigned_to),
      (select full_name from profiles where id = new.assigned_to)
    );
  end if;
  return new;
end $$;

create trigger tickets_activity_insert after insert on public.tickets
  for each row execute function public.log_ticket_activity();
create trigger tickets_activity_update after update on public.tickets
  for each row execute function public.log_ticket_activity();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.departments        enable row level security;
alter table public.categories         enable row level security;
alter table public.locations          enable row level security;
alter table public.tickets            enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_notes       enable row level security;
alter table public.ticket_activity    enable row level security;

-- Profiles: staff can see the team (for assignment); only admins manage.
create policy "staff read profiles" on public.profiles
  for select to authenticated using (public.is_staff());
create policy "admins insert profiles" on public.profiles
  for insert to authenticated with check (public.is_admin());
create policy "admins update profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Lookups: public can read active rows; staff read all; admins manage.
create policy "public read active departments" on public.departments
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "admins manage departments" on public.departments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read active categories" on public.categories
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read active locations" on public.locations
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "admins manage locations" on public.locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tickets: staff only. No anon policies at all.
create policy "staff read tickets" on public.tickets
  for select to authenticated using (public.is_staff());
create policy "staff update tickets" on public.tickets
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "admins delete tickets" on public.tickets
  for delete to authenticated using (public.is_admin());

create policy "staff read attachments" on public.ticket_attachments
  for select to authenticated using (public.is_staff());

create policy "staff read notes" on public.ticket_notes
  for select to authenticated using (public.is_staff());
create policy "staff write own notes" on public.ticket_notes
  for insert to authenticated with check (public.is_staff() and author_id = auth.uid());
create policy "authors or admins delete notes" on public.ticket_notes
  for delete to authenticated using (public.is_staff() and (author_id = auth.uid() or public.is_admin()));

create policy "staff read activity" on public.ticket_activity
  for select to authenticated using (public.is_staff());

-- Belt and braces: the anon role gets no table privileges beyond the lookups.
revoke all on public.tickets, public.ticket_attachments, public.ticket_notes,
              public.ticket_activity, public.profiles from anon;

-- ============================================================================
-- Storage
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments', 'ticket-attachments', false, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]
)
on conflict (id) do nothing;

-- Staff may read attachments. Uploads happen only through short-lived signed
-- upload URLs that the server issues per ticket, so no insert policy is needed.
create policy "staff read ticket attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments' and public.is_staff());
create policy "admins delete ticket attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-attachments' and public.is_admin());

-- ============================================================================
-- Analytics helpers (run with caller's privileges, so RLS still applies)
-- ============================================================================
create or replace function public.ticket_daily_counts(days integer default 30)
returns table (day date, created bigint, resolved bigint)
language sql stable security invoker
set search_path = public
set timezone = 'Asia/Colombo'  -- bucket days in Sri Lanka time
as $$
  with d as (
    select generate_series(current_date - (days - 1), current_date, interval '1 day')::date as day
  )
  select
    d.day,
    (select count(*) from tickets t where t.created_at::date = d.day) as created,
    (select count(*) from tickets t where t.resolved_at::date = d.day) as resolved
  from d
  order by d.day;
$$;
grant execute on function public.ticket_daily_counts(integer) to authenticated;

-- ============================================================================
-- Seed data
-- ============================================================================
insert into public.departments (name, sort_order) values
  ('Administration', 1), ('Academic', 2), ('Finance', 3), ('Human Resources', 4),
  ('IT', 5), ('Library', 6), ('Examination', 7), ('Maintenance', 8), ('Other', 99);

insert into public.categories (name, icon, sort_order) values
  ('Computer / Laptop',     'laptop',          1),
  ('Printer / Scanner',     'printer',         2),
  ('Network / Wi-Fi',       'wifi',            3),
  ('Internet',              'globe',           4),
  ('Email / Outlook',       'mail',            5),
  ('Microsoft 365',         'layout-grid',     6),
  ('Software Installation', 'package',         7),
  ('Login / Password',      'key-round',       8),
  ('Projector / Display',   'projector',       9),
  ('Hardware',              'cpu',            10),
  ('Server / System',       'server',         11),
  ('Other',                 'circle-help',    99);

-- Placeholder buildings — rename these in Admin → Settings → Locations.
insert into public.locations (name, sort_order) values
  ('Main Building', 1), ('Primary Section', 2), ('Secondary Section', 3),
  ('Administration Block', 4), ('Library', 5), ('Auditorium', 6),
  ('Computer Labs', 7), ('Sports Complex', 8), ('Other', 99);
