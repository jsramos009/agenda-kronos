-- Persist editable tenant identity without discarding onboarding preferences.
create or replace function public.update_organization_settings_v2(
  target_organization_id uuid,
  target_name text,
  target_description text,
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
  if jsonb_typeof(coalesce(target_preferences, '{}'::jsonb)) <> 'object' then
    raise exception 'INVALID_PREFERENCES' using errcode = '22023';
  end if;

  update public.organizations
  set name = trim(target_name),
      description = nullif(trim(target_description), ''),
      niche_id = target_niche_id,
      booking_notice_minutes = target_booking_notice_minutes,
      cancellation_notice_minutes = target_cancellation_notice_minutes,
      preferences = coalesce(preferences, '{}'::jsonb) || coalesce(target_preferences, '{}'::jsonb)
  where id = target_organization_id;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.organization_themes
  set primary_color = target_primary_color,
      accent_color = target_accent_color,
      soft_color = target_soft_color,
      line_color = target_line_color,
      version = version + 1
  where organization_id = target_organization_id;

  if not found then
    raise exception 'THEME_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id)
  values (target_organization_id, (select auth.uid()), 'organization.settings_updated', 'organization', target_organization_id::text);
end;
$$;

revoke all on function public.update_organization_settings_v2(uuid, text, text, text, text, text, text, text, integer, integer, jsonb) from public, anon;
grant execute on function public.update_organization_settings_v2(uuid, text, text, text, text, text, text, text, integer, integer, jsonb) to authenticated;
