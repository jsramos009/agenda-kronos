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
    select 1 from public.workflow_stages where id = target_stage_id and organization_id = target_organization_id and visible
  ) then raise exception 'STAGE_NOT_IN_ORGANIZATION' using errcode = '23503'; end if;
  if target_reminder_minutes is null or target_reminder_minutes < 0 or target_reminder_minutes > 10080 then
    raise exception 'INVALID_REMINDER' using errcode='22023';
  end if;

  select timezone into tenant_timezone from public.organizations where id = target_organization_id;
  select * into reminder_customer from public.customers where id = target_customer_id and organization_id = target_organization_id;

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
    where stage.id = target_stage_id and stage.organization_id = target_organization_id and stage.visible;
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
