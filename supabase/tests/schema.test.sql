begin;
select plan(44);

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
select has_column('public', 'recommendations', 'read_at', 'recommendations persist their read state');
select has_index('public', 'recommendations', 'recommendations_unread_created_idx', 'unread recommendations have a tenant-aware index');
select has_table('public', 'in_app_notifications', 'in-app notifications exist separately from external jobs');
select has_column('public', 'in_app_notifications', 'read_at', 'in-app notification read state is persistent');
select has_column('public', 'in_app_notifications', 'event_key', 'notifications have a stable operation dedupe key');
select has_index('public', 'in_app_notifications', 'in_app_notifications_user_unread_idx', 'unread notifications have a recipient index');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.in_app_notifications'::regclass),
  'in-app notifications have RLS enabled'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'in_app_notifications'),
  2,
  'notifications expose only recipient select and update policies'
);
select ok(
  has_table_privilege('authenticated', 'public.in_app_notifications', 'SELECT')
  and not has_table_privilege('authenticated', 'public.in_app_notifications', 'INSERT')
  and not has_table_privilege('authenticated', 'public.in_app_notifications', 'DELETE'),
  'browser roles can read notifications but cannot create or delete them'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'notify_appointment_members'
      and p.prosecdef
      and p.proconfig @> array['search_path=""']
  )
  and not has_function_privilege('authenticated', 'private.notify_appointment_members()', 'EXECUTE'),
  'appointment notification trigger is hardened and not browser-callable'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.appointments'::regclass
      and tgname = 'appointments_notify_members'
      and not tgisinternal
  ),
  'appointments emit in-app notifications through a database trigger'
);
select is(
  (
    select count(*)::integer
    from unnest(array['appointments', 'customers', 'in_app_notifications', 'recommendations']) required(tablename)
    where not exists (
      select 1 from pg_publication_tables published
      where published.pubname = 'supabase_realtime'
        and published.schemaname = 'public'
        and published.tablename = required.tablename
    )
  ),
  0,
  'realtime publication includes the four required tenant tables without replacing existing entries'
);
select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mark_recommendation_read'
      and p.prosecdef
      and p.proconfig @> array['search_path=""']
  )
  and has_function_privilege('authenticated', 'public.mark_recommendation_read(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.mark_recommendation_read(uuid, uuid)', 'EXECUTE'),
  'recommendation read RPC is hardened and restricted to authenticated users'
);

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
     'public.organization_invitations'::regclass,
     'public.recommendations'::regclass
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

select has_column('public', 'subscriptions', 'billing_cycle', 'subscription stores its billing cycle');
select has_column('public', 'subscriptions', 'discount_percent', 'subscription stores its discount');
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'select_subscription_plan'
      and not p.prosecdef
  )
  and has_function_privilege(
    'authenticated',
    'private.set_subscription_plan(uuid, text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'private.set_subscription_plan(uuid, text)',
    'EXECUTE'
  ),
  'plan selection uses an invoker wrapper around a narrow private helper'
);

select * from finish();
rollback;
