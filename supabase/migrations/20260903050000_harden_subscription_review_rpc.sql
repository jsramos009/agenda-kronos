-- Keep the public API function as SECURITY INVOKER. The narrowly-scoped
-- private helper performs only the pending review timestamp update after
-- checking that the caller manages the same tenant.

create or replace function private.mark_subscription_review_requested(target_organization_id uuid)
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

  update public.subscriptions
  set confirmation_requested_at = now()
  where organization_id = target_organization_id
    and status <> 'active';

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function private.mark_subscription_review_requested(uuid) from public, anon;
grant execute on function private.mark_subscription_review_requested(uuid) to authenticated;

create or replace function public.request_subscription_review(target_organization_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.mark_subscription_review_requested(target_organization_id);
end;
$$;

revoke all on function public.request_subscription_review(uuid) from public, anon;
grant execute on function public.request_subscription_review(uuid) to authenticated;
