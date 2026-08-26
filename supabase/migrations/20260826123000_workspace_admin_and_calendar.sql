-- Workspace limits, persisted preferences, and transactional calendar/admin actions.

alter table public.profiles
  add column if not exists workspace_limit smallint not null default 2
  check (workspace_limit between 1 and 20);

alter table public.organizations
  add column if not exists preferences jsonb not null default '{}'::jsonb
  check (jsonb_typeof(preferences) = 'object');

create or replace function private.protect_workspace_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.workspace_limit is distinct from old.workspace_limit
     and coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'PLAN_FIELD_IS_SERVER_MANAGED' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_workspace_limit() from public, anon, authenticated;

drop trigger if exists profiles_protect_workspace_limit on public.profiles;
create trigger profiles_protect_workspace_limit
before update on public.profiles
for each row execute function private.protect_workspace_limit();

create or replace function private.protect_organization_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'ORGANIZATION_OWNER_IS_IMMUTABLE' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_organization_owner() from public, anon, authenticated;

drop trigger if exists organizations_protect_created_by on public.organizations;
create trigger organizations_protect_created_by
before update on public.organizations
for each row execute function private.protect_organization_owner();

create or replace function private.enforce_workspace_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_workspaces integer;
  owned_workspaces integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 0));

  select coalesce(profile.workspace_limit, 2)
    into allowed_workspaces
  from public.profiles profile
  where profile.id = new.created_by;

  allowed_workspaces := coalesce(allowed_workspaces, 2);

  select count(*)::integer
    into owned_workspaces
  from public.organizations organization
  where organization.created_by = new.created_by;

  if owned_workspaces >= allowed_workspaces then
    raise exception 'WORKSPACE_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_workspace_limit() from public, anon, authenticated;

drop trigger if exists organizations_enforce_workspace_limit on public.organizations;
create trigger organizations_enforce_workspace_limit
before insert on public.organizations
for each row execute function private.enforce_workspace_limit();

create or replace function public.reschedule_appointment(
  target_organization_id uuid,
  target_appointment_id uuid,
  target_starts_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_duration interval;
begin
  select appointment.ends_at - appointment.starts_at
    into current_duration
  from public.appointments appointment
  where appointment.id = target_appointment_id
    and appointment.organization_id = target_organization_id
  for update;

  if current_duration is null then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.appointments
  set starts_at = target_starts_at,
      ends_at = target_starts_at + current_duration
  where id = target_appointment_id
    and organization_id = target_organization_id;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, after_data
  ) values (
    target_organization_id,
    (select auth.uid()),
    'appointment.rescheduled',
    'appointment',
    target_appointment_id::text,
    jsonb_build_object('starts_at', target_starts_at)
  );
end;
$$;

revoke all on function public.reschedule_appointment(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.reschedule_appointment(uuid, uuid, timestamptz) to authenticated;

create or replace function public.update_appointment_details(
  target_organization_id uuid,
  target_appointment_id uuid,
  target_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.appointments
  set notes = nullif(trim(target_notes), '')
  where id = target_appointment_id
    and organization_id = target_organization_id;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id
  ) values (
    target_organization_id,
    (select auth.uid()),
    'appointment.updated',
    'appointment',
    target_appointment_id::text
  );
end;
$$;

revoke all on function public.update_appointment_details(uuid, uuid, text) from public, anon;
grant execute on function public.update_appointment_details(uuid, uuid, text) to authenticated;

create or replace function public.set_organization_member_access(
  target_organization_id uuid,
  target_member_id uuid,
  target_active boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_role public.organization_role;
  target_user_id uuid;
begin
  select member.role, member.user_id
    into target_role, target_user_id
  from public.organization_members member
  where member.id = target_member_id
    and member.organization_id = target_organization_id;

  if target_role is null then
    raise exception 'MEMBER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if target_role = 'owner' or target_user_id = (select auth.uid()) then
    raise exception 'PROTECTED_MEMBER' using errcode = '42501';
  end if;

  update public.organization_members
  set active = target_active
  where id = target_member_id
    and organization_id = target_organization_id;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, after_data
  ) values (
    target_organization_id,
    (select auth.uid()),
    case when target_active then 'member.activated' else 'member.suspended' end,
    'organization_member',
    target_member_id::text,
    jsonb_build_object('active', target_active)
  );
end;
$$;

revoke all on function public.set_organization_member_access(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_organization_member_access(uuid, uuid, boolean) to authenticated;

create or replace function public.update_organization_settings(
  target_organization_id uuid,
  target_name text,
  target_niche_id text,
  target_primary_color text,
  target_accent_color text,
  target_soft_color text,
  target_line_color text,
  target_booking_notice_minutes integer,
  target_cancellation_notice_minutes integer,
  target_preferences jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.organizations
  set name = trim(target_name),
      niche_id = target_niche_id,
      booking_notice_minutes = target_booking_notice_minutes,
      cancellation_notice_minutes = target_cancellation_notice_minutes,
      preferences = target_preferences
  where id = target_organization_id;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.organization_themes
  set primary_color = target_primary_color,
      accent_color = target_accent_color,
      soft_color = target_soft_color,
      line_color = target_line_color
  where organization_id = target_organization_id;

  if not found then
    raise exception 'THEME_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id
  ) values (
    target_organization_id,
    (select auth.uid()),
    'organization.settings_updated',
    'organization',
    target_organization_id::text
  );
end;
$$;

revoke all on function public.update_organization_settings(uuid, text, text, text, text, text, text, integer, integer, jsonb) from public, anon;
grant execute on function public.update_organization_settings(uuid, text, text, text, text, text, text, integer, integer, jsonb) to authenticated;

create index if not exists organizations_created_by_idx
  on public.organizations (created_by, created_at desc);
