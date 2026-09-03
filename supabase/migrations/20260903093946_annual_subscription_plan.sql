alter table public.subscriptions
  add column billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual')),
  add column discount_percent smallint not null default 0
    check (discount_percent between 0 and 100);

create or replace function private.set_subscription_plan(
  target_organization_id uuid,
  selected_billing_cycle text
)
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

  if selected_billing_cycle not in ('monthly', 'annual') then
    raise exception 'INVALID_BILLING_CYCLE' using errcode = '22023';
  end if;

  update public.subscriptions
  set billing_cycle = selected_billing_cycle,
      discount_percent = case when selected_billing_cycle = 'annual' then 15 else 0 end,
      provider_plan_url = case
        when selected_billing_cycle = 'annual'
          then 'https://invoice.infinitepay.io/plans/js_gabrielsilva/b2UiQh9OL1'
        else 'https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ'
      end,
      confirmation_requested_at = null
  where organization_id = target_organization_id
    and status <> 'active';

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function private.set_subscription_plan(uuid, text) from public, anon;
grant execute on function private.set_subscription_plan(uuid, text) to authenticated;

create or replace function public.select_subscription_plan(
  target_organization_id uuid,
  selected_billing_cycle text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform private.set_subscription_plan(
    target_organization_id,
    selected_billing_cycle
  );
end;
$$;

revoke all on function public.select_subscription_plan(uuid, text) from public, anon;
grant execute on function public.select_subscription_plan(uuid, text) to authenticated;
