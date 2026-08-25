-- Kronos initial database schema
-- PostgreSQL 17 / Supabase. Every exposed table has explicit grants and RLS.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.organization_role as enum ('owner', 'admin', 'reception', 'professional', 'analyst');
create type public.niche_pattern as enum ('fixed_location', 'field_service', 'external_deadline');
create type public.resource_type as enum ('professional', 'room', 'chair', 'vehicle', 'bench', 'equipment', 'other');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'in_progress', 'waiting', 'completed', 'cancelled', 'no_show');
create type public.appointment_kind as enum ('appointment', 'visit', 'consultation', 'return', 'hearing', 'deadline', 'work_order');
create type public.appointment_origin as enum ('manual', 'public_booking', 'imported', 'integration');
create type public.article_status as enum ('draft', 'published', 'archived');
create type public.recommendation_status as enum ('new', 'applied', 'dismissed', 'snoozed');
create type public.notification_channel as enum ('email', 'whatsapp', 'sms', 'push');
create type public.notification_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.niche_templates (
  id text primary key,
  label text not null,
  pattern public.niche_pattern not null,
  version integer not null default 1 check (version > 0),
  theme jsonb not null default '{}'::jsonb,
  vocabulary jsonb not null default '{}'::jsonb,
  default_workflow jsonb not null default '[]'::jsonb,
  default_services jsonb not null default '[]'::jsonb,
  onboarding_tasks jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  name text not null check (char_length(name) between 2 and 120),
  slug extensions.citext not null unique,
  description text,
  niche_id text not null references public.niche_templates(id),
  niche_template_version integer not null default 1,
  timezone text not null default 'America/Sao_Paulo',
  public_booking_enabled boolean not null default false,
  booking_notice_minutes integer not null default 60 check (booking_notice_minutes >= 0),
  cancellation_notice_minutes integer not null default 240 check (cancellation_notice_minutes >= 0),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'professional',
  display_name text not null,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_themes (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_path text,
  primary_color text not null,
  accent_color text not null,
  soft_color text not null,
  line_color text not null,
  tokens jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.resource_type not null,
  name text not null,
  capacity integer not null default 1 check (capacity > 0),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  price_cents integer check (price_cents is null or price_cents >= 0),
  color text,
  requires_address boolean not null default false,
  custom_fields jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.service_resources (
  service_id uuid not null references public.services(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  primary key (service_id, resource_id)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid references public.organization_members(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  effective_from date,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (member_id is not null or resource_id is not null)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid references public.organization_members(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (member_id is not null or resource_id is not null)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  email extensions.citext,
  phone text,
  document text,
  address jsonb,
  preferences jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid references public.services(id) on delete set null,
  professional_member_id uuid references public.organization_members(id) on delete set null,
  kind public.appointment_kind not null default 'appointment',
  status public.appointment_status not null default 'scheduled',
  origin public.appointment_origin not null default 'manual',
  starts_at timestamptz,
  ends_at timestamptz,
  window_starts_at timestamptz,
  window_ends_at timestamptz,
  deadline_at timestamptz,
  timezone text not null default 'America/Sao_Paulo',
  address jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  notes text,
  priority smallint not null default 0 check (priority between 0 and 3),
  recurrence_rule text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'deadline' and deadline_at is not null)
    or (kind <> 'deadline' and starts_at is not null and ends_at is not null and ends_at > starts_at)
  ),
  check (window_ends_at is null or window_starts_at is null or window_ends_at > window_starts_at)
);

create table public.appointment_resources (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  primary key (appointment_id, resource_id)
);

create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  canonical_status public.appointment_status not null,
  position integer not null check (position >= 0),
  color text,
  wip_limit integer check (wip_limit is null or wip_limit > 0),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, position)
);

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  stage_id uuid not null references public.workflow_stages(id) on delete restrict,
  entered_stage_at timestamptz not null default now(),
  assignee_member_id uuid references public.organization_members(id) on delete set null,
  sla_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_status_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  changed_by uuid references auth.users(id),
  reason text,
  created_at timestamptz not null default now()
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  professional_member_id uuid references public.organization_members(id) on delete set null,
  window_starts_at timestamptz not null,
  window_ends_at timestamptz not null,
  status text not null default 'waiting' check (status in ('waiting', 'notified', 'booked', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  check (window_ends_at > window_starts_at)
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel public.notification_channel not null,
  template_key text not null,
  recipient text not null,
  scheduled_for timestamptz not null,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('process', 'manual', 'checklist', 'faq', 'template')),
  title text not null,
  body jsonb not null default '{}'::jsonb,
  status public.article_status not null default 'draft',
  template_origin text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_key text not null,
  title text not null,
  evidence jsonb not null default '{}'::jsonb,
  impact jsonb not null default '{}'::jsonb,
  origin text not null,
  status public.recommendation_status not null default 'new',
  action_payload jsonb not null default '{}'::jsonb,
  snoozed_until timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

-- Index every tenant and common access path used by RLS or scheduling queries.
create index organization_members_user_idx on public.organization_members (user_id, organization_id) where active;
create index resources_org_active_idx on public.resources (organization_id, active);
create index services_org_active_idx on public.services (organization_id, active);
create index availability_rules_member_idx on public.availability_rules (organization_id, member_id, weekday) where active;
create index availability_rules_resource_idx on public.availability_rules (organization_id, resource_id, weekday) where active;
create index availability_exceptions_range_idx on public.availability_exceptions (organization_id, starts_at, ends_at);
create index customers_org_name_idx on public.customers (organization_id, lower(name));
create index customers_org_phone_idx on public.customers (organization_id, phone) where phone is not null;
create index appointments_org_start_idx on public.appointments (organization_id, starts_at) where status not in ('cancelled');
create index appointments_professional_range_idx on public.appointments (professional_member_id, starts_at, ends_at) where status not in ('cancelled', 'no_show');
create index appointments_customer_idx on public.appointments (organization_id, customer_id, starts_at desc);
create index work_items_stage_idx on public.work_items (organization_id, stage_id, entered_stage_at);
create index status_history_appointment_idx on public.appointment_status_history (appointment_id, created_at desc);
create index notification_jobs_due_idx on public.notification_jobs (status, scheduled_for) where status = 'pending';
create index recommendations_org_status_idx on public.recommendations (organization_id, status, created_at desc);
create index audit_events_org_created_idx on public.audit_events (organization_id, created_at desc);

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.active
  );
$$;

create or replace function private.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = (select auth.uid())
      and membership.active
      and membership.role in ('owner', 'admin')
  );
$$;

create or replace function private.is_organization_creator(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
      and organization.created_by = (select auth.uid())
  );
$$;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.can_manage_organization(uuid) from public, anon;
revoke all on function private.is_organization_creator(uuid) from public, anon;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.can_manage_organization(uuid) to authenticated;
grant execute on function private.is_organization_creator(uuid) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.log_appointment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.appointment_status_history (
      organization_id, appointment_id, from_status, to_status, changed_by
    ) values (
      new.organization_id,
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.log_appointment_status() from public, anon, authenticated;

create trigger appointments_status_audit
  after insert or update of status on public.appointments
  for each row execute function private.log_appointment_status();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'niche_templates', 'organizations', 'organization_members', 'organization_themes',
    'resources', 'services', 'work_items', 'workflow_stages',
    'customers', 'appointments', 'notification_jobs', 'knowledge_articles',
    'recommendations'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name, table_name
    );
  end loop;
end $$;

-- Lock down grants before enabling row policies.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.niche_templates to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.organization_themes to authenticated;
grant select, insert, update, delete on public.resources to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.service_resources to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.appointment_resources to authenticated;
grant select, insert, update, delete on public.workflow_stages to authenticated;
grant select, insert, update, delete on public.work_items to authenticated;
grant select on public.appointment_status_history to authenticated;
grant select, insert, update, delete on public.waitlist_entries to authenticated;
grant select, insert, update, delete on public.notification_jobs to authenticated;
grant select, insert, update, delete on public.knowledge_articles to authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter table public.profiles enable row level security;
alter table public.niche_templates enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_themes enable row level security;
alter table public.resources enable row level security;
alter table public.services enable row level security;
alter table public.service_resources enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_resources enable row level security;
alter table public.workflow_stages enable row level security;
alter table public.work_items enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.recommendations enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_self on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy niche_templates_read on public.niche_templates for select to anon, authenticated using (active);

create policy organizations_select_member on public.organizations for select to authenticated using ((select private.is_organization_member(id)));
create policy organizations_bootstrap on public.organizations for insert to authenticated with check ((select auth.uid()) = created_by);
create policy organizations_update_admin on public.organizations for update to authenticated using ((select private.can_manage_organization(id))) with check ((select private.can_manage_organization(id)));
create policy organizations_delete_owner on public.organizations for delete to authenticated using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy members_select_member on public.organization_members for select to authenticated using ((select private.is_organization_member(organization_id)));
create policy members_bootstrap_or_admin on public.organization_members for insert to authenticated with check (
  ((user_id = (select auth.uid())) and role = 'owner' and (select private.is_organization_creator(organization_id)))
  or (select private.can_manage_organization(organization_id))
);
create policy members_update_admin on public.organization_members for update to authenticated using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));
create policy members_delete_admin on public.organization_members for delete to authenticated using ((select private.can_manage_organization(organization_id)) and user_id <> (select auth.uid()));

create policy themes_select_member on public.organization_themes for select to authenticated using ((select private.is_organization_member(organization_id)));
create policy themes_insert_admin on public.organization_themes for insert to authenticated with check ((select private.can_manage_organization(organization_id)));
create policy themes_update_admin on public.organization_themes for update to authenticated using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));
create policy themes_delete_admin on public.organization_themes for delete to authenticated using ((select private.can_manage_organization(organization_id)));

-- Standard tenant policies. Fine-grained role restrictions remain in server actions.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'resources', 'services', 'availability_rules', 'availability_exceptions',
    'customers', 'appointments', 'workflow_stages', 'work_items', 'waitlist_entries',
    'notification_jobs', 'knowledge_articles', 'recommendations'
  ] loop
    execute format('create policy %I_select_member on public.%I for select to authenticated using ((select private.is_organization_member(organization_id)))', table_name, table_name);
    execute format('create policy %I_insert_member on public.%I for insert to authenticated with check ((select private.is_organization_member(organization_id)))', table_name, table_name);
    execute format('create policy %I_update_member on public.%I for update to authenticated using ((select private.is_organization_member(organization_id))) with check ((select private.is_organization_member(organization_id)))', table_name, table_name);
    execute format('create policy %I_delete_admin on public.%I for delete to authenticated using ((select private.can_manage_organization(organization_id)))', table_name, table_name);
  end loop;
end $$;

create policy service_resources_select_member on public.service_resources for select to authenticated using (exists (select 1 from public.services s where s.id = service_id and (select private.is_organization_member(s.organization_id))));
create policy service_resources_insert_member on public.service_resources for insert to authenticated with check (exists (select 1 from public.services s where s.id = service_id and (select private.is_organization_member(s.organization_id))));
create policy service_resources_delete_admin on public.service_resources for delete to authenticated using (exists (select 1 from public.services s where s.id = service_id and (select private.can_manage_organization(s.organization_id))));

create policy appointment_resources_select_member on public.appointment_resources for select to authenticated using (exists (select 1 from public.appointments a where a.id = appointment_id and (select private.is_organization_member(a.organization_id))));
create policy appointment_resources_insert_member on public.appointment_resources for insert to authenticated with check (exists (select 1 from public.appointments a where a.id = appointment_id and (select private.is_organization_member(a.organization_id))));
create policy appointment_resources_delete_member on public.appointment_resources for delete to authenticated using (exists (select 1 from public.appointments a where a.id = appointment_id and (select private.is_organization_member(a.organization_id))));

create policy status_history_select_member on public.appointment_status_history for select to authenticated using ((select private.is_organization_member(organization_id)));
create policy audit_events_select_admin on public.audit_events for select to authenticated using ((select private.can_manage_organization(organization_id)));
create policy audit_events_insert_member on public.audit_events for insert to authenticated with check ((select private.is_organization_member(organization_id)) and (actor_id is null or actor_id = (select auth.uid())));

-- Storage bucket for tenant logos. Path convention: <organization_id>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('organization-logos', 'organization-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy logos_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'organization-logos');
create policy logos_member_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'organization-logos'
  and (select private.can_manage_organization((storage.foldername(name))[1]::uuid))
);
create policy logos_member_update on storage.objects for update to authenticated using (
  bucket_id = 'organization-logos'
  and (select private.can_manage_organization((storage.foldername(name))[1]::uuid))
) with check (
  bucket_id = 'organization-logos'
  and (select private.can_manage_organization((storage.foldername(name))[1]::uuid))
);
create policy logos_member_delete on storage.objects for delete to authenticated using (
  bucket_id = 'organization-logos'
  and (select private.can_manage_organization((storage.foldername(name))[1]::uuid))
);
