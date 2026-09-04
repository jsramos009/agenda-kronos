# Handoff técnico — Agenda, Insights, Realtime e Notificações

## Objetivo e limite desta entrega

Evoluir o Kronos sem substituir o que já funciona: agenda com duração e grade flexíveis, Insights com uma única fonte de verdade, sincronização por fetch inicial + realtime + refetch e notificações in-app persistentes.

**Fora desta entrega:** onboarding/quiz/IA de configuração, presets novos, manual/PDF e central de ajuda. Esses itens permanecem como evolução posterior e não devem bloquear as quatro frentes abaixo.

## Direção de produto e design

**Design read:** redesign evolutivo de um SaaS operacional para pequenas e médias empresas, com linguagem calma, precisa e premium inspirada em princípios de produtos Apple, mas ancorada na identidade marrom/café da Kronos.

- `DESIGN_VARIANCE: 6`: composição organizada com assimetria leve, sem transformar telas operacionais em peças experimentais.
- `MOTION_INTENSITY: 4`: transições curtas que explicam estado, drag, resize, abertura e confirmação.
- `VISUAL_DENSITY: 5`: informação suficiente para uso diário, com respiro e hierarquia, sem multiplicar cards.

É um **redesign com preservação**. Rotas, logo, nomenclatura principal, formulários, integrações, permissões e fluxos existentes não mudam silenciosamente. “Apple-inspired” descreve princípios de clareza, proporção e resposta; Liquid Glass na web é uma aproximação em CSS, não um componente oficial da Apple.

## Diagnóstico do estado atual

| Área | Existe hoje | Lacuna objetiva |
|---|---|---|
| Agenda | `appointments` guarda `starts_at`/`ends_at`; `service_id` já é nullable; há visões dia/semana/mês/lista, mover, resize e RPC transacional com `work_items` | UI usa `slots` horários fixos de 60 min e `span` em horas; criação exige cliente e serviço; resize salva múltiplos de 60 min; não há criação por arraste |
| Disponibilidade | `availability_rules` por membro/recurso e dias/expediente em Configurações | falta `slotIntervalMinutes` persistido e consumido pela agenda |
| Insights | `recommendations` persiste lista/status; página cria sugestões iniciais quando vazia | badge `3` e card “3 melhorias” estão hardcoded em `AppShell`; não há `read_at`, loading/error/retry ou realtime |
| Carregamento | páginas Server Components fazem fetch inicial; ações usam `revalidatePath`; Pagamentos chama `router.refresh()` | não há subscription Supabase no produto, refetch no foco/reconexão, cache/store compartilhado ou deduplicação de eventos |
| Notificações | `notification_jobs` agenda envios externos por e-mail/WhatsApp | não existe notificação in-app, sino, central, badge persistente ou toast realtime |
| Segurança | RLS ativa; appointments por função de acesso/roles; writes de agenda para owner/admin/reception; recomendações para owner/admin/analyst; jobs para owner/admin/reception | novas tabelas/publicações precisam de RLS; subscription nunca pode depender apenas de filtro no cliente |
| Estado frontend | `useState`, `useActionState`, `useTransition` e dados vindos do servidor | não há Zustand/Context/React Query; o estado otimista de agenda é local e não reconcilia com realtime |

## Mapeamento técnico atual

### Schema e contratos

- `appointments`: `organization_id`, `customer_id NOT NULL`, `service_id NULL`, `professional_member_id`, `kind`, `status`, `origin`, `starts_at`, `ends_at`, timezone, notas, recorrência e auditoria temporal.
- `services.duration_minutes`: 5–1440 min; hoje define o término na RPC `create_appointment_with_work_item`.
- `appointments_no_professional_overlap`: bloqueia sobreposição do mesmo profissional para status ativos.
- FKs compostas garantem que cliente, serviço e profissional pertençam ao mesmo tenant.
- `availability_rules`: weekday 0–6, início/fim, membro/recurso e vigência.
- `recommendations`: registros reais, status `new|applied|dismissed|snoozed`, evidência/impacto JSON; não há campo de leitura.
- `notification_jobs`: fila de mensagens externas; não deve ser reutilizada como caixa de notificações da interface.
- `audit_events` e `appointment_status_history`: base existente para rastreabilidade; remarcação já cria `appointment.rescheduled`.

### Componentes, queries e estado

- `agenda/page.tsx`: fetch server-side de appointments, customers, services e availability numa janela de ±45 dias.
- `appointment-manager.tsx`: estado local `rows`; drag HTML5 para mover; pointer resize; navegação via URL e prefetch; grade fixa 08:00–17:00.
- `actions.ts`: criação, remarcação, resize, lembrete externo e revalidação de rotas.
- `insights/page.tsx`: consulta `recommendations`; se vazia, faz seed durante a renderização e consulta novamente.
- `insights-manager.tsx`: filtro/ação otimista local; sem estado explícito de erro/retry.
- `app-shell.tsx`: badge e card lateral de Insights fixos em `3`; ainda não há sino/notificações.
- `supabase/client.ts`: browser client existe e pode sustentar subscriptions autenticadas.
- `supabase/config.toml`: Realtime está habilitado localmente, mas não há código `.channel().on('postgres_changes')` nem migration adicionando tabelas à publicação.

## Arquitetura incremental proposta

```text
Server Component: fetch inicial com organization_id e intervalo
        ↓
Client store/context: entidades normalizadas por id
        ↓
UI otimista: upsertById + rollback em erro
        ↓
Server Action/RPC + Postgres/RLS (autoridade final)
        ↓
Supabase Realtime por tenant/usuário
        ↓
upsertById/removeById + refresh invalidado e deduplicado
        ↓
focus/reconnect: refetch de segurança
```

Não adicionar React Query nesta etapa. Um provider/context pequeno é suficiente e reduz mudança de arquitetura. IDs do banco são a chave de deduplicação; nunca concatenar eventos recebidos sem verificar `id`.

## 1. Agenda flexível

### Modelo compatível

Manter os nomes atuais `starts_at`/`ends_at` e derivar duração; não criar colunas paralelas `start_at`/`end_at`.

Migration `*_flexible_calendar.sql`:

- tornar `appointments.customer_id` nullable;
- adicionar `title text`, `description text`, `location text`, `color text`;
- expandir `appointment_kind` com `custom`, `blocked`, `internal`, `meeting`, `other` sem remover valores atuais;
- adicionar check: evento não-deadline exige `starts_at`, `ends_at`, `ends_at > starts_at` e título ou vínculo suficiente;
- manter `service_id` nullable e as FKs compostas;
- criar `create_flexible_appointment(...)` aceitando cliente/serviço opcionais, início e fim explícitos; manter a RPC atual como wrapper compatível para eventos baseados em serviço;
- registrar `appointment.created`, `appointment.rescheduled` e `appointment.resized` em `audit_events` com `before_data`/`after_data`.

`durationMinutes = (ends_at - starts_at) / 60s` deve ser calculado no mapper compartilhado. Não armazenar um terceiro valor mutável que possa divergir.

### Configuração e cálculo da grade

Persistir em `organizations.preferences.agenda.slotIntervalMinutes` e validar enum `10|15|30|60`. O valor controla snap, divisões, drag e resize; não limita a duração do evento.

- timeline visual: uma hora mantém `calendar-hour-height` (`spacing-18`, 72 px);
- subdivisões: 6/4/2/1 por hora conforme o intervalo;
- posição: `top = minutosDesdeInicio / 60 * calendar-hour-height`;
- altura: `durationMinutes / 60 * calendar-hour-height`;
- eventos abaixo de 30 min mostram horário + título; detalhes ficam no popover/tooltip, sem forçar texto ilegível.

### Componentes

| Componente | Props principais | Responsabilidade |
|---|---|---|
| `CalendarTimeline` | `range`, `slotInterval`, `workingHours`, `events` | grade contínua e cabeçalhos; não persiste dados |
| `CalendarSelection` | `start`, `end`, `durationMinutes` | feedback durante criação por arraste |
| `CalendarEventCard` | `event`, `compact`, `isPending` | mover, abrir detalhes e expor handles de resize |
| `QuickEventPopover` | `draft`, `customers`, `services`, `onSubmit` | evento avulso ou com serviço; cliente/serviço opcionais |
| `ConflictMessage` | `conflict`, `onDismiss` | explica profissional/período em conflito e devolve foco |

### Estados e interação

| Estado | Comportamento |
|---|---|
| Hover/foco de célula | realça apenas o slot acionável; cursor e foco nunca dependem só de cor |
| Pressionar + arrastar | ancora o início, aplica snap e mostra início, fim e duração em tempo real |
| Soltar | abre `QuickEventPopover` com período preenchido; Esc cancela |
| Mover evento | mantém duração; UI otimista; em erro reverte e anuncia o conflito |
| Resize inferior | snap no intervalo; mínimo 5 min no backend e um intervalo na UI; mostra novo fim/duração |
| Saving | evento com indicador “Salvando”; bloqueia novo gesto sobre o mesmo id |
| Empty | grade permanece utilizável e inclui texto “Nenhum agendamento neste período” na alternativa em lista |
| Error | banner local “Não foi possível carregar a agenda” + “Tentar novamente”; dados anteriores não somem |

Conteúdo: título 2–120 caracteres; descrição/notas até 1.000; local até 240; cor validada como hex; datas sempre exibidas em `America/Sao_Paulo`.

## 2. Insights como fonte única

Migration `*_insight_read_state.sql`: adicionar `read_at timestamptz` e índice parcial `(organization_id, created_at desc) where read_at is null`. Não criar coluna `badge_count`.

Criar `src/lib/queries/insights.ts` com uma única definição de visibilidade: registros acessíveis por RLS, `status in ('new','snoozed')` e, para snoozed, `snoozed_until <= now()`. Lista e contador usam esse contrato. O badge é `visibleInsights.filter(item => !item.readAt).length`.

- retirar os dois números `3` de `AppShell`;
- não fazer seed no GET da página; mover geração inicial para onboarding futuro ou uma ação idempotente explícita (nesta entrega, empty state é válido);
- ao abrir/detalhar um insight, persistir `read_at`; atualizar lista e badge de forma otimista e reconciliar pelo banco;
- estados obrigatórios: skeleton, lista, vazio, erro com retry e atualização pendente por card.

## 3. Fetch, realtime e recuperação

Criar `WorkspaceRealtimeProvider` no layout autenticado e hooks pequenos por domínio. Assinaturas mínimas:

| Canal | Filtro/autorização | Efeito |
|---|---|---|
| appointments | `organization_id=eq.<tenant>` + RLS | upsert/remove por id; invalidar agenda/dashboard/relatórios somente se a entidade afetar o intervalo visível |
| recommendations | `organization_id=eq.<tenant>` + RLS | atualizar feed e badge |
| in_app_notifications | `user_id=eq.<auth.uid>` + RLS | inserir toast/central e atualizar badge |
| customers | `organization_id=eq.<tenant>` + RLS | refetch somente das opções/formulários que dependem de clientes |

Migration `*_realtime_publication.sql` deve adicionar somente essas tabelas à `supabase_realtime`, de forma idempotente. RLS continua sendo a barreira de dados; filtro de canal é redução de tráfego, não autorização.

Regras operacionais:

- fetch inicial sempre ocorre antes da subscription;
- ao `online`, `visibilitychange` para visível e `SUBSCRIBED` após falha: `router.refresh()` com debounce e uma execução em voo;
- retry de leitura: até 2 tentativas com backoff curto; ações de escrita não são repetidas automaticamente;
- ao trocar tenant, remover canais antigos antes de assinar o novo;
- reconciliação usa `Map<id, entity>`/`upsertById`; `DELETE` remove pelo id;
- falha do canal mostra estado discreto “Reconectando…” e preserva a última lista válida.

## 4. Notificações in-app

Migration `*_in_app_notifications.sql`:

```text
in_app_notifications
id uuid PK
organization_id uuid FK NOT NULL
user_id uuid FK auth.users NOT NULL
actor_id uuid FK auth.users NULL
type text NOT NULL
title text NOT NULL
message text NOT NULL
entity_type text NULL
entity_id text NULL
metadata jsonb NOT NULL default {}
read_at timestamptz NULL
created_at timestamptz NOT NULL
unique (user_id, type, entity_type, entity_id, created_at_bucket)
```

Implementar RLS: usuário seleciona/atualiza apenas notificações destinadas a si e pertencentes a uma organização ativa da qual é membro; criação ocorre por função/trigger endurecido, não por insert arbitrário do browser. Trigger de appointment notifica membros ativos do tenant, excluindo `actor_id`; o próprio usuário recebe apenas o feedback da ação, não um toast duplicado.

Componentes:

- `NotificationBell`: botão no topbar, badge derivado de registros `read_at is null`;
- `NotificationCenter`: popover desktop e drawer mobile, lista persistente, “Marcar todas como lidas”;
- `NotificationToastViewport`: canto superior direito no desktop; largura útil no topo mobile; máximo de 3 toasts visíveis e fila para o restante;
- variantes `appointment`, `payment`, `warning`, `system`; ícone + rótulo, nunca só cor.

## Especificação visual

### Design foundation

Primeiro consolidar tokens e primitivas já existentes; depois migrar agenda, insights e notificações. Não adicionar um segundo design system nem uma biblioteca de ícones: o projeto já usa CSS nativo e Lucide. A identidade não deve ser substituída pelos cinzas genéricos do documento de referência.

Princípios:

- base neutra clara, com marrom/café Kronos como tinta institucional e uma única cor ativa do tenant por contexto;
- Intro Pro para interface, Univers para títulos e monospace somente para tempo/dados;
- hierarquia por tipografia, alinhamento e espaço antes de borda, sombra ou efeito;
- glass apenas em elementos sobrepostos: topbar, menus, popover, modal, notification center e toast;
- superfícies de trabalho, tabelas e grade da agenda permanecem sólidas e legíveis;
- cards existem apenas para entidades, métricas ou ações; grupos simples usam espaço e divisores esparsos;
- light mode é a entrega inicial coerente com a marca; aliases semânticos devem permitir dark mode posterior sem `filter: invert()`.

### Tokens

Reusar os tokens existentes e formalizar aliases, sem criar outra paleta:

| Token | Valor atual | Uso |
|---|---:|---|
| `color-canvas` | `brand.canvas` / `#FFFEFA` | fundo |
| `color-surface` | branco com transparência controlada | popover, central e toast |
| `color-text` | `brand.ink` / `#201A17` | conteúdo principal |
| `color-action` | `tenant.primary` | CTA, foco, seleção |
| `color-border` | `neutral.200` / `#E7E0D6` | separação |
| `space-1..14` | escala existente 4–56 px | todos os espaçamentos |
| `radius-control/panel` | 8/16 px | controles e overlays |
| `shadow-overlay` | token existente | popover, drawer e toast |
| `font-ui/display/data` | Intro Pro / Univers / monospace | interface, títulos, horários |
| `motion-fast/base` | 160/220 ms | feedback e overlays |

Liquid Glass fica restrito a overlays: superfície translúcida legível, blur moderado, borda e sombra curta. Conteúdo da grade continua opaco para preservar contraste.

Normalizar em `:root` também:

| Grupo | Tokens-alvo |
|---|---|
| Superfície | `surface-canvas`, `surface-base`, `surface-subtle`, `surface-overlay`, `surface-scrim` |
| Texto | `text-primary`, `text-secondary`, `text-tertiary`, `text-on-accent` |
| Forma | `radius-control: 10px`, `radius-card: 16px`, `radius-overlay: 20px`, `radius-pill` apenas para badges/chips |
| Sombra | `shadow-rest`, `shadow-float`; sombra tingida de umber, nunca preta pesada |
| Movimento | `motion-fast: 120ms`, `motion-normal: 180ms`, `motion-slow: 260ms`, `ease-standard: cubic-bezier(.2,.8,.2,1)` |
| Camadas | `z-sticky`, `z-menu`, `z-popover`, `z-toast`, `z-modal`; sem números arbitrários por componente |

### App shell

Preservar a estrutura funcional de `AppShell`, mas consolidá-la como três regiões:

```text
sidebar independente | topbar contextual
                      | conteúdo com scroll independente
```

- desktop: sidebar expandida de 280 px; estado colapsado de 72 px é evolução opcional após as quatro frentes, persistido localmente e com tooltip nos ícones;
- topbar: título/contexto da rota à esquerda; busca, sino e ação principal à direita. Não repetir título grande e metadados idênticos no conteúdo;
- sidebar mantém troca de workspace, todas as rotas, admin condicional, conta e logout; o redesign não remove capacidades;
- item ativo usa fundo de baixa opacidade + indicador lateral de 2 px; nunca um bloco saturado;
- o card lateral fixo “Kronos encontrou 3 melhorias” deixa de existir. Pode permanecer como atalho apenas quando houver insights reais, usando o mesmo contador da fonte de dados;
- mobile: sidebar vira drawer; Agenda é a visão primária e não se tenta comprimir a grade semanal inteira;
- glass no shell se limita à topbar sticky, menus flutuantes e drawer. Sidebar e conteúdo usam superfície estável com fallback sólido.

### Primitivas e componentes-alvo

Evoluir `src/components/ui.tsx` de modo compatível, mantendo as classes legadas durante a migração:

| Primitiva | Variantes/contrato |
|---|---|
| `Button` | primary, secondary, ghost, danger; 40/44 px; loading, disabled, active |
| `Field` | input, textarea, select, search; label persistente; help/error associados por `aria-describedby` |
| `Surface` | base, subtle, overlay; somente `overlay` aplica glass |
| `Popover` / `Modal` / `Drawer` | foco preso, Esc, retorno de foco, scrim, portal e fallback mobile |
| `Tabs` | roving tabindex, indicador ativo discreto, overflow navegável |
| `Badge` | count/status; zero não renderiza; números acima de 99 usam `99+` |
| `Skeleton` | replica a geometria da tela, sem spinner genérico |
| `EmptyState` | título, orientação e no máximo um CTA real |
| `InlineError` | causa curta, próxima ação e retry quando aplicável |
| `Toast` | success, warning, error, neutral; texto igual à ação concluída |

Migrar primeiro App Shell, Agenda, Insights e Notificações. Outros módulos apenas passam a consumir as primitivas quando forem tocados, evitando uma reescrita geral nesta entrega.

### Layout e responsividade

| Faixa | Agenda | Notificações |
|---|---|---|
| Desktop ≥1180 | dia/semana completa; coluna horária fixa; popover próximo à seleção | sino no topbar; central 380 px; toasts top-right |
| Tablet 760–1179 | semana com scroll horizontal; controles quebram em duas linhas | central alinhada ao sino, limitada ao viewport |
| Mobile <760 | dia como padrão; semana/mês continuam disponíveis; formulário em drawer; alternativa em lista sempre acessível | drawer inferior/superior de largura total; toast abaixo do topbar |

Touch targets mínimos 44×44. Strings longas truncam em uma linha no card e aparecem completas no detalhe. A agenda não deve alterar a escala de tempo só para acomodar texto.

### Motion

- toast entra com opacity 0→1, translateY -8→0, scale .98→1 em `motion-base`, e sai em `motion-fast`;
- popover/drawer usa opacity + translate curto; drag/resize não usa animação que atrase o ponteiro;
- `prefers-reduced-motion` remove transform e mantém apenas mudança instantânea de opacidade/estado.

### Acessibilidade

- grade com `role="grid"`, dias como colunas e slots navegáveis por teclado; alternativa em lista é equivalente funcional;
- Enter/Espaço cria/abre; setas percorrem slots; Shift+setas estende a seleção; Esc cancela gesto/popover;
- resize possui alternativa por campos de início/fim e botões “Aumentar/Reduzir duração”;
- modal/drawer prende foco, fecha com Esc e devolve foco ao elemento de origem;
- `aria-live="polite"` para salvar/reconectar; `role="alert"` para conflito/erro;
- badge tem rótulo (“3 insights não lidos”, “4 notificações não lidas”); zero não renderiza badge;
- contraste WCAG AA e foco de 2 px com offset de 2 px.

## Plano executável

### Etapa 0 — foundation e shell sem regressão funcional

1. Criar aliases semânticos no CSS e consolidar Button, Field, Surface, Overlay, Badge, Skeleton, EmptyState e InlineError sobre as classes atuais.
2. Migrar App Shell mantendo rotas, busca, workspace, permissões, admin, conta e logout.
3. Aplicar glass somente a topbar/overlays e validar contraste com e sem `backdrop-filter`.
4. Fazer comparação visual de dashboard, agenda, clientes, insights e configurações em desktop/mobile antes de seguir.

### Etapa 1 — consistência de Insights e recuperação

1. Migration de `read_at`/índice; query compartilhada.
2. Badge real no shell; loading/empty/error/retry.
3. Provider de conexão com refetch em foco/reconnect e deduplicação.
4. Testes 0/1/3/20 insights e troca de tenant.

### Etapa 2 — realtime e notificações

1. Migrations da publicação e `in_app_notifications` com RLS/índices.
2. Subscription contextual e teardown na troca de tenant.
3. Sino, central e toast; leitura individual/todas.
4. Teste com dois navegadores e teste negativo entre tenants.

### Etapa 3 — engine flexível da agenda

1. Migration/RPC compatível e mapper único de evento.
2. `slotIntervalMinutes` em Configurações.
3. Timeline por minutos, criação por arraste, resize e evento avulso.
4. Optimistic UI + rollback + realtime; conflitos permanecem validados no Postgres.

### Etapa 4 — endurecimento

1. Testes E2E: 10/15/30/45/60/90/180 min, mover, resize, avulso e com serviço.
2. Realtime: create/update/delete/cancel em duas sessões; offline/reconnect.
3. Acessibilidade teclado/leitor; desktop/tablet/mobile; reduced motion.
4. `typecheck`, `lint`, `build`, pgTAP/RLS e deploy de preview antes da produção.

## Arquivos-alvo

| Alterar | Criar |
|---|---|
| `src/app/(workspace)/agenda/page.tsx` | `src/lib/calendar/event-mapper.ts` |
| `src/components/appointment-manager.tsx` | `src/components/calendar/calendar-timeline.tsx` |
| `src/app/(workspace)/actions.ts` | `src/components/calendar/quick-event-popover.tsx` |
| `src/components/settings-manager.tsx` | `src/components/workspace-realtime-provider.tsx` |
| `src/app/(workspace)/insights/page.tsx` | `src/lib/queries/insights.ts` |
| `src/components/insights-manager.tsx` | `src/components/notification-center.tsx` |
| `src/components/app-shell.tsx` | `src/components/notification-toast-viewport.tsx` |
| `src/app/(workspace)/layout.tsx` | `supabase/migrations/*_flexible_calendar.sql` |
| `src/components/ui.tsx` | `src/components/ui/overlay.tsx` (somente se a extração reduzir duplicação) |
| `src/app/globals.css` | `supabase/migrations/*_insight_read_state.sql` |
| `supabase/tests/schema.test.sql` | `supabase/migrations/*_in_app_notifications.sql` e `*_realtime_publication.sql` |

## Critérios de aceite

- [ ] grade configurável em 10/15/30/60 min sem limitar a duração total;
- [ ] criação por arraste mostra início, fim e duração; aceita 10, 15, 30, 45, 60, 90 e 180 min;
- [ ] mover e resize persistem, sobrevivem a reload e revertem visualmente em erro;
- [ ] evento avulso funciona sem serviço e sem cliente; evento de serviço mantém preenchimento automático;
- [ ] conflito por profissional continua protegido no banco;
- [ ] badge de Insights é derivado dos mesmos registros exibidos; zero itens resulta em zero badge;
- [ ] Insights possui loading, empty, error, retry, leitura persistida e realtime;
- [ ] novo/alterado/cancelado aparece em segunda sessão sem F5 e sem duplicação;
- [ ] reconnect/foco executa refetch e preserva dados anteriores durante falha;
- [ ] notificação in-app é persistente, ignora ação redundante do próprio ator e badge deriva de `read_at`;
- [ ] RLS impede leitura/escrita/realtime entre tenants e limita notificação ao destinatário;
- [ ] fluxos têm alternativa por teclado, foco visível, anúncios acessíveis e layout válido nas três faixas;
- [ ] foundation usa Intro Pro/Univers, identidade café Kronos e um único accent do tenant; não há mistura de bibliotecas de ícones;
- [ ] glass aparece apenas em overlays/shell flutuante, possui fallback sólido e não reduz legibilidade;
- [ ] sidebar/topbar preservam busca, workspaces, permissões, admin, conta e logout em desktop e mobile;
- [ ] em dois segundos, cada página comunica onde o usuário está, o dado principal e a ação principal;
- [ ] migrations são idempotentes, cobertas por pgTAP, e nenhuma mudança estrutural é feita manualmente em produção.

## Definição de pronto

Cada frente só fecha com: UI + persistência + fetch inicial + realtime + refetch + loading/error/empty + responsividade + acessibilidade + RLS + teste. A implementação deve **estender** os componentes e RPCs atuais, preservando clientes, serviços, workflow, relatórios e pagamentos existentes.
