begin;
select plan(15);

select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'organization_members', 'organization_members exists');
select has_table('public', 'services', 'services exists');
select has_table('public', 'customers', 'customers exists');
select has_table('public', 'appointments', 'appointments exists');
select has_table('public', 'workflow_stages', 'workflow_stages exists');
select has_table('public', 'work_items', 'work_items exists');
select has_table('public', 'audit_events', 'audit_events exists');
select has_table('public', 'organization_invitations', 'organization invitations exists');

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

select * from finish();
rollback;
