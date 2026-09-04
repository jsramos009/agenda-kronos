begin;
select plan(21);

insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','51000000-0000-4000-8000-000000000001','authenticated','authenticated','calendar-owner@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','51000000-0000-4000-8000-000000000002','authenticated','authenticated','calendar-outsider@test.local','',now(),'{}','{}',now(),now());
insert into public.organizations (id,created_by,name,slug,niche_id) values
('52000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','Calendar Tenant','calendar-tenant-test','climatizacao'),
('52000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000002','Other Tenant','calendar-other-test','odontologia');
insert into public.organization_members (id,organization_id,user_id,role,display_name) values
('53000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','owner','Owner'),
('53000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000002','owner','Outsider');
insert into public.customers (id,organization_id,name,email) values
('54000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','Cliente','cliente@test.local'),
('54000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000002','Outro','outro@test.local');

set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);
create temporary table created_event as select public.create_flexible_appointment(
  '52000000-0000-4000-8000-000000000001','Evento livre','Descrição','Sala 1','#6A2E16','custom',null,null,
  '53000000-0000-4000-8000-000000000001',null,'2026-09-04 12:15+00','2026-09-04 13:00+00',null
) as id;
select is((select count(*)::integer from public.appointments where id=(select id from created_event)),1,'free event is persisted without customer or service');
select is((select extract(epoch from (ends_at-starts_at))/60 from public.appointments where id=(select id from created_event)),45::numeric,'explicit range preserves 45 minute duration');
select is((select timezone from public.appointments where id=(select id from created_event)),'America/Sao_Paulo','event keeps tenant calendar timezone default');
select is((select count(*)::integer from public.audit_events where action='appointment.created' and entity_id=(select id::text from created_event)),1,'creation is audited');

select public.update_flexible_appointment_time('52000000-0000-4000-8000-000000000001',(select id from created_event),'2026-09-04 12:30+00','2026-09-04 13:30+00','appointment.resized');
select is((select extract(epoch from (ends_at-starts_at))/60 from public.appointments where id=(select id from created_event)),60::numeric,'resize persists explicit end');
select is((select count(*)::integer from public.appointments where id=(select id from created_event)),1,'reschedule and resize update the existing event without duplication');
select is((select count(*)::integer from public.audit_events where action='appointment.resized' and entity_id=(select id::text from created_event)),1,'resize stores an audit event');

select throws_ok(
  $$select public.create_flexible_appointment('52000000-0000-4000-8000-000000000001','Invasão',null,null,'#6A2E16','appointment','54000000-0000-4000-8000-000000000002',null,null,null,'2026-09-05 12:00+00','2026-09-05 13:00+00',null)$$,
  '23503','CUSTOMER_NOT_IN_ORGANIZATION','cross-tenant customer is rejected'
);
select throws_ok(
  $$select public.create_flexible_appointment('52000000-0000-4000-8000-000000000001','Conflito',null,null,'#6A2E16','custom',null,null,'53000000-0000-4000-8000-000000000001',null,'2026-09-04 13:00+00','2026-09-04 14:00+00',null)$$,
  '23P01',null,'overlapping professional range is rejected'
);

select throws_ok(
  $$select public.create_flexible_appointment('52000000-0000-4000-8000-000000000001','Stage inválido',null,null,'#6A2E16','custom',null,null,null,'53000000-0000-4000-8000-000000000099','2026-09-06 12:00+00','2026-09-06 13:00+00',null)$$,
  '23503','STAGE_NOT_IN_ORGANIZATION','unknown stage is rejected explicitly'
);

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000002',true);
select throws_ok(
  $$select public.create_flexible_appointment('52000000-0000-4000-8000-000000000001','Invasão direta',null,null,'#6A2E16','custom',null,null,null,null,'2026-09-07 12:00+00','2026-09-07 13:00+00',null)$$,
  '42501',null,'outsider cannot create an event in another tenant'
);
select throws_ok(
  $$select public.update_flexible_appointment_time('52000000-0000-4000-8000-000000000001',(select id from created_event),'2026-09-07 12:00+00','2026-09-07 13:00+00','appointment.rescheduled')$$,
  'P0002','APPOINTMENT_NOT_FOUND','outsider cannot move another tenant event'
);

select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);
insert into public.notification_jobs (organization_id,appointment_id,channel,template_key,recipient,scheduled_for)
values ('52000000-0000-4000-8000-000000000001',(select id from created_event),'email','test','test@example.com','2026-09-04 11:30+00');

insert into public.customers (id,organization_id,name,email) values
('54000000-0000-4000-8000-000000000003','52000000-0000-4000-8000-000000000001','Novo cliente','novo@test.local');
create temporary table reminder_event as select public.create_flexible_appointment(
  '52000000-0000-4000-8000-000000000001','Com lembrete',null,null,'#6A2E16','custom',
  '54000000-0000-4000-8000-000000000001',null,null,null,'2099-09-04 12:00+00','2099-09-04 13:00+00',null,60
) as id;
select is((select recipient from public.notification_jobs where appointment_id=(select id from reminder_event)),'cliente@test.local','creation atomically schedules recipient from the linked customer');
select public.update_flexible_appointment('52000000-0000-4000-8000-000000000001',(select id from reminder_event),'Com lembrete',null,null,'#6A2E16','54000000-0000-4000-8000-000000000003',null,'2099-09-04 12:00+00','2099-09-04 13:00+00',null);
select is((select recipient from public.notification_jobs where appointment_id=(select id from reminder_event)),'novo@test.local','changing customer replaces pending email recipient');
select public.update_flexible_appointment('52000000-0000-4000-8000-000000000001',(select id from reminder_event),'Com lembrete',null,null,'#6A2E16',null,null,'2099-09-04 12:00+00','2099-09-04 13:00+00',null);
select is((select status::text from public.notification_jobs where appointment_id=(select id from reminder_event)),'cancelled','removing customer cancels reminder so old recipient cannot receive it');
select throws_ok(
  $$select public.update_flexible_appointment('52000000-0000-4000-8000-000000000001',(select id from reminder_event),'Muito longo',null,null,'#6A2E16',null,null,'2099-09-04 12:00+00','2099-09-05 13:00+00',null)$$,
  '22007','INVALID_EVENT_RANGE','editing rejects durations exceeding 24 hours'
);
reset role;
create function pg_temp.reject_reminder_insert() returns trigger language plpgsql as $$begin raise exception 'REMINDER_INSERT_FAILED'; end$$;
create trigger reject_reminder_insert before insert on public.notification_jobs for each row execute function pg_temp.reject_reminder_insert();
set local role authenticated;
select throws_ok(
  $$select public.create_flexible_appointment('52000000-0000-4000-8000-000000000001','Atomic failure',null,null,'#6A2E16','custom','54000000-0000-4000-8000-000000000001',null,null,null,'2099-09-06 12:00+00','2099-09-06 13:00+00',null,60)$$,
  'P0001','REMINDER_INSERT_FAILED','failed reminder insert aborts entire creation'
);
select is((select count(*)::integer from public.appointments where title='Atomic failure'),0,'failed creation leaves no appointment');
select is((select count(*)::integer from public.audit_events where after_data->>'starts_at' like '2099-09-06%'),0,'failed creation leaves no audit entry');
reset role;
drop trigger reject_reminder_insert on public.notification_jobs;
reset role;
create function pg_temp.reject_reminder_update() returns trigger language plpgsql as $$begin raise exception 'REMINDER_UPDATE_FAILED'; end$$;
create trigger reject_reminder_update before update on public.notification_jobs for each row execute function pg_temp.reject_reminder_update();
set local role authenticated;
select set_config('request.jwt.claim.sub','51000000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$select public.update_flexible_appointment_time('52000000-0000-4000-8000-000000000001',(select id from created_event),'2026-09-04 14:00+00','2026-09-04 15:00+00','appointment.rescheduled')$$,
  'P0001','REMINDER_UPDATE_FAILED','reminder failure aborts the reschedule transaction'
);
select is((select starts_at from public.appointments where id=(select id from created_event)),'2026-09-04 12:30:00+00'::timestamptz,'failed reminder update rolls appointment time back');
select * from finish();
rollback;
