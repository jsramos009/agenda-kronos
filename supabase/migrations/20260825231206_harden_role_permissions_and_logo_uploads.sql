-- Enforce the role model at the database boundary. UI checks are convenience only;
-- every direct Data API request must still pass these policies.

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
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
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function private.can_access_appointment(target_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.appointments appointment
    join public.organization_members membership
      on membership.organization_id = appointment.organization_id
     and membership.user_id = (select auth.uid())
     and membership.active
    where appointment.id = target_appointment_id
      and (
        membership.role in ('owner', 'admin', 'reception')
        or (membership.role = 'professional' and appointment.professional_member_id = membership.id)
      )
  );
$$;

create or replace function private.can_access_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers customer
    join public.organization_members membership
      on membership.organization_id = customer.organization_id
     and membership.user_id = (select auth.uid())
     and membership.active
    where customer.id = target_customer_id
      and (
        membership.role in ('owner', 'admin', 'reception')
        or (
          membership.role = 'professional'
          and exists (
            select 1 from public.appointments appointment
            where appointment.customer_id = customer.id
              and appointment.professional_member_id = membership.id
          )
        )
      )
  );
$$;

revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public, anon;
revoke all on function private.can_access_appointment(uuid) from public, anon;
revoke all on function private.can_access_customer(uuid) from public, anon;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.can_access_appointment(uuid) to authenticated;
grant execute on function private.can_access_customer(uuid) to authenticated;

-- Prevent cross-tenant foreign-key combinations even when valid UUIDs are supplied.
create unique index if not exists customers_org_id_unique on public.customers (organization_id, id);
create unique index if not exists services_org_id_unique on public.services (organization_id, id);
create unique index if not exists members_org_id_unique on public.organization_members (organization_id, id);
create unique index if not exists resources_org_id_unique on public.resources (organization_id, id);
create unique index if not exists appointments_org_id_unique on public.appointments (organization_id, id);
create unique index if not exists workflow_stages_org_id_unique on public.workflow_stages (organization_id, id);

alter table public.appointments
  add constraint appointments_customer_same_org foreign key (organization_id, customer_id) references public.customers (organization_id, id),
  add constraint appointments_service_same_org foreign key (organization_id, service_id) references public.services (organization_id, id),
  add constraint appointments_professional_same_org foreign key (organization_id, professional_member_id) references public.organization_members (organization_id, id);

alter table public.availability_rules
  add constraint availability_rules_member_same_org foreign key (organization_id, member_id) references public.organization_members (organization_id, id),
  add constraint availability_rules_resource_same_org foreign key (organization_id, resource_id) references public.resources (organization_id, id);

alter table public.availability_exceptions
  add constraint availability_exceptions_member_same_org foreign key (organization_id, member_id) references public.organization_members (organization_id, id),
  add constraint availability_exceptions_resource_same_org foreign key (organization_id, resource_id) references public.resources (organization_id, id);

alter table public.work_items
  add constraint work_items_appointment_same_org foreign key (organization_id, appointment_id) references public.appointments (organization_id, id),
  add constraint work_items_stage_same_org foreign key (organization_id, stage_id) references public.workflow_stages (organization_id, id),
  add constraint work_items_assignee_same_org foreign key (organization_id, assignee_member_id) references public.organization_members (organization_id, id);

alter table public.waitlist_entries
  add constraint waitlist_customer_same_org foreign key (organization_id, customer_id) references public.customers (organization_id, id),
  add constraint waitlist_service_same_org foreign key (organization_id, service_id) references public.services (organization_id, id),
  add constraint waitlist_professional_same_org foreign key (organization_id, professional_member_id) references public.organization_members (organization_id, id);

alter table public.notification_jobs
  add constraint notification_appointment_same_org foreign key (organization_id, appointment_id) references public.appointments (organization_id, id);

-- Replace broad member-write policies with role-aware policies.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'resources', 'services', 'availability_rules', 'availability_exceptions',
    'workflow_stages'
  ] loop
    execute format('drop policy if exists %I_select_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_delete_admin on public.%I', table_name, table_name);
    execute format('create policy %I_select_member on public.%I for select to authenticated using ((select private.is_organization_member(organization_id)))', table_name, table_name);
    execute format('create policy %I_insert_admin on public.%I for insert to authenticated with check ((select private.can_manage_organization(organization_id)))', table_name, table_name);
    execute format('create policy %I_update_admin on public.%I for update to authenticated using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)))', table_name, table_name);
    execute format('create policy %I_delete_admin on public.%I for delete to authenticated using ((select private.can_manage_organization(organization_id)))', table_name, table_name);
  end loop;
end $$;

drop policy if exists customers_select_member on public.customers;
drop policy if exists customers_insert_member on public.customers;
drop policy if exists customers_update_member on public.customers;
create policy customers_select_by_role on public.customers for select to authenticated using ((select private.can_access_customer(id)));
create policy customers_insert_operator on public.customers for insert to authenticated with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));
create policy customers_update_operator on public.customers for update to authenticated using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));

drop policy if exists appointments_select_member on public.appointments;
drop policy if exists appointments_insert_member on public.appointments;
drop policy if exists appointments_update_member on public.appointments;
create policy appointments_select_by_role on public.appointments for select to authenticated using ((select private.can_access_appointment(id)));
create policy appointments_insert_operator on public.appointments for insert to authenticated with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));
create policy appointments_update_operator on public.appointments for update to authenticated using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));

drop policy if exists work_items_select_member on public.work_items;
drop policy if exists work_items_insert_member on public.work_items;
drop policy if exists work_items_update_member on public.work_items;
create policy work_items_select_by_role on public.work_items for select to authenticated using ((select private.can_access_appointment(appointment_id)));
create policy work_items_insert_operator on public.work_items for insert to authenticated with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));
create policy work_items_update_operator on public.work_items for update to authenticated using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));

do $$
declare table_name text;
begin
  foreach table_name in array array['waitlist_entries', 'notification_jobs'] loop
    execute format('drop policy if exists %I_select_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_insert_member on public.%I', table_name, table_name);
    execute format('drop policy if exists %I_update_member on public.%I', table_name, table_name);
    execute format('create policy %I_select_operator on public.%I for select to authenticated using ((select private.has_organization_role(organization_id, array[''owner'', ''admin'', ''reception'']::public.organization_role[])))', table_name, table_name);
    execute format('create policy %I_insert_operator on public.%I for insert to authenticated with check ((select private.has_organization_role(organization_id, array[''owner'', ''admin'', ''reception'']::public.organization_role[])))', table_name, table_name);
    execute format('create policy %I_update_operator on public.%I for update to authenticated using ((select private.has_organization_role(organization_id, array[''owner'', ''admin'', ''reception'']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array[''owner'', ''admin'', ''reception'']::public.organization_role[])))', table_name, table_name);
  end loop;
end $$;

drop policy if exists knowledge_articles_insert_member on public.knowledge_articles;
drop policy if exists knowledge_articles_update_member on public.knowledge_articles;
create policy knowledge_articles_insert_operator on public.knowledge_articles for insert to authenticated with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));
create policy knowledge_articles_update_operator on public.knowledge_articles for update to authenticated using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))) with check ((select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[])));

drop policy if exists recommendations_select_member on public.recommendations;
drop policy if exists recommendations_insert_member on public.recommendations;
drop policy if exists recommendations_update_member on public.recommendations;
create policy recommendations_select_analyst on public.recommendations for select to authenticated using ((select private.has_organization_role(organization_id, array['owner', 'admin', 'analyst']::public.organization_role[])));
create policy recommendations_insert_admin on public.recommendations for insert to authenticated with check ((select private.can_manage_organization(organization_id)));
create policy recommendations_update_admin on public.recommendations for update to authenticated using ((select private.can_manage_organization(organization_id))) with check ((select private.can_manage_organization(organization_id)));

drop policy if exists status_history_select_member on public.appointment_status_history;
create policy status_history_select_by_role on public.appointment_status_history for select to authenticated using ((select private.can_access_appointment(appointment_id)));

drop policy if exists audit_events_insert_member on public.audit_events;
create policy audit_events_insert_operator on public.audit_events for insert to authenticated with check (
  (select private.has_organization_role(organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))
  and (actor_id is null or actor_id = (select auth.uid()))
);

drop policy if exists service_resources_insert_member on public.service_resources;
drop policy if exists service_resources_delete_admin on public.service_resources;
create policy service_resources_insert_admin on public.service_resources for insert to authenticated with check (
  exists (
    select 1 from public.services service
    join public.resources resource on resource.id = service_resources.resource_id and resource.organization_id = service.organization_id
    where service.id = service_resources.service_id and (select private.can_manage_organization(service.organization_id))
  )
);
create policy service_resources_update_admin on public.service_resources for update to authenticated using (
  exists (select 1 from public.services service where service.id = service_resources.service_id and (select private.can_manage_organization(service.organization_id)))
) with check (
  exists (
    select 1 from public.services service
    join public.resources resource on resource.id = service_resources.resource_id and resource.organization_id = service.organization_id
    where service.id = service_resources.service_id and (select private.can_manage_organization(service.organization_id))
  )
);
create policy service_resources_delete_admin on public.service_resources for delete to authenticated using (
  exists (select 1 from public.services service where service.id = service_resources.service_id and (select private.can_manage_organization(service.organization_id)))
);

drop policy if exists appointment_resources_select_member on public.appointment_resources;
drop policy if exists appointment_resources_insert_member on public.appointment_resources;
drop policy if exists appointment_resources_delete_member on public.appointment_resources;
create policy appointment_resources_select_by_role on public.appointment_resources for select to authenticated using ((select private.can_access_appointment(appointment_resources.appointment_id)));
create policy appointment_resources_insert_operator on public.appointment_resources for insert to authenticated with check (
  exists (
    select 1 from public.appointments appointment
    join public.resources resource on resource.id = appointment_resources.resource_id and resource.organization_id = appointment.organization_id
    where appointment.id = appointment_resources.appointment_id
      and (select private.has_organization_role(appointment.organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))
  )
);
create policy appointment_resources_delete_operator on public.appointment_resources for delete to authenticated using (
  exists (
    select 1 from public.appointments appointment
    where appointment.id = appointment_resources.appointment_id
      and (select private.has_organization_role(appointment.organization_id, array['owner', 'admin', 'reception']::public.organization_role[]))
  )
);

-- Keep uploaded files passive: public SVG can execute active content in some contexts.
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'organization-logos';

-- One transaction creates the appointment and its workflow card.
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
  service_duration integer;
  new_appointment_id uuid;
begin
  select service.duration_minutes into service_duration
  from public.services service
  where service.id = target_service_id and service.organization_id = target_organization_id;

  if service_duration is null then
    raise exception 'Serviço não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.appointments (
    organization_id, customer_id, service_id, professional_member_id,
    starts_at, ends_at, notes, created_by
  ) values (
    target_organization_id, target_customer_id, target_service_id, target_professional_member_id,
    target_starts_at, target_starts_at + make_interval(mins => service_duration), target_notes, (select auth.uid())
  ) returning id into new_appointment_id;

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

-- Move the workflow card and appointment status together or not at all.
create or replace function public.move_work_item(
  target_organization_id uuid,
  target_work_item_id uuid,
  target_stage_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_status public.appointment_status;
  target_appointment_id uuid;
begin
  select stage.canonical_status into target_status
  from public.workflow_stages stage
  where stage.id = target_stage_id and stage.organization_id = target_organization_id;

  select item.appointment_id into target_appointment_id
  from public.work_items item
  where item.id = target_work_item_id and item.organization_id = target_organization_id;

  if target_status is null or target_appointment_id is null then
    raise exception 'Etapa ou atendimento não encontrado.' using errcode = 'P0002';
  end if;

  update public.work_items
  set stage_id = target_stage_id, entered_stage_at = now()
  where id = target_work_item_id and organization_id = target_organization_id;

  update public.appointments
  set status = target_status
  where id = target_appointment_id and organization_id = target_organization_id;
end;
$$;

revoke all on function public.move_work_item(uuid, uuid, uuid) from public, anon;
grant execute on function public.move_work_item(uuid, uuid, uuid) to authenticated;

-- Organization identity and visual theme are one logical setting change.
create or replace function public.update_organization_identity(
  target_organization_id uuid,
  target_name text,
  target_niche_id text,
  target_primary_color text,
  target_accent_color text,
  target_soft_color text,
  target_line_color text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.organizations
  set name = target_name, niche_id = target_niche_id
  where id = target_organization_id;

  if not found then
    raise exception 'Organização não encontrada.' using errcode = 'P0002';
  end if;

  update public.organization_themes
  set primary_color = target_primary_color,
      accent_color = target_accent_color,
      soft_color = target_soft_color,
      line_color = target_line_color
  where organization_id = target_organization_id;

  if not found then
    raise exception 'Tema da organização não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_organization_identity(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_organization_identity(uuid, text, text, text, text, text, text) to authenticated;
