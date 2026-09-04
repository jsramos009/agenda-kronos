create table public.in_app_notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (char_length(type) between 3 and 80 and type ~ '^[a-z][a-z0-9_.-]+$'),
  title text not null check (char_length(title) between 2 and 160),
  message text not null check (char_length(message) between 2 and 500),
  entity_type text check (entity_type is null or char_length(entity_type) between 2 and 80),
  entity_id text check (entity_id is null or char_length(entity_id) between 1 and 160),
  event_key text not null check (char_length(event_key) between 8 and 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint in_app_notifications_event_dedupe
    unique (user_id, event_key)
);

create index in_app_notifications_user_created_idx
  on public.in_app_notifications (user_id, created_at desc);

create index in_app_notifications_user_unread_idx
  on public.in_app_notifications (user_id, created_at desc)
  where read_at is null;

create index in_app_notifications_organization_idx
  on public.in_app_notifications (organization_id, created_at desc);

revoke all on public.in_app_notifications from public, anon, authenticated;
grant select on public.in_app_notifications to authenticated;
grant update (read_at) on public.in_app_notifications to authenticated;

alter table public.in_app_notifications enable row level security;

create policy in_app_notifications_select_recipient
  on public.in_app_notifications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_organization_member(organization_id))
  );

create policy in_app_notifications_update_recipient
  on public.in_app_notifications
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select private.is_organization_member(organization_id))
  )
  with check (
    user_id = (select auth.uid())
    and (select private.is_organization_member(organization_id))
  );

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
        || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || '.'
    end;
  elsif new.status = 'cancelled' and old.status is distinct from new.status then
    event_type := 'appointment.cancelled';
    event_title := 'Agendamento cancelado';
    event_message := case
      when new.starts_at is null then 'Um item da agenda foi cancelado.'
      else 'O agendamento de '
        || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
        || ' foi cancelado.'
    end;
  elsif row(new.starts_at, new.ends_at, new.status, new.customer_id, new.service_id, new.professional_member_id)
    is distinct from row(old.starts_at, old.ends_at, old.status, old.customer_id, old.service_id, old.professional_member_id) then
    event_type := 'appointment.updated';
    event_title := 'Agendamento atualizado';
    event_message := case
      when new.starts_at is null then 'Um item da agenda foi atualizado.'
      else 'O agendamento de '
        || to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
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

drop trigger if exists appointments_notify_members on public.appointments;
create trigger appointments_notify_members
  after insert or update on public.appointments
  for each row execute function private.notify_appointment_members();
