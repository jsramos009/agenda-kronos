-- Keep subscription writes behind a narrow server-owned operation. Browser
-- roles cannot choose provider, status, URL, receipt or transaction fields.

create or replace function private.ensure_pending_subscription(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not (select private.can_manage_organization(target_organization_id)) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  insert into public.subscriptions (
    organization_id,
    provider,
    provider_plan_url,
    status
  ) values (
    target_organization_id,
    'infinitepay',
    'https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ',
    'pending'
  )
  on conflict (organization_id) do nothing;
end;
$$;

revoke all on function private.ensure_pending_subscription(uuid) from public, anon;
grant execute on function private.ensure_pending_subscription(uuid) to authenticated;

create or replace function public.bootstrap_organization_v2(
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_description text,
  template_id text,
  owner_display_name text,
  configuration jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  theme jsonb := configuration -> 'theme';
  operation jsonb := configuration -> 'operation';
  selected_services jsonb := configuration -> 'selectedServices';
  workflow_names jsonb := configuration -> 'workflowNames';
  business_starts_at time;
  business_ends_at time;
  workflow_item record;
begin
  if configuration is null
     or jsonb_typeof(configuration) <> 'object'
     or octet_length(configuration::text) > 32768 then
    raise exception 'INVALID_CONFIGURATION' using errcode = '22023';
  end if;

  if jsonb_typeof(theme) <> 'object'
     or coalesce(theme ->> 'primary', '') !~ '^#[0-9A-Fa-f]{6}$'
     or coalesce(theme ->> 'accent', '') !~ '^#[0-9A-Fa-f]{6}$'
     or coalesce(theme ->> 'soft', '') !~ '^#[0-9A-Fa-f]{6}$'
     or coalesce(theme ->> 'line', '') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'INVALID_THEME' using errcode = '22023';
  end if;

  business_starts_at := coalesce(nullif(operation ->> 'startsAt', ''), '08:00')::time;
  business_ends_at := coalesce(nullif(operation ->> 'endsAt', ''), '18:00')::time;
  if business_ends_at <= business_starts_at then
    raise exception 'INVALID_BUSINESS_HOURS' using errcode = '22023';
  end if;

  perform public.bootstrap_organization(
    bootstrap_organization_v2.organization_id,
    bootstrap_organization_v2.organization_name,
    bootstrap_organization_v2.organization_slug,
    bootstrap_organization_v2.organization_description,
    bootstrap_organization_v2.template_id,
    bootstrap_organization_v2.owner_display_name
  );

  update public.organizations as target_organization
  set preferences = bootstrap_organization_v2.configuration || jsonb_build_object('onboardingVersion', 2),
      onboarding_completed_at = now()
  where target_organization.id = bootstrap_organization_v2.organization_id;

  update public.organization_themes as target_theme
  set primary_color = theme ->> 'primary',
      accent_color = theme ->> 'accent',
      soft_color = theme ->> 'soft',
      line_color = theme ->> 'line'
  where target_theme.organization_id = bootstrap_organization_v2.organization_id;

  update public.availability_rules as target_rule
  set starts_at = business_starts_at,
      ends_at = business_ends_at,
      active = exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(operation -> 'days') = 'array' and jsonb_array_length(operation -> 'days') > 0
              then operation -> 'days'
            else '[1,2,3,4,5,6]'::jsonb
          end
        ) as selected_day(value)
        where selected_day.value::integer = target_rule.weekday
      )
  where target_rule.organization_id = bootstrap_organization_v2.organization_id;

  insert into public.availability_rules (
    organization_id, member_id, weekday, starts_at, ends_at
  )
  select
    bootstrap_organization_v2.organization_id,
    member.id,
    day.value::smallint,
    business_starts_at,
    business_ends_at
  from public.organization_members as member
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(operation -> 'days') = 'array' and jsonb_array_length(operation -> 'days') > 0
        then operation -> 'days'
      else '[1,2,3,4,5,6]'::jsonb
    end
  ) as day(value)
  where member.organization_id = bootstrap_organization_v2.organization_id
    and member.user_id = (select auth.uid())
    and day.value::integer between 0 and 6
    and not exists (
      select 1
      from public.availability_rules as existing_rule
      where existing_rule.organization_id = bootstrap_organization_v2.organization_id
        and existing_rule.member_id = member.id
        and existing_rule.weekday = day.value::smallint
    );

  if jsonb_typeof(selected_services) = 'array' and jsonb_array_length(selected_services) > 0 then
    update public.services as target_service
    set active = exists (
        select 1
        from jsonb_array_elements_text(selected_services) as selected(name)
        where selected.name = target_service.name
      )
    where target_service.organization_id = bootstrap_organization_v2.organization_id;
  end if;

  if jsonb_typeof(workflow_names) = 'array' then
    for workflow_item in
      select trim(value) as name, ordinality - 1 as position
      from jsonb_array_elements_text(workflow_names) with ordinality
    loop
      if char_length(workflow_item.name) between 2 and 80 then
        update public.workflow_stages as target_stage
        set name = workflow_item.name
        where target_stage.organization_id = bootstrap_organization_v2.organization_id
          and target_stage.position = workflow_item.position;
      end if;
    end loop;
  end if;

  perform private.ensure_pending_subscription(bootstrap_organization_v2.organization_id);
  return bootstrap_organization_v2.organization_id;
end;
$$;

revoke all on function public.bootstrap_organization_v2(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.bootstrap_organization_v2(uuid, text, text, text, text, text, jsonb) to authenticated;
