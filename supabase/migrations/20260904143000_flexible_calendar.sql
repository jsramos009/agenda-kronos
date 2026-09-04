-- Flexible calendar: explicit event ranges, optional CRM links and tenant agenda cadence.
alter type public.appointment_kind add value if not exists 'custom';
alter type public.appointment_kind add value if not exists 'blocked';
alter type public.appointment_kind add value if not exists 'internal';
alter type public.appointment_kind add value if not exists 'meeting';
alter type public.appointment_kind add value if not exists 'other';

alter table public.appointments
  alter column customer_id drop not null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists color text;

alter table public.appointments drop constraint if exists appointments_title_length_check;
alter table public.appointments add constraint appointments_title_length_check
  check (title is null or char_length(title) between 2 and 120) not valid;
alter table public.appointments validate constraint appointments_title_length_check;

alter table public.appointments drop constraint if exists appointments_description_length_check;
alter table public.appointments add constraint appointments_description_length_check
  check (description is null or char_length(description) <= 1000) not valid;
alter table public.appointments validate constraint appointments_description_length_check;

alter table public.appointments drop constraint if exists appointments_location_length_check;
alter table public.appointments add constraint appointments_location_length_check
  check (location is null or char_length(location) <= 240) not valid;
alter table public.appointments validate constraint appointments_location_length_check;

alter table public.appointments drop constraint if exists appointments_color_check;
alter table public.appointments add constraint appointments_color_check
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$') not valid;
alter table public.appointments validate constraint appointments_color_check;

alter table public.appointments drop constraint if exists appointments_identity_check;
alter table public.appointments add constraint appointments_identity_check
  check (kind = 'deadline' or title is not null or customer_id is not null or service_id is not null) not valid;
alter table public.appointments validate constraint appointments_identity_check;

create or replace function public.create_flexible_appointment(
  target_organization_id uuid,
  target_title text,
  target_description text,
  target_location text,
  target_color text,
  target_kind text,
  target_customer_id uuid,
  target_service_id uuid,
  target_professional_member_id uuid,
  target_stage_id uuid,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_notes text,
  target_reminder_minutes integer default 0
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_id uuid;
  reminder_customer public.customers%rowtype;
  tenant_timezone text;
begin
  if target_starts_at is null or target_ends_at is null or target_ends_at <= target_starts_at then
    raise exception 'INVALID_EVENT_RANGE' using errcode = '22007';
  end if;
  if target_ends_at > target_starts_at + interval '24 hours' then
    raise exception 'EVENT_TOO_LONG' using errcode = '22023';
  end if;
  if target_kind not in ('appointment','visit','consultation','return','hearing','work_order','custom','blocked','internal','meeting','other') then
    raise exception 'INVALID_EVENT_KIND' using errcode = '22023';
  end if;
  if nullif(trim(target_title), '') is null and target_customer_id is null and target_service_id is null then
    raise exception 'EVENT_IDENTITY_REQUIRED' using errcode = '23514';
  end if;
  if target_customer_id is not null and not exists (
    select 1 from public.customers where id = target_customer_id and organization_id = target_organization_id
  ) then raise exception 'CUSTOMER_NOT_IN_ORGANIZATION' using errcode = '23503'; end if;
  if target_service_id is not null and not exists (
    select 1 from public.services where id = target_service_id and organization_id = target_organization_id
  ) then raise exception 'SERVICE_NOT_IN_ORGANIZATION' using errcode = '23503'; end if;
  if target_professional_member_id is not null and not exists (
    select 1 from public.organization_members where id = target_professional_member_id and organization_id = target_organization_id and active
  ) then raise exception 'MEMBER_NOT_IN_ORGANIZATION' using errcode = '23503'; end if;
  if target_stage_id is not null and not exists (
    select 1 from public.workflow_stages where id = target_stage_id and organization_id = target_organization_id and active and visible
  ) then raise exception 'STAGE_NOT_IN_ORGANIZATION' using errcode = '23503'; end if;

  if target_reminder_minutes is null or target_reminder_minutes < 0 or target_reminder_minutes > 10080 then raise exception 'INVALID_REMINDER' using errcode='22023'; end if;
  select timezone into tenant_timezone from public.organizations where id=target_organization_id;
  select * into reminder_customer from public.customers where id=target_customer_id and organization_id=target_organization_id;

  insert into public.appointments (
    organization_id, title, description, location, color, kind, customer_id, service_id,
    professional_member_id, starts_at, ends_at, notes, created_by, timezone
  ) values (
    target_organization_id, nullif(trim(target_title), ''), nullif(trim(target_description), ''),
    nullif(trim(target_location), ''), target_color, target_kind::public.appointment_kind,
    target_customer_id, target_service_id, target_professional_member_id,
    target_starts_at, target_ends_at, nullif(trim(target_notes), ''), (select auth.uid()), coalesce(tenant_timezone,'America/Sao_Paulo')
  ) returning id into created_id;

  if target_stage_id is not null then
    insert into public.work_items (organization_id, appointment_id, stage_id, assignee_member_id)
    select target_organization_id, created_id, stage.id, target_professional_member_id
    from public.workflow_stages stage
    where stage.id = target_stage_id and stage.organization_id = target_organization_id;
  end if;

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (target_organization_id, (select auth.uid()), 'appointment.created', 'appointment', created_id::text,
    jsonb_build_object('starts_at', target_starts_at, 'ends_at', target_ends_at, 'kind', target_kind));
  if target_reminder_minutes > 0 and target_starts_at - make_interval(mins => target_reminder_minutes) > now()
    and coalesce(nullif(reminder_customer.email,''),nullif(reminder_customer.phone,'')) is not null then
    insert into public.notification_jobs (organization_id,appointment_id,channel,template_key,recipient,scheduled_for)
    values (target_organization_id,created_id,
      case when nullif(reminder_customer.email,'') is not null then 'email'::public.notification_channel else 'whatsapp'::public.notification_channel end,
      'appointment_reminder',coalesce(nullif(reminder_customer.email,''),nullif(reminder_customer.phone,'')),
      target_starts_at - make_interval(mins => target_reminder_minutes));
  end if;
  return created_id;
end;
$$;

revoke all on function public.create_flexible_appointment(uuid,text,text,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,integer) from public, anon;
grant execute on function public.create_flexible_appointment(uuid,text,text,text,text,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,integer) to authenticated;

create or replace function public.update_flexible_appointment_time(
  target_organization_id uuid,
  target_appointment_id uuid,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_action text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_row public.appointments%rowtype;
begin
  if target_starts_at is null or target_ends_at is null or target_ends_at <= target_starts_at or target_ends_at > target_starts_at + interval '24 hours' then
    raise exception 'INVALID_EVENT_RANGE' using errcode = '22007';
  end if;
  if target_action not in ('appointment.rescheduled', 'appointment.resized') then
    raise exception 'INVALID_AUDIT_ACTION' using errcode = '22023';
  end if;
  select * into previous_row from public.appointments
  where id = target_appointment_id and organization_id = target_organization_id for update;
  if previous_row.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.appointments set starts_at = target_starts_at, ends_at = target_ends_at
  where id = target_appointment_id and organization_id = target_organization_id;
  update public.notification_jobs
  set scheduled_for = target_starts_at - (previous_row.starts_at - scheduled_for)
  where appointment_id = target_appointment_id
    and organization_id = target_organization_id
    and status = 'pending';
  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (target_organization_id, (select auth.uid()), target_action, 'appointment', target_appointment_id::text,
    jsonb_build_object('starts_at', previous_row.starts_at, 'ends_at', previous_row.ends_at),
    jsonb_build_object('starts_at', target_starts_at, 'ends_at', target_ends_at));
end;
$$;

revoke all on function public.update_flexible_appointment_time(uuid,uuid,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.update_flexible_appointment_time(uuid,uuid,timestamptz,timestamptz,text) to authenticated;

create or replace function public.update_flexible_appointment(
  target_organization_id uuid,
  target_appointment_id uuid,
  target_title text,
  target_description text,
  target_location text,
  target_color text,
  target_customer_id uuid,
  target_service_id uuid,
  target_starts_at timestamptz,
  target_ends_at timestamptz,
  target_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare previous_row public.appointments%rowtype;
begin
  if target_starts_at is null or target_ends_at is null or target_ends_at <= target_starts_at or target_ends_at > target_starts_at + interval '24 hours' then raise exception 'INVALID_EVENT_RANGE' using errcode = '22007'; end if;
  if nullif(trim(target_title), '') is null and target_customer_id is null and target_service_id is null then raise exception 'EVENT_IDENTITY_REQUIRED' using errcode = '23514'; end if;
  if target_customer_id is not null and not exists (select 1 from public.customers where id=target_customer_id and organization_id=target_organization_id) then raise exception 'CUSTOMER_NOT_IN_ORGANIZATION' using errcode='23503'; end if;
  if target_service_id is not null and not exists (select 1 from public.services where id=target_service_id and organization_id=target_organization_id) then raise exception 'SERVICE_NOT_IN_ORGANIZATION' using errcode='23503'; end if;
  select * into previous_row from public.appointments where id=target_appointment_id and organization_id=target_organization_id for update;
  if previous_row.id is null then raise exception 'APPOINTMENT_NOT_FOUND' using errcode='P0002'; end if;
  update public.appointments set title=nullif(trim(target_title),''), description=nullif(trim(target_description),''), location=nullif(trim(target_location),''), color=target_color, customer_id=target_customer_id, service_id=target_service_id, starts_at=target_starts_at, ends_at=target_ends_at, notes=nullif(trim(target_notes),'')
  where id=target_appointment_id and organization_id=target_organization_id;
  update public.notification_jobs jobs set
    scheduled_for=target_starts_at-(previous_row.starts_at-jobs.scheduled_for),
    recipient=case when previous_row.customer_id is distinct from target_customer_id
      then coalesce((select case jobs.channel when 'email' then nullif(c.email,'') when 'whatsapp' then nullif(c.phone,'') when 'sms' then nullif(c.phone,'') else null end from public.customers c where c.id=target_customer_id and c.organization_id=target_organization_id),jobs.recipient)
      else jobs.recipient end,
    status=case when previous_row.customer_id is distinct from target_customer_id and not exists (
      select 1 from public.customers c where c.id=target_customer_id and c.organization_id=target_organization_id and
      case jobs.channel when 'email' then nullif(c.email,'') is not null when 'whatsapp' then nullif(c.phone,'') is not null when 'sms' then nullif(c.phone,'') is not null else false end)
      then 'cancelled'::public.notification_status else jobs.status end
  where appointment_id=target_appointment_id and organization_id=target_organization_id and status='pending';
  insert into public.audit_events (organization_id,actor_id,action,entity_type,entity_id,before_data,after_data)
  values (target_organization_id,(select auth.uid()),'appointment.updated','appointment',target_appointment_id::text,
    jsonb_build_object('title',previous_row.title,'starts_at',previous_row.starts_at,'ends_at',previous_row.ends_at),
    jsonb_build_object('title',target_title,'starts_at',target_starts_at,'ends_at',target_ends_at));
end;
$$;
revoke all on function public.update_flexible_appointment(uuid,uuid,text,text,text,text,uuid,uuid,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.update_flexible_appointment(uuid,uuid,text,text,text,text,uuid,uuid,timestamptz,timestamptz,text) to authenticated;

create or replace function private.notify_appointment_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_actor uuid := (select auth.uid());
  event_type text;
  event_title text;
  event_message text;
  event_key text;
  operation_id uuid := extensions.gen_random_uuid();
  event_time timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    event_actor := coalesce(event_actor, new.created_by);
    event_type := 'appointment.created';
    event_title := 'Novo agendamento';
    event_message := case
      when new.starts_at is null then 'Um novo item foi incluído na agenda.'
      else 'Um agendamento foi criado para '
        || to_char(new.starts_at at time zone coalesce((select timezone from public.organizations where id = new.organization_id), 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI') || '.'
    end;
  elsif new.status = 'cancelled' and old.status is distinct from new.status then
    event_type := 'appointment.cancelled';
    event_title := 'Agendamento cancelado';
    event_message := case
      when new.starts_at is null then 'Um item da agenda foi cancelado.'
      else 'O agendamento de '
        || to_char(new.starts_at at time zone coalesce((select timezone from public.organizations where id = new.organization_id), 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI')
        || ' foi cancelado.'
    end;
  elsif row(new.starts_at, new.ends_at, new.status, new.customer_id, new.service_id, new.professional_member_id)
    is distinct from row(old.starts_at, old.ends_at, old.status, old.customer_id, old.service_id, old.professional_member_id) then
    event_type := 'appointment.updated';
    event_title := 'Agendamento atualizado';
    event_message := case
      when new.starts_at is null then 'Um item da agenda foi atualizado.'
      else 'O agendamento de '
        || to_char(new.starts_at at time zone coalesce((select timezone from public.organizations where id = new.organization_id), 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI')
        || ' foi atualizado.'
    end;
  else
    return new;
  end if;

  event_key := concat(
    'appointment:', new.id::text, ':', event_type, ':',
    operation_id::text
  );

  insert into public.in_app_notifications (
    organization_id,
    user_id,
    actor_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    event_key,
    metadata,
    created_at
  )
  select
    new.organization_id,
    membership.user_id,
    event_actor,
    event_type,
    event_title,
    event_message,
    'appointment',
    new.id::text,
    event_key,
    jsonb_build_object(
      'status', new.status,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at
    ),
    event_time
  from public.organization_members membership
  where membership.organization_id = new.organization_id
    and membership.active
    and (
      membership.role in ('owner', 'admin', 'reception')
      or (
        membership.role = 'professional'
        and membership.id = new.professional_member_id
      )
    )
    and (event_actor is null or membership.user_id <> event_actor)
  on conflict on constraint in_app_notifications_event_dedupe do nothing;

  return new;
end;
$$;

revoke all on function private.notify_appointment_members() from public, anon, authenticated;
