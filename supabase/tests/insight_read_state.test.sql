begin;
select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'insight-owner@kronos.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'insight-outsider@kronos.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'insight-analyst@kronos.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, created_by, name, slug, niche_id)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Tenant de teste', 'tenant-insight-read-test', 'climatizacao');

insert into public.organization_members (organization_id, user_id, role, display_name)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'owner', 'Owner de teste'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'analyst', 'Analista de teste');

insert into public.recommendations (id, organization_id, rule_key, title, origin)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'test-read-state', 'Insight de teste', 'pgTAP');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  public.mark_recommendation_read('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  true,
  'tenant owner can mark its recommendation as read'
);
select ok(
  (select read_at is not null from public.recommendations where id = '30000000-0000-4000-8000-000000000001'),
  'authorized read persists read_at'
);

create temporary table first_insight_read as
select read_at from public.recommendations where id = '30000000-0000-4000-8000-000000000001';

select is(
  public.mark_recommendation_read('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  true,
  'marking an already-read recommendation remains successful'
);
select is(
  (select read_at from public.recommendations where id = '30000000-0000-4000-8000-000000000001'),
  (select read_at from first_insight_read),
  'repeated reads preserve the original timestamp'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  public.mark_recommendation_read('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
  true,
  'an analyst in the same tenant can mark a recommendation as read'
);
select is(
  public.mark_recommendation_read('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000099'),
  false,
  'an authorized tenant member receives false for an unknown recommendation id'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.mark_recommendation_read('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001')$$,
  '42501',
  'Not allowed to read this recommendation',
  'a user outside the tenant cannot mark the recommendation as read'
);

select * from finish();
rollback;
