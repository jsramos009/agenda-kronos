alter table public.recommendations
  add column if not exists read_at timestamptz;

create index if not exists recommendations_unread_created_idx
  on public.recommendations (organization_id, created_at desc)
  where read_at is null;

create or replace function public.mark_recommendation_read(
  target_organization_id uuid,
  target_recommendation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_organization_role(
    target_organization_id,
    array['owner', 'admin', 'analyst']::public.organization_role[]
  ) then
    raise insufficient_privilege using message = 'Not allowed to read this recommendation';
  end if;

  update public.recommendations
  set read_at = coalesce(read_at, now())
  where id = target_recommendation_id
    and organization_id = target_organization_id;

  return found;
end;
$$;

revoke all on function public.mark_recommendation_read(uuid, uuid) from public, anon;
grant execute on function public.mark_recommendation_read(uuid, uuid) to authenticated;
