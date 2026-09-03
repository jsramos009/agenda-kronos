begin;
select plan(28);

select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'organization_members', 'organization_members exists');
select has_table('public', 'services', 'services exists');
select has_table('public', 'customers', 'customers exists');
select has_table('public', 'appointments', 'appointments exists');
select has_table('public', 'workflow_stages', 'workflow_stages exists');
select has_table('public', 'work_items', 'work_items exists');
select has_table('public', 'audit_events', 'audit_events exists');
select has_table('public', 'organization_invitations', 'organization invitations exists');
select has_table('public', 'payment_provider_connections', 'payment provider connections exists');
select has_table('public', 'payment_provider_credentials', 'encrypted payment credentials exist');
select has_table('public', 'customer_payment_provider_links', 'provider customer links exist');
select has_table('public', 'payment_charges', 'payment charges exist');
select has_table('public', 'payment_webhook_events', 'payment webhook event inbox exists');

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('payment_provider_credentials', 'payment_webhook_events')
      and grantee in ('anon', 'authenticated')
  ),
  'browser roles cannot access credentials or webhook payloads'
);

select ok(
  (select bool_and(relrowsecurity)
   from pg_class
   where oid in (
     'public.organizations'::regclass,
     'public.services'::regclass,
     'public.customers'::regclass,
     'public.appointments'::regclass,
     'public.work_items'::regclass,
     'public.organization_invitations'::regclass
   )),
  'tenant tables have RLS enabled'
);

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'organization_invitations' and grantee = 'anon'
  ),
  'anonymous role has no invitation grants'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'organization_invitations'),
  4,
  'invitation table has one policy per operation'
);

select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bootstrap_organization'
  ),
  'bootstrap function exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_no_professional_overlap'
      and contype = 'x'
  ),
  'professional overlap exclusion constraint exists'
);

select is(
  (select count(*)::integer from public.niche_templates where active),
  6,
  'six active niche templates are seeded'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'appointments' and policyname = 'appointments_insert_operator'
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'appointments' and policyname = 'appointments_insert_member'
  ),
  'appointment writes use role-aware policies'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass and conname = 'appointments_customer_same_org'
  ),
  'appointment customer references cannot cross organizations'
);

select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'has_organization_role' and p.prosecdef
      and p.proconfig @> array['search_path=""']
  ),
  'role helper is a hardened security definer'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.has_organization_role(uuid, public.organization_role[])',
    'EXECUTE'
  ),
  'anonymous users cannot execute the role helper'
);

select ok(
  not ('image/svg+xml' = any((select allowed_mime_types from storage.buckets where id = 'organization-logos'))),
  'logo bucket rejects active SVG content'
);

select ok(
  not has_table_privilege('authenticated', 'public.subscriptions', 'INSERT')
  and has_function_privilege(
    'authenticated',
    'private.ensure_pending_subscription(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'private.ensure_pending_subscription(uuid)',
    'EXECUTE'
  ),
  'subscription bootstrap only exposes the narrow pending-subscription helper'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_subscription_review'
      and not p.prosecdef
  )
  and has_function_privilege(
    'authenticated',
    'private.mark_subscription_review_requested(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'private.mark_subscription_review_requested(uuid)',
    'EXECUTE'
  ),
  'subscription review uses an invoker wrapper around a narrow private helper'
);

select * from finish();
rollback;
