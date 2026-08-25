insert into public.niche_templates (
  id, label, pattern, version, theme, vocabulary, default_workflow,
  default_services, onboarding_tasks, kpis
) values
(
  'climatizacao', 'Climatização', 'field_service', 1,
  '{"primary":"#125A72","accent":"#1F9DBB","soft":"#DDF2F5","line":"#B7DDE5"}',
  '{"appointment":"Visita técnica","appointments":"Visitas técnicas","customer":"Cliente","professional":"Técnico","resource":"Veículo","start_action":"Agendar visita"}',
  '[{"name":"Agendado","status":"scheduled","color":"#DCEEF8"},{"name":"Em campo","status":"in_progress","color":"#BFEAF0"},{"name":"Aguardando peça","status":"waiting","color":"#F7E5BD"},{"name":"Concluído","status":"completed","color":"#DCECDD"}]',
  '[{"name":"Instalação","duration_minutes":120,"buffer_after_minutes":20,"requires_address":true},{"name":"Manutenção preventiva","duration_minutes":60,"buffer_after_minutes":15,"requires_address":true},{"name":"Reparo técnico","duration_minutes":90,"buffer_after_minutes":20,"requires_address":true}]',
  '["Cadastre seus técnicos e veículos","Defina as regiões atendidas","Configure serviços e tempo de deslocamento","Crie a primeira visita técnica"]',
  '["schedule_utilization","first_time_fix","travel_time","sla_compliance"]'
),
(
  'odontologia', 'Odontologia', 'fixed_location', 1,
  '{"primary":"#145E5A","accent":"#27A89C","soft":"#E0F5F2","line":"#B9DED8"}',
  '{"appointment":"Consulta","appointments":"Consultas","customer":"Paciente","professional":"Dentista","resource":"Cadeira","start_action":"Agendar consulta"}',
  '[{"name":"A confirmar","status":"scheduled","color":"#E1EDF5"},{"name":"Na recepção","status":"confirmed","color":"#D7F0EA"},{"name":"Em atendimento","status":"in_progress","color":"#E9E3F5"},{"name":"Pós-atendimento","status":"completed","color":"#DDEBDA"}]',
  '[{"name":"Avaliação","duration_minutes":40,"buffer_after_minutes":10,"requires_address":false},{"name":"Profilaxia","duration_minutes":50,"buffer_after_minutes":15,"requires_address":false},{"name":"Restauração","duration_minutes":60,"buffer_after_minutes":15,"requires_address":false}]',
  '["Cadastre dentistas e cadeiras","Defina os procedimentos","Configure confirmação de pacientes","Cadastre o primeiro paciente"]',
  '["schedule_utilization","attendance_rate","case_acceptance","recall_rate"]'
),
(
  'advocacia', 'Advocacia', 'external_deadline', 1,
  '{"primary":"#24365B","accent":"#A57B38","soft":"#F1EADF","line":"#D7C7AA"}',
  '{"appointment":"Compromisso","appointments":"Compromissos","customer":"Cliente","professional":"Responsável","resource":"Sala","start_action":"Novo compromisso","deadline":"Prazo","process_number":"Número do processo"}',
  '[{"name":"Triagem","status":"scheduled","color":"#E1E8F3"},{"name":"Documentos","status":"waiting","color":"#F0E4CD"},{"name":"Em análise","status":"in_progress","color":"#E5E2EB"},{"name":"Protocolado","status":"completed","color":"#E4E9D5"}]',
  '[{"name":"Consulta inicial","duration_minutes":60,"buffer_after_minutes":10,"requires_address":false},{"name":"Análise documental","duration_minutes":90,"buffer_after_minutes":0,"requires_address":false},{"name":"Reunião de acompanhamento","duration_minutes":45,"buffer_after_minutes":10,"requires_address":false}]',
  '["Cadastre responsáveis","Registre o primeiro processo","Defina alertas de prazo","Crie o primeiro compromisso"]',
  '["schedule_utilization","deadline_compliance","billable_utilization","realization_rate"]'
),
(
  'assistencia-tecnica', 'Assistência técnica', 'field_service', 1,
  '{"primary":"#334155","accent":"#C96A12","soft":"#EEF1F4","line":"#CBD3DD"}',
  '{"appointment":"Ordem de serviço","appointments":"Ordens de serviço","customer":"Cliente","professional":"Técnico","resource":"Bancada","start_action":"Nova ordem de serviço"}',
  '[{"name":"Recebido","status":"scheduled","color":"#DEE8F0"},{"name":"Diagnóstico","status":"in_progress","color":"#F7E9B9"},{"name":"Aguardando peça","status":"waiting","color":"#F6D8BE"},{"name":"Pronto","status":"completed","color":"#DDECDD"}]',
  '[{"name":"Diagnóstico","duration_minutes":45,"buffer_after_minutes":10,"requires_address":false},{"name":"Manutenção","duration_minutes":90,"buffer_after_minutes":15,"requires_address":false},{"name":"Instalação","duration_minutes":60,"buffer_after_minutes":20,"requires_address":true}]',
  '["Cadastre técnicos e bancadas","Defina os tipos de equipamento","Configure os SLAs","Abra a primeira ordem de serviço"]',
  '["schedule_utilization","first_time_fix","mean_completion_time","sla_compliance"]'
),
(
  'manicure', 'Manicure', 'fixed_location', 1,
  '{"primary":"#7B2F5B","accent":"#C94E82","soft":"#F9E5EE","line":"#E4BDD0"}',
  '{"appointment":"Horário","appointments":"Horários","customer":"Cliente","professional":"Profissional","resource":"Mesa","start_action":"Agendar horário"}',
  '[{"name":"Solicitado","status":"scheduled","color":"#F6E3EC"},{"name":"Confirmado","status":"confirmed","color":"#E9E0F3"},{"name":"Em atendimento","status":"in_progress","color":"#F5DFD2"},{"name":"Finalizado","status":"completed","color":"#DFEBDD"}]',
  '[{"name":"Mão","duration_minutes":40,"buffer_after_minutes":5,"requires_address":false},{"name":"Pé e mão","duration_minutes":80,"buffer_after_minutes":10,"requires_address":false},{"name":"Manutenção de gel","duration_minutes":100,"buffer_after_minutes":10,"requires_address":false}]',
  '["Cadastre profissionais e mesas","Publique seu link de agendamento","Configure lembretes","Convide clientes recorrentes"]',
  '["schedule_utilization","rebooking_rate","average_ticket","inactive_customers"]'
),
(
  'salao', 'Salão de beleza', 'fixed_location', 1,
  '{"primary":"#5A3D2E","accent":"#A56644","soft":"#F2E7DD","line":"#DCC8B8"}',
  '{"appointment":"Horário","appointments":"Horários","customer":"Cliente","professional":"Profissional","resource":"Cadeira","start_action":"Agendar horário"}',
  '[{"name":"Reserva","status":"scheduled","color":"#F3E6DC"},{"name":"Confirmado","status":"confirmed","color":"#EDD9D6"},{"name":"Em cadeira","status":"in_progress","color":"#EEE3BF"},{"name":"Fidelização","status":"completed","color":"#E0E9DC"}]',
  '[{"name":"Corte","duration_minutes":50,"buffer_after_minutes":10,"requires_address":false},{"name":"Escova","duration_minutes":45,"buffer_after_minutes":10,"requires_address":false},{"name":"Coloração","duration_minutes":150,"buffer_after_minutes":20,"requires_address":false}]',
  '["Cadastre profissionais e cadeiras","Publique seu link de agendamento","Configure serviços combináveis","Ative lembretes e retorno"]',
  '["schedule_utilization","rebooking_rate","average_ticket","inactive_customers"]'
)
on conflict (id) do update set
  label = excluded.label,
  pattern = excluded.pattern,
  version = excluded.version,
  theme = excluded.theme,
  vocabulary = excluded.vocabulary,
  default_workflow = excluded.default_workflow,
  default_services = excluded.default_services,
  onboarding_tasks = excluded.onboarding_tasks,
  kpis = excluded.kpis,
  active = true,
  updated_at = now();
