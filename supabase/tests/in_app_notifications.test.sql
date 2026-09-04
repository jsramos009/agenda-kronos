begin;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'reception@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'assigned@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'unassigned@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'analyst@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'inactive@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'outsider@notification.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, created_by, name, slug, niche_id)
values
  ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'Tenant de notificações', 'tenant-notification-test', 'climatizacao'),
  ('42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000007', 'Outro tenant', 'tenant-notification-other', 'odontologia');

insert into public.organization_members (id, organization_id, user_id, role, display_name, active)
values
  ('46000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'owner', 'Owner', true),
  ('46000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000002', 'reception', 'Recepção', true),
  ('46000000-0000-4000-8000-000000000003', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000003', 'professional', 'Profissional atribuído', true),
  ('46000000-0000-4000-8000-000000000004', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000004', 'professional', 'Profissional não atribuído', true),
  ('46000000-0000-4000-8000-000000000005', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000005', 'analyst', 'Analista', true),
  ('46000000-0000-4000-8000-000000000006', '42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000006', 'admin', 'Admin inativo', false),
  ('46000000-0000-4000-8000-000000000007', '42000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000007', 'owner', 'Outro owner', true);

insert into public.customers (id, organization_id, name, email)
values ('43000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'Cliente Teste', 'cliente@kronos.test');
insert into public.services (id, organization_id, name, duration_minutes)
values ('44000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'Serviço Teste', 60);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
insert into public.appointments (id, organization_id, customer_id, service_id, professional_member_id, starts_at, ends_at, created_by)
values ('45000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000003', '2026-09-10 13:00:00+00', '2026-09-10 14:00:00+00', '41000000-0000-4000-8000-000000000001');

select is((select count(*)::integer from public.in_app_notifications), 0, 'actor does not receive duplicate notification');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.in_app_notifications), 1, 'active reception member receives created event');
select is((select type from public.in_app_notifications limit 1), 'appointment.created', 'created event has expected type');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000003', true);
select is((select count(*)::integer from public.in_app_notifications), 1, 'assigned professional receives event it can access');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.in_app_notifications), 0, 'unassigned professional receives no payload');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000005', true);
select is((select count(*)::integer from public.in_app_notifications), 0, 'analyst receives no appointment payload under existing access policy');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000006', true);
select is((select count(*)::integer from public.in_app_notifications), 0, 'inactive admin cannot read or receive notifications');
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000007', true);
select is((select count(*)::integer from public.in_app_notifications), 0, 'member of another tenant cannot read notifications');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
update public.in_app_notifications set read_at = now();
select ok((select bool_and(read_at is not null) from public.in_app_notifications), 'recipient can persist read state');
select throws_ok(
  $$insert into public.in_app_notifications (organization_id, user_id, event_key, type, title, message) values ('42000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000002', 'manual:test', 'system.test', 'Teste', 'Teste')$$,
  '42501', 'permission denied for table in_app_notifications', 'browser cannot create arbitrary notifications'
);
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000007', true);
select is((with changed as (update public.in_app_notifications set read_at = now() returning id) select count(*)::integer from changed), 0, 'other tenant cannot update notification rows');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update public.appointments set starts_at = '2026-09-10 15:00:00+00', ends_at = '2026-09-10 16:00:00+00' where id = '45000000-0000-4000-8000-000000000001';
update public.appointments set ends_at = '2026-09-10 16:30:00+00' where id = '45000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.in_app_notifications where type = 'appointment.updated'), 2, 'two updates in the same minute remain distinct');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update public.appointments set status = 'cancelled' where id = '45000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.in_app_notifications where type = 'appointment.cancelled'), 1, 'cancellation emits specific event');
select is((select count(*)::integer from public.in_app_notifications), 4, 'created, repeated updates and cancellation are retained without duplicates');

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);
update public.appointments set status = 'confirmed' where id = '45000000-0000-4000-8000-000000000001';
update public.appointments set status = 'cancelled' where id = '45000000-0000-4000-8000-000000000001';
update public.appointments set status = 'confirmed' where id = '45000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.in_app_notifications), 7, 'state cycle A-B-A-B emits a notification for every legitimate operation');

select * from finish();
rollback;
