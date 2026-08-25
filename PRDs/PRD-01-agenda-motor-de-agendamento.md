# PRD — Módulo Agenda / Motor de Agendamento
**Produto:** Kronos — "Seu nicho, seu sistema único"
**Módulo:** Agenda / Motor de Agendamento (core do produto)
**Versão do documento:** 1.0
**Data:** 25/08/2026
**Autor:** Claude (Cowork), em colaboração com José Gabriel Ramos e Codex
**Status:** Rascunho para validação

---

## 1. Contexto

O Kronos é um sistema de agendamentos que se diferencia por se auto-personalizar para o nicho do cliente (Climatização, Dentista, Advocacia, Assistência Técnica, Manicure, Salão), em vez de entregar uma agenda genérica igual para todos os segmentos. O motor de agendamento é o coração de todo o produto: é a peça que sustenta o Dashboard (KPIs de atendimentos), o Kanban de Atendimentos (que nasce de um agendamento) e a própria promessa de marca — "o tempo é bem mais precioso" e "você ganha vantagem sobre todos os seus concorrentes".

Hoje o material de referência do produto (wireframes e mockups) mostra uma tela de Agenda com visões Dia/Semana e blocos de horário coloridos por serviço, mas não define ainda as regras de negócio por trás: como a disponibilidade é configurada, como o cliente final marca um horário, o que acontece em um conflito, como funcionam lembretes, remarcações e faltas. Este PRD existe para fechar essas lacunas antes da implementação, apoiado em como o mercado (players horizontais e verticais) resolve o mesmo problema hoje.

Observação de escopo: o repositório de código `agenda-kronos` (https://github.com/jsramos009/agenda-kronos) foi consultado como fonte de contexto técnico para este PRD e está vazio no momento da escrita — ou seja, este documento assume implementação do zero e deve ser tratado como a referência inicial de requisitos para quem (José e Codex) for estruturar o repositório.

## 2. Problema a resolver

Donos de pequenos negócios de serviço (os 6 nichos-alvo) hoje perdem tempo e dinheiro com: agenda em papel/WhatsApp/planilha, encaixes desorganizados, faltas de cliente sem aviso (no-show), retrabalho para confirmar horário manualmente, e ferramentas genéricas de agendamento que não entendem o vocabulário nem o fluxo do seu nicho (ex.: uma imobiliária de ar-condicionado não "marca consulta", marca "visita técnica"; um escritório de advocacia não tem "cliente chegando", tem "audiência" e "prazo"). O Kronos precisa entregar uma única engine de agendamento robusta o suficiente para cobrir os 6 nichos, mas capaz de se apresentar e se comportar de forma específica para cada um — sem virar 6 produtos diferentes por trás.

## 3. Objetivo do módulo

Fornecer um motor de agendamento único, configurável por nicho, que permita: (a) ao profissional/empresa configurar sua disponibilidade e serviços; (b) ao cliente final marcar, remarcar ou cancelar um horário com o mínimo de fricção (idealmente self-service, 24/7); (c) reduzir no-show via lembretes multicanal e políticas de confirmação; (d) alimentar automaticamente o Kanban de Atendimentos e o Dashboard com dados confiáveis de agenda.

## 4. Personas e necessidades por nicho

| Nicho | Quem agenda | Particularidade de agenda | Termo nativo |
|---|---|---|---|
| Climatização / Assistência Técnica | Atendente/dono marca, técnico executa | Precisa de endereço, deslocamento, janela de horário (não hora exata), possível recurso (veículo/kit de ferramentas) | Visita técnica / Ordem de Serviço |
| Dentista | Recepção marca, dentista atende | Múltiplas cadeiras/profissionais em paralelo, retorno programado, encaixe de urgência, duração variável por procedimento | Consulta / Retorno |
| Advocacia | Advogado ou secretária marca | Compromisso pode ser reunião, audiência (com hora fixada por tribunal, não pelo escritório) ou prazo (não é "horário", é "data-limite") | Audiência / Prazo / Reunião |
| Assistência Técnica (geral) | Atendente marca, técnico de campo executa | Igual climatização: geolocalização, janela de horário, checklist de execução | Ordem de Serviço |
| Manicure | Cliente ou profissional marca | Agenda 1:1 curta duração, alta recorrência (cliente volta a cada 2-3 semanas), forte peso de agendamento via Instagram/WhatsApp | Horário / Atendimento |
| Salão | Recepção ou cliente marca, múltiplos profissionais | Múltiplos profissionais e serviços combináveis (corte + coloração), comissionamento, pacotes | Horário / Sessão |

Insight central: os nichos se dividem em dois grandes padrões de agenda que o motor precisa suportar nativamente — **agenda de local fixo, cliente vai até o negócio** (dentista, manicure, salão) e **agenda de deslocamento, o profissional vai até o cliente** (climatização, assistência técnica), além de um terceiro padrão híbrido de **compromissos com data imposta externamente** (advocacia — audiências e prazos que não são definidos pelo próprio escritório). Um motor de agendamento genérico de mercado (tipo Calendly) só resolve bem o primeiro padrão.

## 5. Pesquisa de mercado

### 5.1 Players horizontais (agendamento genérico multi-segmento)

**Calendly** — foco em agendamento 1:1 e reuniões B2B. Pontos fortes: mais de 100 integrações, sincronização bidirecional com Google/Outlook/Office 365/iCloud, agendamento em grupo e round-robin (distribuição entre vários atendentes), automações de confirmação/lembrete/cancelamento/follow-up, pagamento via Stripe nos planos pagos. Fraqueza para o caso do Kronos: pensado para reuniões, não para "atendimentos" com serviço, duração variável e retorno de cliente recorrente. ([Cal.com — Calendly vs Acuity](https://cal.com/blog/calendly-vs-acuity-a-comparative-guide-to-scheduling-tools))

**Acuity Scheduling** — mais próximo do caso de uso "negócio de serviço". Diferenciais: formulários de entrada avançados (coleta de dados do cliente no ato do agendamento), automação de lembretes mais sofisticada, pagamentos via Stripe/PayPal/Square/Authorize.net com suporte a depósito e pacotes, memberships e gift cards desde o plano padrão — recursos claramente voltados a salões/estúdios/clínicas. ([Cal.com — Calendly vs Acuity](https://cal.com/blog/calendly-vs-acuity-a-comparative-guide-to-scheduling-tools); [SimplyBook.me comparação](https://simplybook.me/en/appointment-scheduling-software-comparison))

**SimplyBook.me** — se posiciona pela amplitude de recursos de monetização em torno do agendamento: venda de produtos, cupons e gift cards nativos, sistema de "tickets" (exclusivo entre os comparados), reserva de recursos/salas, papéis de acesso avançados (multi-usuário com permissões), e até agendamento por voz com IA. É o exemplo mais próximo de uma "plataforma" ao invés de um "agendador simples". ([SimplyBook.me](https://simplybook.me/en/appointment-scheduling-software-comparison))

**Leitura geral:** o mercado horizontal já validou como padrão de indústria: sincronização com calendários externos, lembretes multicanal automatizados, cobrança de depósito/política anti-no-show, agendamento em grupo/round-robin, formulários customizáveis de intake, e reserva de recursos (sala/equipamento) além de profissional. Nenhum desses players, porém, resolve nativamente "prazo processual" ou "ordem de serviço com deslocamento" — é onde entram os verticais.

### 5.2 Players verticais por nicho

**Salão / Estética — Trinks, Fresha, Booksy.** Os três resolvem o mesmo padrão de agenda (local fixo, múltiplos profissionais, alta recorrência) com abordagens muito parecidas: agendamento online publicado em canais como Instagram Direto e Google (Reservas com o Google), controle total do profissional sobre os horários liberados, lembretes automáticos multicanal (SMS, WhatsApp, e-mail) para reduzir falta, histórico de atendimento por cliente (fórmulas de cor, preferências, notas), e ferramentas de prevenção de no-show mais agressivas que o mercado horizontal: cobrança de depósito antecipado, taxa de cancelamento tardio e cartão salvo como garantia ("no-show protection"). Fresha e Trinks também tratam agenda como parte de um pacote maior (financeiro, estoque, comissão de profissional), não como produto isolado. ([Trinks](https://negocios.trinks.com/negocios/saloes-de-beleza/); [Fresha](https://www.fresha.com/for-business/salon); [Booksy](https://booksy.com.br/))

**Dentista — Simples Dental, Clinicorp.** O diferencial vertical aqui é a confirmação automática via WhatsApp para reduzir falta (recurso citado como carro-chefe), agenda acessível de qualquer lugar/dispositivo, gestão de encaixe (paciente de urgência entre horários fixos) e alinhamento de agenda entre toda a equipe da clínica (recepção + múltiplos dentistas/cadeiras). Link de agendamento disponível 24/7 para o paciente marcar sozinho. ([Simples Dental](https://www.simplesdental.com/))

**Advocacia — Projuris ADV, Astrea, CPJ-3C.** Aqui a "agenda" não é sobre disponibilidade de horário e sim sobre **não perder prazo**: captura automática de prazos processuais vinculados a cada processo monitorado, integração com os principais tribunais para acompanhar movimentações e intimações em tempo real, alertas inteligentes centralizando reuniões + audiências + prazos + tarefas em uma visão única (mensal/semanal/diária), e app mobile para consultar a agenda em campo. É o único vertical pesquisado em que a agenda é alimentada por uma fonte externa (o tribunal), não só por marcação manual ou self-service do cliente. ([Projuris ADV](https://www.projuris.com.br/adv/))

**Climatização / Assistência Técnica — Auvo, Field Control.** O padrão aqui é "field service management": ordem de serviço digital com checklist e evidências fotográficas, assinatura digital de comprovação de execução (substitui papel), roteirização de agenda considerando deslocamento entre atendimentos, geolocalização em tempo real da equipe técnica, e relatórios gerenciais gerados automaticamente ao final de cada serviço. A "disponibilidade" de um técnico não é um slot de horário isolado — é uma rota do dia inteira, sequência de atendimentos com deslocamento entre eles. ([Auvo](https://www.auvo.com/))

### 5.3 Comparativo consolidado de funcionalidades de agenda

| Funcionalidade | Horizontais (Calendly/Acuity/SimplyBook) | Salão/Estética (Trinks/Fresha/Booksy) | Dentista (Simples Dental/Clinicorp) | Advocacia (Projuris/Astrea) | Técnico de campo (Auvo/Field Control) |
|---|---|---|---|---|---|
| Agendamento online self-service (cliente marca sozinho) | Sim | Sim, inclusive via Instagram/Google | Sim, link 24/7 | Não se aplica (agenda é interna) | Não (agendamento é operacional, feito pela empresa) |
| Lembrete automático multicanal | Sim (e-mail, alguns SMS) | Sim (SMS, WhatsApp, e-mail) | Sim (WhatsApp) | Alertas internos, não lembrete a "cliente final" | Notificação ao técnico, não ao cliente final |
| Sincronização com calendário externo (Google/Outlook) | Sim, nativa | Parcial | Não detalhado | Sim (agenda unificada) | Não é o foco |
| Depósito / cobrança antecipada / política de no-show | Sim (planos pagos) | Sim, forte (cartão salvo, taxa de cancelamento) | Não é comum no setor | Não se aplica | Não se aplica |
| Múltiplos profissionais/recursos em paralelo | Sim (round-robin) | Sim (por profissional) | Sim (por cadeira/dentista) | N/A | Sim (por técnico/equipe) |
| Encaixe / urgência | Não nativo | Parcial | Sim, recurso central | N/A | Reordenação de rota |
| Deslocamento / geolocalização | Não | Não | Não | Não | Sim, central |
| Prazo com origem externa (não controlada pelo negócio) | Não | Não | Não | Sim, central | Não |
| Checklist / evidência de execução | Não | Não | Não | Não | Sim, central |
| Recorrência de cliente (retorno automático) | Parcial | Sim | Sim | N/A | Parcial |
| Fila de espera (waitlist) | Varia por player | Não confirmado nas fontes | Não confirmado | N/A | N/A |

### 5.4 Gaps de mercado que o Kronos pode explorar

Nenhum player pesquisado cobre, na mesma ferramenta, os três padrões de agenda identificados na seção 4 (local fixo / deslocamento / prazo externo). Isso empurra o pequeno empresário multi-nicho para escolher entre uma ferramenta genérica fraca no seu setor ou uma ferramenta vertical cara e fechada em apenas um nicho. A proposta do Kronos — um motor único que se apresenta de forma nativa para cada padrão, mudando vocabulário e campos por nicho — é um espaço real e ainda não ocupado por nenhum concorrente direto encontrado nesta pesquisa. Isso reforça que a "Auto-personalização" citada no material de marca não deveria ser só visual (cor/logo), mas também **funcional**: os campos e o comportamento do motor de agendamento devem mudar de acordo com o padrão do nicho (ver seção 6.6).

## 6. Requisitos funcionais

### 6.1 Configuração de disponibilidade
- RF-01: O profissional/empresa define janelas de disponibilidade recorrentes por dia da semana (ex.: seg-sex 08h-18h) e exceções pontuais (feriado, folga, bloqueio manual).
- RF-02: Suporte a múltiplos profissionais/recursos com agendas independentes dentro da mesma conta (dentista com várias cadeiras; salão com vários profissionais; assistência técnica com vários técnicos).
- RF-03: Duração do atendimento configurável por serviço (não um slot fixo único para toda a empresa), com opção de buffer (tempo de preparo/limpeza) entre atendimentos.
- RF-04: Para nichos de deslocamento (Climatização, Assistência Técnica): disponibilidade expressa como janela de horário (ex. "entre 14h e 17h") e não hora exata, com campo obrigatório de endereço/local do serviço.

### 6.2 Agendamento (criação)
- RF-05: Criação de agendamento manual pelo atendente/profissional, dentro do sistema (equivalente ao "+ Adicionar card" já presente no Kanban do mockup).
- RF-06: Página/link público de agendamento self-service para o cliente final marcar sozinho, nos nichos onde isso se aplica (Dentista, Manicure, Salão) — habilitável/desabilitável por nicho e por conta.
- RF-07: Captura de dados do cliente no ato do agendamento via formulário configurável por nicho (ex.: "tipo de equipamento" para climatização, "número do processo" para advocacia, "serviço desejado" para salão).
- RF-08: Detecção e bloqueio de conflito de horário/recurso, com sugestão automática dos próximos horários livres quando o solicitado está ocupado.
- RF-09: Suporte a encaixe/urgência: permitir agendamento fora da grade padrão mediante confirmação explícita do atendente, sinalizado visualmente como exceção.

### 6.3 Ciclo de vida do agendamento
- RF-10: Estados do agendamento alinhados ao Kanban já existente no produto: Agendado → Em Andamento → Aguardando → Concluído, mais os estados adicionais Cancelado e Não Compareceu (No-show), necessários para métricas e políticas de cobrança.
- RF-11: Remarcação (reschedule) e cancelamento self-service pelo cliente final, respeitando uma janela mínima configurável (ex. "cancelamentos com menos de 4h de antecedência não são permitidos online").
- RF-12: Registro de motivo ao cancelar/remarcar (opcional, mas recomendado para relatórios).

### 6.4 Notificações e redução de no-show
- RF-13: Lembretes automáticos multicanal (WhatsApp, e-mail, SMS/push) configuráveis em intervalo (ex.: 24h antes e 2h antes), como praticado por Trinks, Fresha e Simples Dental.
- RF-14: Confirmação de presença solicitada ao cliente (ex.: responder "confirmar" no WhatsApp), com atualização automática do status do agendamento.
- RF-15 (opcional v2): Cobrança de depósito/sinal antecipado e taxa de cancelamento tardio para nichos de alto no-show (Manicure, Salão, Dentista), inspirado em Fresha/Acuity.

### 6.5 Fila de espera e recorrência
- RF-16: Fila de espera: cliente pode entrar em lista de interesse para um horário ocupado e ser notificado automaticamente se ele abrir (cancelamento de terceiro).
- RF-17: Agendamento recorrente/retorno automático: sugestão de próximo agendamento com base no histórico (ex.: manicure a cada 3 semanas, retorno odontológico em 6 meses).

### 6.6 Comportamento por nicho (auto-personalização funcional)
- RF-18: O motor de agendamento deve trocar terminologia, campos obrigatórios e layout da agenda de acordo com o nicho selecionado no onboarding (ex.: "Visita Técnica" com campo de endereço para Climatização; "Audiência/Prazo" com campo de número de processo e data-limite não editável pelo próprio usuário para Advocacia; "Atendimento" simples para Manicure).
- RF-19: Para Advocacia especificamente: suportar compromissos cuja data é definida externamente (prazo, audiência) e não pelo motor de disponibilidade interno — ou seja, um tipo de "evento" que não concorre por vaga de horário, apenas por atenção/alerta. Esse é o requisito que mais diverge do restante do produto e deve ser tratado como um "modo" à parte dentro do mesmo motor.
- RF-20: Para Climatização/Assistência Técnica: exibir a agenda também em modo "rota do dia" (sequência de atendimentos com deslocamento), inspirado no padrão Auvo/Field Control, e não apenas em grade de horários.

### 6.7 Integrações
- RF-21: Sincronização bidirecional com Google Agenda e, se possível, Outlook, para o profissional visualizar/evitar conflito com compromissos pessoais.
- RF-22: Publicação do link/agenda de agendamento em canais externos (ex. Instagram, Google Perfil da Empresa), como já fazem Trinks e Fresha, especialmente relevante para Manicure e Salão.

## 7. Requisitos não funcionais
- RNF-01: Multi-tenant — cada conta/empresa isolada logicamente, mesmo compartilhando a mesma base de código e infraestrutura.
- RNF-02: Fuso horário: todo horário armazenado em UTC e convertido na exibição, com detecção automática do fuso do cliente ao marcar online.
- RNF-03: Disponibilidade do serviço de agendamento online (link público) com meta de uptime alta — é a porta de entrada de receita do cliente do Kronos.
- RNF-04: Auditoria: toda mudança de status do agendamento deve ficar registrada (quem alterou, quando, de/para qual status), útil tanto para relatórios quanto para disputas de no-show.
- RNF-05: LGPD: dados de clientes finais (nome, telefone, endereço, e no caso jurídico até número de processo) exigem tratamento como dado pessoal, com política de retenção e consentimento no formulário de agendamento público.
- RNF-06: Performance: cálculo de horários disponíveis deve responder em tempo real (sub-segundo) mesmo com múltiplos profissionais/recursos e regras de buffer.

## 8. Modelagem de dados (alto nível)

Entidades sugeridas para o motor de agendamento, compatíveis com a stack declarada (Node.js/TypeScript/Next.js no front e possivelmente Python em serviços auxiliares):

- **Empresa/Conta** (tenant) — nicho selecionado, fuso horário padrão, configurações de auto-personalização.
- **Profissional/Recurso** — pessoa ou recurso agendável (cadeira, veículo, sala); pertence a uma Empresa.
- **Serviço** — nome, duração padrão, buffer, nicho-específico (rótulo customizado por RF-18).
- **RegraDeDisponibilidade** — recorrência semanal + exceções, associada a um Profissional/Recurso.
- **Agendamento** — cliente, serviço, profissional/recurso, horário início/fim (ou, no caso Advocacia, "data-limite" sem janela), status (RF-10), canal de origem (manual/online/importado), campos customizados (RF-07).
- **Cliente** — dados de contato, histórico de agendamentos, preferências (para recorrência, RF-17).
- **Notificação** — tipo (lembrete/confirmação/waitlist), canal, status de envio, vinculada a um Agendamento.
- **FilaDeEspera** — cliente, serviço/profissional desejado, janela de interesse.

## 9. Fora de escopo nesta versão (v1)

- Pagamento/depósito integrado (RF-15) — mapeado como v2, após validar o motor básico de agenda.
- Integração real com tribunais para captura automática de prazos (o Kronos v1 deve permitir *registrar* prazos manualmente; a integração automatizada tipo Projuris é uma feature de médio/longo prazo, não um MVP).
- Roteirização otimizada de rotas para técnicos de campo (v1 mostra a rota na ordem em que foi agendada; otimização automática de trajeto é v2+).
- Cobrança de comissão de profissional e gestão financeira — pertence ao módulo financeiro/relatórios, fora do escopo de agenda.

## 10. Métricas de sucesso

- Taxa de no-show antes/depois da ativação de lembretes automáticos (meta: redução mensurável, referência de mercado é a razão de existir de recursos como os da Fresha).
- % de agendamentos criados via link self-service vs. manual pelo atendente (indicador de adoção do agendamento online).
- Tempo médio entre "cliente solicitou horário" e "horário confirmado" (deve tender a zero com o self-service).
- Taxa de conflito de agenda (agendamentos duplicados/sobrepostos) — deve ser próxima de zero graças ao RF-08.
- Uso da fila de espera (RF-16) como proxy de demanda reprimida por nicho.

## 11. Riscos e decisões em aberto

- O próprio material de marca do Kronos registra a pergunta em aberto "Deve mudar?" sobre Cores/Logo/Tabela do Kanban/Sugestões por nicho — isso é sobre personalização visual, mas a pesquisa desta seção 5 sugere que a decisão mais importante não é visual, é **funcional**: até que ponto o motor de agendamento deve se comportar diferente por nicho (RF-18 a RF-20) versus manter um único fluxo genérico com labels trocados. Recomenda-se decidir isso antes de iniciar a implementação, pois afeta diretamente a modelagem de dados da seção 8.
- Advocacia é o nicho com maior desvio do padrão dos outros cinco (agenda "passiva", alimentada por prazo externo). Vale avaliar se, no MVP, esse nicho entra com um conjunto reduzido de funcionalidades (apenas registro manual de prazo/audiência) em vez de tentar cobrir o padrão completo de um Projuris/Astrea já na v1.
- Não foi possível confirmar, nas fontes públicas consultadas, detalhes finos de "fila de espera" em Trinks e Simples Dental — tratar RF-16 como hipótese a validar com os próprios usuários-alvo do Kronos antes de priorizar no roadmap.

## 12. Próximos passos sugeridos

1. Validar com José/Codex a decisão da seção 11 (nível de personalização funcional por nicho) antes de qualquer modelagem de banco definitiva.
2. Detalhar em PRD específico o módulo "Auto-personalização por nicho" (mencionado como próximo tema de pesquisa), já que ele intercepta diretamente os RF-18 a RF-20 deste documento.
3. Prototipar o formulário de agendamento público (RF-06/RF-07) para 2 nichos de padrões opostos — Manicure (local fixo) e Climatização (deslocamento) — como teste de que um único motor realmente comporta os dois sem gambiarra.

---

### Fontes da pesquisa de mercado

- [Cal.com — Calendly vs Acuity: A Comparative Guide](https://cal.com/blog/calendly-vs-acuity-a-comparative-guide-to-scheduling-tools)
- [SimplyBook.me — Appointment Scheduling Software Comparison](https://simplybook.me/en/appointment-scheduling-software-comparison)
- [Trinks — Sistema para Salões de Beleza](https://negocios.trinks.com/negocios/saloes-de-beleza/)
- [Fresha — For Business: Salon](https://www.fresha.com/for-business/salon)
- [Booksy Brasil](https://booksy.com.br/)
- [Simples Dental](https://www.simplesdental.com/)
- [Projuris ADV](https://www.projuris.com.br/adv/)
- [Auvo](https://www.auvo.com/)
