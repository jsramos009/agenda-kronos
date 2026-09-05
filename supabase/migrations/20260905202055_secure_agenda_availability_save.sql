create or replace function public.update_organization_availability_v1(
  target_organization_id uuid,
  target_days smallint[],
  target_starts_at time,
  target_ends_at time,
  target_slot_interval_minutes integer,
  target_booking_notice_minutes integer,
  target_cancellation_notice_minutes integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_member_id uuid;
  selected_day smallint;
begin
  if (select auth.uid()) is null
     or not (select private.can_manage_organization(target_organization_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if coalesce(cardinality(target_days), 0) < 1
     or coalesce(cardinality(target_days), 0) > 7
     or not (target_days <@ array[0,1,2,3,4,5,6]::smallint[])
     or (select count(distinct value) from unnest(target_days) as value) <> cardinality(target_days)
     or target_starts_at >= target_ends_at
     or target_slot_interval_minutes not in (10, 15, 30, 60)
     or target_booking_notice_minutes not between 0 and 10080
     or target_cancellation_notice_minutes not between 0 and 43200 then
    raise exception 'INVALID_AVAILABILITY' using errcode = '22023';
  end if;

  select membership.id into actor_member_id
  from public.organization_members as membership
  where membership.organization_id = target_organization_id
    and membership.user_id = (select auth.uid())
    and membership.active
    and membership.role in ('owner', 'admin')
  limit 1;

  if actor_member_id is null then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = '42501';
  end if;

  update public.organizations
  set booking_notice_minutes = target_booking_notice_minutes,
      cancellation_notice_minutes = target_cancellation_notice_minutes,
      preferences = jsonb_set(
        coalesce(preferences, '{}'::jsonb),
        '{agenda}',
        coalesce(preferences -> 'agenda', '{}'::jsonb) || jsonb_build_object(
          'startsAt', to_char(target_starts_at, 'HH24:MI'),
          'endsAt', to_char(target_ends_at, 'HH24:MI'),
          'days', to_jsonb(target_days),
          'slotIntervalMinutes', target_slot_interval_minutes
        ), true)
  where id = target_organization_id;

  if not found then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.availability_rules
  set starts_at = target_starts_at, ends_at = target_ends_at, active = false
  where organization_id = target_organization_id
    and member_id = actor_member_id
    and resource_id is null;

  foreach selected_day in array target_days loop
    update public.availability_rules
    set starts_at = target_starts_at, ends_at = target_ends_at, active = true
    where organization_id = target_organization_id
      and member_id = actor_member_id
      and resource_id is null
      and weekday = selected_day;

    if not found then
      insert into public.availability_rules (organization_id, member_id, weekday, starts_at, ends_at, active)
      values (target_organization_id, actor_member_id, selected_day, target_starts_at, target_ends_at, true);
    end if;
  end loop;

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (target_organization_id, (select auth.uid()), 'organization.availability_updated', 'organization', target_organization_id::text,
    jsonb_build_object('days', target_days, 'startsAt', target_starts_at, 'endsAt', target_ends_at));
end;
$$;

revoke all on function public.update_organization_availability_v1(uuid, smallint[], time, time, integer, integer, integer) from public, anon;
grant execute on function public.update_organization_availability_v1(uuid, smallint[], time, time, integer, integer, integer) to authenticated;
