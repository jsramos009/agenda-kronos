# PRD — Kronos: Kanban de Atendimentos
**Produto:** Kronos — "Seu nicho, seu sistema único"
**Módulo:** Kanban de Atendimentos
**Versão do documento:** 1.0
**Data:** 25/08/2026
**Autor:** Claude (Cowork), em colaboração com José Gabriel Ramos e Codex
**Status:** Rascunho para validação

---

## 1. Contexto

O mockup do Kronos já mostra um Kanban de Atendimentos com 4 colunas fixas — Agendado, Em Andamento, Aguardando, Concluído — cada card representando um cliente + serviço + horário, com opção de "+ Adicionar card". O PRD-01 (Agenda) já definiu que todo agendamento tem um ciclo de vida com os mesmos 4 estados mais Cancelado e Não Compareceu (No-show). O PRD-02 (Auto-personalização) propôs, no RF-10, que o layout de colunas do Kanban seja sugerido de forma diferente por nicho. Este PRD detalha como o Kanban de Atendimentos deve funcionar como produto — não só como visualização — incluindo o que acontece quando o card muda de coluna, quem pode mover, que dados aparecem no card, e como o board se adapta aos 3 padrões de negócio identificados no PRD-01 (atendimento local fixo, atendimento com deslocamento, compromisso com data externa).

## 2. Problema a resolver

Hoje, nos 6 nichos-alvo, o "kanban" da vida real de cada negócio é informal: post-it, agenda de papel marcada com caneta colorida, ou grupo de WhatsApp da equipe avisando "cheguei", "terminei". Isso funciona em pequena escala mas quebra quando o negócio cresce (mais de um profissional, mais de um atendimento simultâneo) ou quando o dono precisa responder rápido "quantos atendimentos estão parados esperando alguma coisa agora?" — pergunta que hoje só é respondida perguntando pessoa por pessoa. O Kanban de Atendimentos do Kronos deveria ser a resposta visual imediata a essa pergunta, sem exigir que o usuário aprenda um conceito novo (o material de marca já usa o termo "Kanban", que é familiar de ferramentas como Trello).

## 3. Objetivo do módulo

Entregar um board Kanban operacional (não decorativo) que reflita em tempo real o estado de cada atendimento agendado, permita mover atendimentos entre estágios por arrastar-e-soltar, dispare ações automáticas relevantes ao mudar de estágio (ex.: notificar o cliente, notificar o técnico), e se adapte ao vocabulário e à estrutura de colunas de cada nicho sem exigir 6 implementações separadas.

## 4. Pesquisa de mercado

### 4.1 CRMs de pipeline (Pipedrive e equivalentes)

O padrão consolidado em CRMs orientados a pipeline como o Pipedrive é: estágios totalmente customizáveis pelo usuário (não fixos no produto), suporte a múltiplos pipelines dentro da mesma conta (por exemplo, um pipeline por tipo de produto/serviço ou por equipe), campos customizados por negócio, board com drag-and-drop para mover itens entre estágios, e automações disparadas quando um item entra em determinado estágio (ex.: enviar e-mail, criar tarefa). ([Pipedrive — Pipeline Management](https://www.pipedrive.com/en/features/pipeline-management)) Isso confirma que "colunas fixas" (como as 4 do mockup atual do Kronos) tendem a ser insuficientes assim que o negócio cresce — o padrão de mercado é permitir customização de estágio por conta, dentro de um template inicial sugerido.

### 4.2 Boards Kanban de ferramentas genéricas (Trello)

Trello e ferramentas equivalentes consolidaram como prática recomendada: limites de WIP (work-in-progress) por coluna, para evitar que uma etapa vire gargalo silencioso; "aging" visual do card (indicador de quanto tempo um card está parado numa coluna sem se mover, sinalizando atraso); e automações do tipo "regra" (mover, notificar, atribuir) disparadas por ação no card, sem exigir código. ([Nave — Aging Chart for Trello](https://getnave.com/aging-chart-for-trello); [Trello — Automate Anything](https://trello.com/guide/automate-anything)) Esses dois conceitos — WIP limit e aging — não aparecem no material de marca atual do Kronos e são um gap real: hoje o mockup mostra quantidade de cards por coluna (ex. "8", "3", "2", "10") mas não indica há quanto tempo cada card está parado ali.

### 4.3 Kanban de field service (o mais próximo do caso Climatização/Assistência Técnica)

A referência mais próxima do padrão "deslocamento" do Kronos é o Kanban de field service management: colunas mapeadas para status de ordem de serviço, configuráveis por conta (exemplos observados: Reativo, Em Progresso, Aguardando Peças, Em Espera, Concluído — muito próximo do que a Assistência Técnica do Kronos precisaria); ao mover o card de coluna, o status muda imediatamente e dispara notificação push para o app do técnico responsável; cada card mostra selo de prioridade/tipo (reativo vs. planejado) e uma contagem regressiva visual de SLA (verde/âmbar/vermelho piscando quando atrasado); é possível atribuir técnico principal e secundário direto pelo card; filtros permitem esconder/mostrar colunas e salvar preferência por usuário; e um modal de agendamento inline abre direto do card para reagendar sem sair do board. ([Field Ascend — Field Service Kanban Board](https://field-ascend.com/field-service-kanban-board)) Este é o modelo de referência mais rico encontrado na pesquisa e mapeia quase 1:1 para o que Climatização e Assistência Técnica precisam no Kronos.

### 4.4 Fluxo de pacientes em clínicas (Dentista)

A pesquisa em ferramentas de gestão de fluxo de pacientes confirma o conceito geral (visualizar atendimento, equipe e tarefas administrativas em um só lugar, balancear carga entre profissionais, reduzir tempo de espera), mas as fontes públicas não detalham colunas específicas de um Kanban odontológico — ou seja, esse é um padrão menos maduro/documentado no mercado do que o de field service, e o Kronos tem oportunidade de definir um modelo de referência próprio para esse nicho (ver seção 6.2).

### 4.5 Conclusão da pesquisa

O board atual do Kronos (4 colunas fixas, sem WIP, sem aging, sem SLA) está no nível de um Kanban genérico de tarefas — adequado como ponto de partida, mas atrás do padrão já praticado por CRMs de pipeline (Pipedrive) e muito atrás do padrão de field service (Field Ascend), que é o mais relevante para 2 dos 6 nichos do Kronos (Climatização e Assistência Técnica). Isso reforça a decisão do PRD-02 de tratar a estrutura de colunas como configurável por nicho (Camada 3), e sugere trazer para o Kronos, mesmo que de forma simplificada no v1, os conceitos de aging e SLA visual do board.

## 5. Requisitos funcionais

### 5.1 Estrutura do board
- RF-01: Colunas padrão do board seguem o ciclo de vida definido no PRD-01: Agendado → Em Andamento → Aguardando → Concluído, mais Cancelado e Não Compareceu como colunas opcionais/ocultáveis (não removidas do sistema, apenas dispensáveis da visualização principal).
- RF-02: O board permite renomear e reordenar colunas por conta (dentro do template sugerido por nicho do PRD-02, RF-10), sem quebrar a lógica de status internos usada por Agenda e Dashboard — ou seja, a coluna visível pode ter nome customizado, mas mapeia sempre para um dos estados internos reconhecidos pelo sistema.
- RF-03: Para o nicho Assistência Técnica/Climatização, oferecer coluna adicional sugerida "Aguardando Peça" (distinta de "Aguardando" genérico), inspirada diretamente no padrão de field service da seção 4.3.
- RF-04: Para o nicho Advocacia, o board não deve ser o mecanismo principal de acompanhamento de prazo (isso é papel da Agenda, conforme RF-19 do PRD-01) — o Kanban aqui serve para tarefas/compromissos operacionais do escritório (reuniões, preparação de peça), não para prazos processuais.

### 5.2 Card
- RF-05: Cada card exibe, no mínimo: nome do cliente, serviço, horário, e (quando aplicável ao nicho) profissional/técnico responsável — já presente no mockup atual.
- RF-06: Selo de prioridade/tipo no card (ex.: urgência/encaixe vs. atendimento normal), inspirado no padrão de "job type and priority badges" do field service (seção 4.3).
- RF-07: Indicador visual de tempo parado na coluna atual ("aging"), sinalizando quando um atendimento está preso em "Aguardando" ou "Em Andamento" além do esperado — conceito trazido do padrão Trello/Nave (seção 4.2), ainda ausente no mockup atual.
- RF-08: Modal de detalhe/edição inline ao clicar no card (reagendar, trocar profissional, adicionar nota), sem precisar sair do board — inspirado no "inline scheduling modal" do field service (seção 4.3).

### 5.3 Interação e automação
- RF-09: Mover um card entre colunas via drag-and-drop atualiza o status do agendamento imediatamente (mesmo dado consumido pela Agenda e pelo Dashboard) — coerência de estado entre os três módulos é crítica, já que os três leem a mesma fonte de verdade.
- RF-10: Ao mover um card para "Concluído", disparar automaticamente (configurável) uma ação pós-atendimento: pedido de avaliação, sugestão de retorno (RF-17 do PRD-01) ou nada, dependendo do nicho.
- RF-11: Ao mover um card para "Não Compareceu", registrar isso na métrica de no-show do cliente (útil para políticas futuras de depósito antecipado, RF-15 do PRD-01).
- RF-12 (v1 simplificado, v2 completo): Limite de WIP por coluna (ex.: alertar visualmente se "Em Andamento" tem mais cards do que profissionais disponíveis simultaneamente) — no v1, mostrar apenas a contagem (já presente no mockup); o bloqueio ativo de novos cards além do limite fica para v2.

### 5.4 Multi-profissional e visão
- RF-13: Filtro do board por profissional/técnico responsável, essencial para contas com múltiplos profissionais (Dentista com várias cadeiras, Salão com vários profissionais, Assistência Técnica com vários técnicos).
- RF-14: Alternância entre "board único da empresa" e "board por profissional", com preferência salva por usuário — inspirado no column picker por usuário do padrão field service (seção 4.3).

## 6. Requisitos não funcionais
- RNF-01: Consistência forte entre Kanban, Agenda e Dashboard: mover um card no board deve refletir instantaneamente nos outros dois módulos (mesma fonte de dados, não sincronização assíncrona com atraso perceptível).
- RNF-02: O board deve permanecer utilizável (sem degradação perceptível) até uma quantidade razoável de cards simultâneos em uma coluna — cenário comum em Salão/Dentista em dias de pico.
- RNF-03: Toda mudança de coluna deve ser auditável (quem moveu, quando, de/para qual coluna), reaproveitando o requisito RNF-04 já definido no PRD-01.

## 7. Fora de escopo nesta versão (v1)
- Múltiplos pipelines paralelos por conta (padrão Pipedrive, seção 4.1) — o Kronos v1 assume um board por conta; múltiplos boards (ex. um por unidade/filial) fica para quando houver demanda real de contas multi-unidade.
- Bloqueio automático de novo card ao estourar limite de WIP (RF-12 completo) — v1 apenas sinaliza.
- SLA com contagem regressiva e cores de alerta (padrão Field Ascade completo) — recomenda-se validar primeiro o aging simples (RF-07) antes de investir num sistema de SLA configurável por serviço/nicho.

## 8. Riscos e decisões em aberto
- Colunas customizáveis por conta (RF-02) trazem risco de fragmentar a leitura de dados no Dashboard/Relatórios se não houver um mapeamento rígido para estados internos — a implementação técnica precisa garantir que "nome de coluna visível" e "estado interno do agendamento" sejam camadas separadas desde o início, não uma refatoração futura.
- A decisão da seção 4.5 (quanto do padrão de field service adotar já no v1 vs. mais adiante) depende de qual nicho José e Codex querem validar primeiro em produção — se for Climatização/Assistência Técnica, vale antecipar RF-03, RF-06 e RF-07; se for Salão/Manicure, esses requisitos podem esperar.

## 9. Métricas de sucesso
- Tempo médio de permanência de um card em cada coluna, por nicho (linha de base para avaliar necessidade futura de SLA/aging mais sofisticado).
- % de atendimentos concluídos que passaram por "Aguardando" (proxy de gargalo operacional).
- Taxa de uso do filtro por profissional (RF-13) — sinaliza se contas multi-profissional realmente usam essa visão ou preferem o board único.
- Taxa de card movido manualmente vs. atualizado automaticamente por outro módulo (ex. confirmação via WhatsApp movendo o card sozinho) — indica o quanto o board está realmente poupando trabalho manual.

## 10. Próximos passos sugeridos
1. Validar com José/Codex se o v1 do Kanban entra com colunas fixas (mais simples, mais rápido de construir) ou já com colunas customizáveis por conta (RF-02) — decisão de sequenciamento, não de escopo final.
2. Seguir para o PRD-04 (Dashboard + Relatórios), que consome diretamente os dados de tempo em coluna (RF-07) e taxa de no-show (RF-11) definidos aqui.

---

### Fontes da pesquisa

- [Pipedrive — Sales Pipeline Management Software](https://www.pipedrive.com/en/features/pipeline-management)
- [Nave — Aging Chart for Trello](https://getnave.com/aging-chart-for-trello)
- [Trello — Automate Anything](https://trello.com/guide/automate-anything)
- [Field Ascend — Field Service Kanban Board](https://field-ascend.com/field-service-kanban-board)
- [Kanban Zone — Workflow Management for Healthcare Clinics](https://kanbanzone.com/solutions/workflow-management-for-healthcare-clinics/)
