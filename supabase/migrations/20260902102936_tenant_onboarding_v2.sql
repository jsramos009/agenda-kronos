-- Persisted onboarding, tenant activation and InfinitePay subscription gate.

create type public.subscription_status as enum ('pending', 'active', 'past_due', 'cancelled');

alter table public.organizations
  add column onboarding_completed_at timestamptz;

create table public.onboarding_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 4),
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  provider text not null default 'infinitepay' check (provider = 'infinitepay'),
  provider_plan_url text not null,
  status public.subscription_status not null default 'pending',
  transaction_nsu text unique,
  receipt_url text,
  confirmation_requested_at timestamptz,
  activated_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger onboarding_drafts_set_updated_at
before update on public.onboarding_drafts
for each row execute function private.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

grant select, insert, update, delete on public.onboarding_drafts to authenticated;
grant select on public.subscriptions to authenticated;

alter table public.onboarding_drafts enable row level security;
alter table public.subscriptions enable row level security;

create policy onboarding_drafts_select_self on public.onboarding_drafts
for select to authenticated using ((select auth.uid()) = user_id);
create policy onboarding_drafts_insert_self on public.onboarding_drafts
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy onboarding_drafts_update_self on public.onboarding_drafts
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy onboarding_drafts_delete_self on public.onboarding_drafts
for delete to authenticated using ((select auth.uid()) = user_id);

create policy subscriptions_select_member on public.subscriptions
for select to authenticated
using ((select private.is_organization_member(organization_id)));

create index subscriptions_status_idx on public.subscriptions (status, current_period_end);

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
    organization_id,
    organization_name,
    organization_slug,
    organization_description,
    template_id,
    owner_display_name
  );

  update public.organizations
  set preferences = configuration || jsonb_build_object('onboardingVersion', 2),
      onboarding_completed_at = now()
  where id = organization_id;

  update public.organization_themes
  set primary_color = theme ->> 'primary',
      accent_color = theme ->> 'accent',
      soft_color = theme ->> 'soft',
      line_color = theme ->> 'line'
  where organization_id = bootstrap_organization_v2.organization_id;

  delete from public.availability_rules
  where organization_id = bootstrap_organization_v2.organization_id;

  insert into public.availability_rules (
    organization_id, member_id, weekday, starts_at, ends_at
  )
  select
    bootstrap_organization_v2.organization_id,
    member.id,
    day.value::smallint,
    business_starts_at,
    business_ends_at
  from public.organization_members member
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(operation -> 'days') = 'array' and jsonb_array_length(operation -> 'days') > 0
        then operation -> 'days'
      else '[1,2,3,4,5,6]'::jsonb
    end
  ) as day(value)
  where member.organization_id = bootstrap_organization_v2.organization_id
    and member.user_id = (select auth.uid())
    and day.value::integer between 0 and 6;

  if jsonb_typeof(selected_services) = 'array' and jsonb_array_length(selected_services) > 0 then
    delete from public.services service
    where service.organization_id = bootstrap_organization_v2.organization_id
      and not exists (
        select 1 from jsonb_array_elements_text(selected_services) selected(name)
        where selected.name = service.name
      );
  end if;

  if jsonb_typeof(workflow_names) = 'array' then
    for workflow_item in
      select trim(value) as name, ordinality - 1 as position
      from jsonb_array_elements_text(workflow_names) with ordinality
    loop
      if char_length(workflow_item.name) between 2 and 80 then
        update public.workflow_stages
        set name = workflow_item.name
        where organization_id = bootstrap_organization_v2.organization_id
          and position = workflow_item.position;
      end if;
    end loop;
  end if;

  insert into public.subscriptions (
    organization_id, provider_plan_url, status
  ) values (
    bootstrap_organization_v2.organization_id,
    'https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ',
    'pending'
  );

  delete from public.onboarding_drafts where user_id = (select auth.uid());
  return bootstrap_organization_v2.organization_id;
end;
$$;

revoke all on function public.bootstrap_organization_v2(uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.bootstrap_organization_v2(uuid, text, text, text, text, text, jsonb) to authenticated;

create or replace function public.request_subscription_review(target_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.can_manage_organization(target_organization_id)) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  update public.subscriptions
  set confirmation_requested_at = now()
  where organization_id = target_organization_id and status <> 'active';

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.request_subscription_review(uuid) from public, anon;
grant execute on function public.request_subscription_review(uuid) to authenticated;

-- Preserve access for the workspace that existed before billing was introduced.
insert into public.subscriptions (
  organization_id, provider_plan_url, status, activated_at
)
select
  organization.id,
  'https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ',
  'active',
  now()
from public.organizations organization
on conflict (organization_id) do nothing;
