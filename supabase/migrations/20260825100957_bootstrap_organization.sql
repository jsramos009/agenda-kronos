-- Create the complete tenant baseline in one transaction. The function runs with
-- the caller's RLS permissions and therefore cannot bootstrap another user.
create or replace function public.bootstrap_organization(
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_description text,
  template_id text,
  owner_display_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  template public.niche_templates%rowtype;
  member_id uuid := extensions.gen_random_uuid();
  item jsonb;
  item_position integer := 0;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into template
  from public.niche_templates
  where id = template_id and active;

  if not found then
    raise exception 'NICHE_TEMPLATE_NOT_FOUND' using errcode = '22023';
  end if;

  insert into public.organizations (
    id, created_by, name, slug, description, niche_id, niche_template_version
  ) values (
    organization_id,
    actor_id,
    trim(organization_name),
    lower(trim(organization_slug)),
    nullif(trim(organization_description), ''),
    template.id,
    template.version
  );

  insert into public.organization_members (
    id, organization_id, user_id, role, display_name, color
  ) values (
    member_id,
    organization_id,
    actor_id,
    'owner',
    coalesce(nullif(trim(owner_display_name), ''), 'Administrador'),
    template.theme ->> 'primary'
  );

  insert into public.organization_themes (
    organization_id, primary_color, accent_color, soft_color, line_color, tokens, version
  ) values (
    organization_id,
    template.theme ->> 'primary',
    template.theme ->> 'accent',
    template.theme ->> 'soft',
    template.theme ->> 'line',
    jsonb_build_object('vocabulary', template.vocabulary),
    template.version
  );

  for item in select value from jsonb_array_elements(template.default_services)
  loop
    insert into public.services (
      organization_id, name, description, duration_minutes,
      buffer_after_minutes, requires_address, color
    ) values (
      organization_id,
      item ->> 'name',
      'Modelo inicial ' || template.label,
      (item ->> 'duration_minutes')::integer,
      coalesce((item ->> 'buffer_after_minutes')::integer, 0),
      coalesce((item ->> 'requires_address')::boolean, false),
      template.theme ->> 'primary'
    );
  end loop;

  for item in select value from jsonb_array_elements(template.default_workflow)
  loop
    insert into public.workflow_stages (
      organization_id, name, canonical_status, position, color
    ) values (
      organization_id,
      item ->> 'name',
      (item ->> 'status')::public.appointment_status,
      item_position,
      item ->> 'color'
    );
    item_position := item_position + 1;
  end loop;

  insert into public.availability_rules (
    organization_id, member_id, weekday, starts_at, ends_at
  )
  select organization_id, member_id, weekday, '08:00'::time, '18:00'::time
  from generate_series(1, 6) as weekday;

  insert into public.audit_events (
    organization_id, actor_id, action, entity_type, entity_id, after_data
  ) values (
    organization_id,
    actor_id,
    'organization.bootstrapped',
    'organization',
    organization_id::text,
    jsonb_build_object('niche_id', template.id, 'template_version', template.version)
  );

  return organization_id;
end;
$$;

revoke all on function public.bootstrap_organization(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.bootstrap_organization(uuid, text, text, text, text, text) to authenticated;

-- PostgreSQL is the final guard against two overlapping bookings for one professional.
create extension if not exists btree_gist with schema extensions;

alter table public.appointments
  add constraint appointments_no_professional_overlap
  exclude using gist (
    professional_member_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    professional_member_id is not null
    and starts_at is not null
    and ends_at is not null
    and status not in ('cancelled', 'no_show')
  );
