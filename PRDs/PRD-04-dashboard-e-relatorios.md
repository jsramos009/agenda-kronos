# PRD — Kronos: Dashboard e Relatórios
**Produto:** Kronos — "Seu nicho, seu sistema único"
**Módulo:** Dashboard e Relatórios
**Versão do documento:** 1.0
**Data:** 25/08/2026
**Autor:** Claude (Cowork), em colaboração com José Gabriel Ramos e Codex
**Status:** Rascunho para validação

---

## 1. Contexto

O mockup atual do Kronos mostra um Dashboard com 4 KPIs genéricos (Atendimentos Hoje, Em Andamento, Agendamentos, Concluídos, cada um com variação percentual "vs. ontem"), um resumo do Kanban e a lista de próximos agendamentos. Isso cobre bem a pergunta "o que está acontecendo hoje", mas nenhum desses 4 números é específico o suficiente para ajudar o dono do negócio a tomar uma decisão (ex.: "devo contratar mais um profissional?", "estou perdendo cliente por falta?", "meu técnico está andando demais e atendendo de menos?"). Este PRD define quais métricas o Dashboard e os Relatórios do Kronos deveriam mostrar, com base em como cada um dos 6 nichos mede a própria saúde do negócio hoje no mercado — e não apenas replicando os 4 KPIs genéricos do mockup.

## 2. Problema a resolver

Donos de negócio de serviço raramente têm tempo ou conhecimento técnico para montar planilhas de indicadores. Ao mesmo tempo, cada nicho tem um KPI "estrela" diferente que decide se o negócio está saudável — taxa de utilização da agenda para Salão, first-time fix rate para Assistência Técnica, taxa de aceitação de tratamento para Dentista, utilization/realization rate para Advocacia. Um dashboard genérico de "quantidade de agendamentos" não captura isso. O risco de não fazer essa diferenciação é o Kronos entregar números bonitos que ninguém usa para decidir nada — o oposto da promessa de marca "você ganha vantagem sobre todos os seus concorrentes".

## 3. Objetivo do módulo

Entregar um Dashboard com um conjunto pequeno e acionável de KPIs (não uma parede de números), específico por nicho, mais uma camada de Relatórios para quem quer detalhar/exportar dados ao longo do tempo — sustentando as decisões de contratação, precificação e retenção de cliente do dono do negócio.

## 4. Pesquisa de mercado

### 4.1 Salão / Barbearia — Zenoti

O KPI mais citado como "o mais importante do segmento" é a **taxa de utilização de horário** (staff utilization): horas efetivamente atendendo cliente dividido por horas disponíveis na agenda — com benchmark de mercado de referência em torno de 56% na mediana, e negócios de alta performance passando bem disso. Junto dele, os indicadores tratados como centrais são: taxa de rebooking (cliente já sai com o próximo horário marcado — tratada como a métrica de retenção mais crítica do setor), taxa de cancelamento (benchmark citado na casa de 4%, o mais baixo entre os segmentos pesquisados), taxa de no-show, ticket médio (chamado de "a métrica mais acionável", ligado a venda de produto/serviço adicional), e métricas de retenção mais finas: frequência de visita, retenção da primeira para a segunda visita, e contagem de clientes que pararam de voltar ("lapsed clients"). ([Zenoti — Salon & Barbershop Metrics](https://www.zenoti.com/thecheckin/salon-and-barbershop-metrics-guide))

### 4.2 Assistência Técnica / Climatização — field service management

Os KPIs consolidados de field service são majoritariamente sobre eficiência de execução, não sobre volume: **first-time fix rate** (chamados resolvidos sem precisar de segunda visita, dividido pelo total de chamados) como indicador central de qualidade técnica e de agendamento; **technician utilization** (horas em tarefa de campo dividido por horas totais trabalhadas, separando tempo produtivo de deslocamento/burocracia); **tempo médio de resposta** (tempo total até responder dividido por número de respostas); **SLA compliance rate** (reparos que cumpriram o SLA dividido pelo total de reparos); e **mean time-to-completion** (tempo total gasto em jobs dividido por número de jobs). ([NetSuite — Field Service KPIs & Metrics](https://www.netsuite.com/portal/resource/articles/erp/field-services-kpis-metrics.shtml))

### 4.3 Dentista — dashboards odontológicos

Entre os 12 KPIs mais citados para clínicas odontológicas estão: produção (volume de tratamento realizado), receita, lucro, custo operacional, pacientes ativos, novos pacientes por mês, **taxa de retenção de paciente**, produção média por paciente, **taxa de aceitação de caso** (% de pacientes que aceitam o plano de tratamento recomendado), **percentual de consultas cumpridas** (o equivalente direto de taxa de no-show, mas medido pelo lado positivo), número de visitas de higiene/manutenção no mês, e valores efetivamente recebidos (collections, distinto de receita faturada). ([Databox — Dental KPI Dashboard](https://databox.com/dental-kpi-dashboard))

### 4.4 Advocacia — KPIs de escritório

Os KPIs centrais de um escritório de advocacia giram em torno de tempo faturável, não de volume de atendimento: **utilization rate** (horas faturáveis trabalhadas dividido pelas horas totais do dia de trabalho), **realization rate** (horas faturáveis efetivamente cobradas do cliente dividido pelas horas faturáveis trabalhadas — mede quanto do trabalho feito vira cobrança real) e **collection rate** (horas cobradas e efetivamente recebidas dividido pelas horas faturadas). Junto a esses três, aparecem métricas de prazo e de proporção entre horas faturáveis e não-faturáveis. ([Clio — Law Firm KPIs](https://www.clio.com/blog/law-firm-kpis/))

### 4.5 Conclusão da pesquisa

Os quatro nichos pesquisados convergem em um padrão de duas camadas: (1) uma métrica "estrela" de eficiência de uso do tempo/agenda (utilização — quase idêntica em conceito entre Salão, Field Service e Advocacia, mesmo com nomes e fórmulas diferentes), e (2) um conjunto de métricas de qualidade/retenção específicas do nicho (rebooking para Salão, first-time fix para Assistência Técnica, aceitação de caso para Dentista, realization rate para Advocacia). Isso confirma, do lado de KPIs, a mesma conclusão dos PRDs anteriores: o Dashboard do Kronos precisa de um "esqueleto" comum (taxa de utilização da agenda é candidata natural a KPI universal, já que os 6 nichos compartilham o conceito de tempo disponível vs. tempo ocupado) mais um segundo nível de métricas configurado por nicho — não 4 números genéricos iguais para todos, nem 6 dashboards completamente diferentes.

## 5. Modelo proposto de KPIs

### 5.1 Camada universal (todos os nichos)
- Taxa de utilização da agenda: horas/slots ocupados por atendimento dividido por horas/slots disponíveis no período — métrica mais citada de forma equivalente em 3 dos 4 nichos pesquisados (Salão, Field Service, Advocacia) e adaptável ao 4º (Dentista, via ocupação de cadeira).
- Taxa de no-show / consultas cumpridas: proporção de agendamentos concluídos vs. não comparecidos, direto do RF-11 do PRD-03.
- Taxa de cancelamento: separada de no-show, pois indica um problema diferente (agenda mal ajustada ou fricção no processo, não desrespeito do cliente).
- Volume de atendimentos concluídos no período, com comparação ao período anterior (já existe no mockup atual — mantém-se, mas deixa de ser o KPI-manchete sozinho).

### 5.2 Camada específica por nicho (exemplos, sujeitos a validação)

| Nicho | KPI de destaque adicional | Referência de mercado |
|---|---|---|
| Salão / Manicure | Taxa de rebooking no checkout; ticket médio; clientes inativos (lapsed) | Zenoti |
| Dentista | Taxa de aceitação de caso; produção média por paciente; recall/retorno cumprido | Databox |
| Advocacia | Realization rate (horas trabalhadas vs. cobradas); prazos cumpridos no período | Clio |
| Climatização / Assistência Técnica | First-time fix rate; tempo médio de deslocamento entre atendimentos; SLA compliance | NetSuite |

## 6. Requisitos funcionais

### 6.1 Dashboard
- RF-01: Manter os 4 indicadores do dia já existentes no mockup (Atendimentos Hoje, Em Andamento, Agendamentos, Concluídos) como resumo operacional imediato — não removê-los, apenas deixar de tratá-los como os únicos KPIs do produto.
- RF-02: Adicionar ao Dashboard um card de "Taxa de Utilização da Agenda" (camada universal, seção 5.1), calculado sobre o período selecionável (dia/semana/mês).
- RF-03: Adicionar um segundo bloco de KPIs "do seu nicho", com 2-3 indicadores específicos (seção 5.2), configurado automaticamente conforme o nicho da conta — reaproveitando o mecanismo de personalização definido no PRD-02.
- RF-04: Todo KPI do Dashboard deve ser clicável, levando ao Relatório detalhado equivalente (RF-06 em diante) — o Dashboard é a porta de entrada, não o destino final da análise.
- RF-05: Indicador de variação percentual (já presente no mockup, "vs. ontem") deve ser configurável para comparar contra período anterior equivalente (dia anterior, semana anterior, mês anterior), não fixo em "vs. ontem".

### 6.2 Relatórios
- RF-06: Relatório de utilização da agenda por profissional/recurso, com granularidade diária/semanal/mensal — essencial para decisão de contratação (o dado mais citado como acionável na pesquisa, seção 4.1/4.2).
- RF-07: Relatório de no-show e cancelamento, com filtro por cliente — permite identificar clientes recorrentemente faltosos, insumo direto para uma futura política de depósito (RF-15 do PRD-01).
- RF-08: Relatório específico por nicho, seguindo a tabela da seção 5.2 (ex.: relatório de aceitação de caso para Dentista, relatório de first-time fix para Assistência Técnica).
- RF-09: Exportação de relatórios (CSV no mínimo; PDF como evolução) para uso externo (contador, planilha própria do cliente).
- RF-10: Filtro de relatórios por profissional, período e (quando aplicável) tipo de serviço, consistente com os filtros já definidos para o Kanban no PRD-03 (RF-13).

## 7. Requisitos não funcionais
- RNF-01: Os KPIs do Dashboard devem ser calculados a partir da mesma fonte de dados de Agenda e Kanban (nenhuma métrica duplicada ou divergente entre módulos), reforçando o RNF-01 já definido no PRD-03.
- RNF-02: Cálculo de KPI não deve degradar performance perceptível do Dashboard mesmo com histórico extenso de agendamentos — recomenda-se agregação pré-calculada (ex. job periódico) em vez de cálculo em tempo real sobre toda a base para contas mais antigas.
- RNF-03: LGPD: relatórios exportáveis (RF-09) que contenham dados de cliente final devem seguir a mesma política de retenção/consentimento já definida no RNF-05 do PRD-01.

## 8. Fora de escopo nesta versão (v1)
- Metas/benchmarks automáticos comparando a conta do cliente com a média do mercado (ex.: "sua utilização está abaixo dos 56% de mediana do setor") — é uma evolução natural depois que o Kronos tiver dados agregados suficientes dos próprios clientes, não é possível no lançamento.
- Relatórios financeiros completos (lucro, overhead, collections) — os KPIs financeiros citados na pesquisa (ex. produção/receita em Dentista, collection rate em Advocacia) dependem de um módulo financeiro que não está no escopo deste PRD.
- Dashboards multi-unidade/multi-filial — assume-se uma unidade por conta no v1, alinhado à mesma simplificação assumida no PRD-03.

## 9. Riscos e decisões em aberto
- Definir a fórmula exata de "taxa de utilização da agenda" por nicho (o que conta como "horário disponível") é mais delicado do que parece: para Climatização/Assistência Técnica, disponibilidade inclui deslocamento; para Dentista, inclui múltiplas cadeiras em paralelo. Recomenda-se fechar essa definição em conjunto com o PRD-01 antes de implementar RF-02, para não ter que redefinir depois.
- A camada específica por nicho (seção 5.2, RF-03/RF-08) tem o mesmo risco de escopo já levantado nos PRDs anteriores: vale validar com poucos usuários reais antes de construir os 6 conjuntos de KPI completos — priorizar 1-2 nichos primeiro (sugestão: os mesmos priorizados no PRD-02/PRD-03).
- Nenhuma fonte pesquisada trouxe fórmula pronta para "taxa de utilização" em clínica odontológica (foi inferida por analogia a ocupação de cadeira) — vale validar esse cálculo especificamente com um dentista real antes de fixá-lo como KPI universal também para esse nicho.

## 10. Métricas de sucesso (do próprio módulo)
- % de contas que clicam de um KPI do Dashboard para o Relatório detalhado (RF-04) — indica se o Dashboard está de fato despertando curiosidade/ação, e não sendo ignorado.
- % de contas que usam exportação de relatório (RF-09) — proxy de uso externo dos dados (contador, planilha).
- Correlação entre visualização frequente do Dashboard e retenção da conta no Kronos ao longo do tempo (hipótese: donos que acompanham os próprios números tendem a enxergar mais valor no produto).

## 11. Próximos passos sugeridos
1. Fechar com José/Codex a fórmula de "taxa de utilização da agenda" por nicho (risco levantado na seção 9) antes de implementar RF-02.
2. Com os 4 PRDs de módulo entregues (Agenda, Auto-personalização, Kanban, Dashboard/Relatórios), a recomendação é revisar os quatro documentos em conjunto e produzir um PRD-00 consolidado (visão geral do produto), agora que as peças individuais já foram pesquisadas e detalhadas — evita repetir pesquisa de mercado e aproveita o que já foi levantado.

---

### Fontes da pesquisa

- [Zenoti — Salon & Barbershop Metrics: KPIs to Track](https://www.zenoti.com/thecheckin/salon-and-barbershop-metrics-guide)
- [NetSuite — A Comprehensive Guide to Field Service Metrics & KPIs](https://www.netsuite.com/portal/resource/articles/erp/field-services-kpis-metrics.shtml)
- [Databox — Dental KPI Dashboard: 12 Metrics and KPIs to Track](https://databox.com/dental-kpi-dashboard)
- [Clio — 62 Essential Law Firm KPIs and Performance Metrics](https://www.clio.com/blog/law-firm-kpis/)
