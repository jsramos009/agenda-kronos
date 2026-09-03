create or replace function public.create_appointment_with_work_item(
  target_organization_id uuid,
  target_customer_id uuid,
  target_service_id uuid,
  target_professional_member_id uuid,
  target_stage_id uuid,
  target_starts_at timestamptz,
  target_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  service_duration integer;
  new_appointment_id uuid := extensions.gen_random_uuid();
begin
  if caller_id is null or not (select private.has_organization_role(
    target_organization_id,
    array['owner', 'admin', 'reception']::public.organization_role[]
  )) then
    raise exception 'Sem permissão para criar agendamentos neste espaço.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers customer
    where customer.id = target_customer_id
      and customer.organization_id = target_organization_id
      and customer.active
  ) then
    raise exception 'Cliente não encontrado neste espaço.' using errcode = 'P0002';
  end if;

  select service.duration_minutes into service_duration
  from public.services service
  where service.id = target_service_id
    and service.organization_id = target_organization_id
    and service.active;

  if service_duration is null then
    raise exception 'Serviço não encontrado neste espaço.' using errcode = 'P0002';
  end if;

  if target_professional_member_id is not null and not exists (
    select 1 from public.organization_members professional
    where professional.id = target_professional_member_id
      and professional.organization_id = target_organization_id
      and professional.active
  ) then
    raise exception 'Profissional não encontrado neste espaço.' using errcode = 'P0002';
  end if;

  if target_stage_id is not null and not exists (
    select 1 from public.workflow_stages stage
    where stage.id = target_stage_id
      and stage.organization_id = target_organization_id
  ) then
    raise exception 'Etapa não encontrada neste espaço.' using errcode = 'P0002';
  end if;

  insert into public.appointments (
    id, organization_id, customer_id, service_id, professional_member_id,
    starts_at, ends_at, notes, created_by
  ) values (
    new_appointment_id, target_organization_id, target_customer_id, target_service_id,
    target_professional_member_id, target_starts_at,
    target_starts_at + make_interval(mins => service_duration), target_notes, caller_id
  );

  if target_stage_id is not null then
    insert into public.work_items (
      organization_id, appointment_id, stage_id, assignee_member_id
    ) values (
      target_organization_id, new_appointment_id, target_stage_id, target_professional_member_id
    );
  end if;

  return new_appointment_id;
end;
$$;

revoke all on function public.create_appointment_with_work_item(uuid, uuid, uuid, uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.create_appointment_with_work_item(uuid, uuid, uuid, uuid, uuid, timestamptz, text) to authenticated;
