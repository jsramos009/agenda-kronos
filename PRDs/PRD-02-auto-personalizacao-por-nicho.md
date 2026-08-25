# PRD — Kronos: Auto-personalização por Nicho
**Produto:** Kronos — "Seu nicho, seu sistema único"
**Módulo:** Auto-personalização por Nicho (onboarding + white-label leve)
**Versão do documento:** 1.0
**Data:** 25/08/2026
**Autor:** Claude (Cowork), em colaboração com José Gabriel Ramos e Codex
**Status:** Rascunho para validação

---

## 1. Contexto

Este PRD deriva diretamente de uma decisão deixada em aberto no PRD-01 (Agenda / Motor de Agendamento): a pesquisa de mercado mostrou que nenhum concorrente cobre, na mesma ferramenta, os três padrões de agenda que os 6 nichos do Kronos exigem (local fixo, deslocamento, prazo externo), e que isso só funciona se a "Auto-personalização" for mais do que estética. O material de marca já mostra a intenção: no onboarding, o sistema sugere paleta de Cores, Logo, layout da Tabela do Kanban e conteúdo de acordo com o nicho preenchido pelo cliente, com três esquemas de cor prontos como exemplo (pink/magenta, azul/turquesa, laranja/amarelo). O próprio time deixou uma anotação manual "Deve mudar?" sobre Cores, Logo, Tabela do Kanban e Sugestões por nicho — ou seja, a intenção existe, mas o mecanismo por trás não está especificado. Este documento fecha essa lacuna.

## 2. Problema a resolver

Um sistema de agendamento genérico (não personalizado) obriga o dono de um salão de manicure e o dono de uma empresa de climatização a usar os mesmos rótulos, os mesmos campos e a mesma cara visual — mesmo sendo negócios com vocabulário, fluxo e prioridades completamente diferentes. Isso gera duas dores: (a) fricção de adoção, porque o usuário não reconhece o sistema como "feito pra ele"; (b) subaproveitamento, porque campos e passos irrelevantes para o nicho do usuário continuam aparecendo. A promessa de marca do Kronos ("seu nicho, seu sistema único") só se sustenta se a personalização for real e sentida logo no primeiro uso — e não apenas uma escolha de cor no fim do cadastro.

## 3. Objetivo do módulo

Definir um mecanismo de auto-personalização que, a partir do nicho informado no cadastro, configure automaticamente: identidade visual (cores e, futuramente, logo), vocabulário da interface (rótulos de agendamento, colunas do Kanban, campos de formulário), estrutura sugerida do Kanban de Atendimentos, e conteúdo inicial da Base de Conhecimento — sem exigir que o usuário monte tudo do zero, mas mantendo liberdade para ele ajustar depois.

## 4. Pesquisa de mercado

Como não existe um concorrente direto "agendamento auto-personalizado por nicho", a pesquisa desta seção olha para dois tipos de referência: (1) como SaaS verticais/horizontais fazem onboarding adaptado por segmento hoje, e (2) como ferramentas de template/personalização (Notion, Shopify, geradores de paleta de marca) resolvem o problema de "montar algo pronto, mas customizável" no primeiro acesso.

### 4.1 Onboarding adaptado por indústria em SaaS vertical

A prática consolidada em SaaS que atende múltiplos verticais (relatada por consultorias especializadas em ativação de produto) segue seis padrões: mapear o fluxo de trabalho típico de cada indústria e priorizar as funcionalidades relevantes logo de cara (ex.: conformidade para saúde, sincronização de POS para varejo); segmentar por papel do usuário, já que administrador e usuário final têm jornadas de onboarding diferentes; escolher a intensidade do onboarding conforme a complexidade do nicho — self-service para negócios simples, assistido ou humano para nichos regulados/complexos; pré-configurar templates específicos por indústria (documentos de conformidade em logística, contratos padrão em jurídico, estrutura de curso em educação) para que o produto pareça pronto sem parecer engessado; definir métricas de sucesso diferentes por vertical, com prazos (ex.: "importar primeiro registro em 24h"); e garantir que o time de suporte fale a língua do nicho, não apenas a língua do produto. ([Demogo — Vertical SaaS Onboarding](https://demogo.com/2025/06/17/vertical-saas-onboarding-best-strategies-to-personalize-user-journeys-by-industry/))

Isso é diretamente aplicável ao Kronos: os 3 padrões de agenda identificados no PRD-01 (local fixo / deslocamento / prazo externo) pedem, no mínimo, 3 intensidades e conjuntos de campos de onboarding diferentes — não apenas 6 paletas de cor para 6 nichos.

### 4.2 Shopify — personalização de onboarding por tipo de negócio

O Shopify pergunta, logo no cadastro, o estágio do negócio ("estou começando" vs. "já vendo online/presencialmente") e onde está o público do lojista, e usa essas respostas para **reordenar dinamicamente o checklist de onboarding** — cada tipo de resposta muda a prioridade e o conteúdo das tarefas sugeridas, com apenas um item expandido por vez para manter o foco, e uma barra de progresso que reflete os passos reais daquele lojista (não uma lista genérica igual para todos). Recursos essenciais também aparecem direto no feed da home, e não escondidos em menus. ([Candu — How Shopify onboards](https://www.candu.ai/blog/shopify-onboarding-flow))

Aplicação para o Kronos: o cadastro de nicho não deveria só trocar cor — deveria reordenar/filtrar o checklist inicial de configuração ("cadastre seus serviços", "convide sua equipe", "publique seu link de agendamento") de acordo com o padrão de agenda daquele nicho.

### 4.3 Notion — personalização adaptativa por caso de uso

O onboarding do Notion usa um questionário curto (como você trabalha / para que vai usar: trabalho, vida pessoal, educação) que muda o resultado final entregue ao usuário, com feedback visual em tempo real conforme ele responde — o workspace "evolui na tela" à medida que a pessoa escolhe as opções, o que reforça a sensação de que aquele espaço já é seu antes mesmo de ele terminar o cadastro. Depois, o produto detecta domínio de e-mail para sugerir workspace de equipe já existente, evitando fragmentação, e fecha com um tour guiado adaptado ao caso de uso escolhido, não um tour genérico. ([Candu — How Notion crafts onboarding](https://www.candu.ai/blog/how-notion-crafts-a-personalized-onboarding-experience-6-lessons-to-guide-new-users))

Aplicação para o Kronos: a tela de "Auto-personalização" do mockup (com as 3 paletas prontas) deveria dar feedback visual imediato — o próprio preview do dashboard mudando de cor ao vivo conforme o usuário escolhe, e não uma escolha "às cegas" seguida de redirecionamento.

### 4.4 Geradores de paleta/identidade como referência de mecanismo (não de produto)

Ferramentas de geração automática de paleta de marca (existem múltiplas soluções comerciais nesse espaço, ex. geradores de paleta com IA usados em branding) resolvem um problema estrutural parecido com o do Kronos: a partir de uma entrada simples (nicho, humor da marca, uma cor-base), gerar um conjunto pequeno e coerente de opções prontas — não uma paleta livre e ilimitada, que paralisaria o usuário por excesso de escolha. Esse é exatamente o modelo que o material de marca do Kronos já esboçou intuitivamente com as 3 paletas prontas (pink/magenta, azul/turquesa, laranja/amarelo): um conjunto curado, não um seletor de cor livre.

### 4.5 Conclusão da pesquisa

Não existe hoje, nas fontes pesquisadas, um concorrente de agendamento que personalize simultaneamente aparência **e** comportamento funcional por nicho a partir de uma única resposta no cadastro. O padrão de mercado mais próximo (Shopify, Notion) personaliza o *fluxo de onboarding e a priorização de conteúdo*, não a estrutura de dados do produto em si. Isso confirma a mesma conclusão do PRD-01: a auto-personalização do Kronos, se for além do que hoje existe no mercado (cor/logo) e entrar em comportamento funcional real (campos, rótulos, prioridade do checklist), é um diferencial genuíno — mas também o ponto de maior risco técnico do produto, porque exige que o mesmo motor de dados sirva estruturas diferentes sem virar 6 produtos.

## 5. Modelo proposto: personalização em 3 camadas

Para não empurrar o time para "6 sistemas com uma cor diferente" nem para "1 sistema genérico com cor mudando", propõe-se dividir a auto-personalização em três camadas independentes, que podem evoluir em velocidades diferentes:

**Camada 1 — Visual (menor risco, maior retorno perceptível).** Paleta de cor, e futuramente logo, aplicados via tema/tokens de design (não hardcoded), com um conjunto curado de esquemas prontos por nicho (não paleta livre no v1), replicando o padrão já esboçado no material de marca.

**Camada 2 — Vocabulário e campos (risco médio).** Rótulos da interface e campos de formulário adaptados ao nicho (ex.: "Visita Técnica" com campo de endereço para Climatização; "Consulta"/"Retorno" para Dentista; "Audiência"/"Prazo" para Advocacia — ver RF-18/RF-19/RF-20 do PRD-01). Tecnicamente resolvido por um dicionário de termos + formulário dinâmico por nicho, não por telas separadas por nicho.

**Camada 3 — Estrutura sugerida (maior risco, maior diferencial).** Layout inicial sugerido do Kanban de Atendimentos (colunas), checklist de onboarding priorizado (modelo Shopify da seção 4.2), e conteúdo inicial sugerido da Base de Conhecimento (ex.: artigo "Checklist de Instalação" pré-criado para Climatização). Esta camada é onde mora a decisão em aberto "Deve mudar?" e onde recomendamos começar pequeno: no v1, tratar como *sugestão editável*, nunca como estrutura travada — o usuário sempre pode alterar depois.

## 6. Requisitos funcionais

### 6.1 Onboarding e captura do nicho
- RF-01: No cadastro, o usuário seleciona um dos 6 nichos-alvo (Climatização, Dentista, Advocacia, Assistência Técnica, Manicure, Salão) a partir de uma lista fechada — não texto livre — para viabilizar a personalização automática (v1).
- RF-02: Preview em tempo real: ao escolher o nicho e a paleta, o sistema mostra imediatamente uma prévia do dashboard com aquelas cores aplicadas, seguindo o padrão de feedback visual instantâneo identificado no Notion (seção 4.3), antes de confirmar a escolha.
- RF-03: O onboarding pós-cadastro (fluxo "Cadastro!" do wireframe) apresenta um checklist de primeiros passos cuja ordem e conteúdo mudam conforme o nicho (ex.: "cadastre seus técnicos" para Climatização vs. "cadastre suas cadeiras/dentistas" para Dentista), replicando o padrão Shopify da seção 4.2.

### 6.2 Camada visual
- RF-04: Cada nicho tem uma paleta padrão sugerida (as 3 já esboçadas no material servem de ponto de partida), mas o usuário pode trocar por qualquer uma das paletas curadas disponíveis no catálogo, não travada ao nicho escolhido.
- RF-05: Toda cor de interface deve ser resolvida via tokens de tema (não hardcoded em componentes), para permitir trocar a paleta de uma conta sem deploy de código.
- RF-06: Upload de logo próprio do cliente, com fallback para um brasão/monograma gerado automaticamente a partir do nome do negócio quando o cliente ainda não tem logo (reduz fricção de ativação — ver riscos, seção 9).

### 6.3 Camada de vocabulário e campos
- RF-07: Existência de um dicionário de termos por nicho (ex.: chave `appointment.label` = "Visita Técnica" | "Consulta" | "Audiência" | "Atendimento" conforme o nicho) usado em toda a interface, para que a mudança de rótulo não exija tela separada por nicho.
- RF-08: Formulário de novo agendamento com campos condicionais por nicho (endereço para nichos de deslocamento; número de processo para Advocacia; nenhum campo extra para Manicure), conforme já definido como RF-07 e RF-18 do PRD-01.
- RF-09: Interface de administração (não exposta ao cliente final no v1) para o time do Kronos ajustar/adicionar termos e campos por nicho sem alterar código — importante porque a lista de nichos deve crescer além dos 6 iniciais.

### 6.4 Camada de estrutura sugerida
- RF-10: Template de colunas do Kanban de Atendimentos sugerido por nicho no primeiro acesso (ex.: incluir coluna "Aguardando peça" sugerida para Assistência Técnica), sempre editável pelo usuário depois — nunca travado.
- RF-11: Checklist de onboarding priorizado por nicho (RF-03), com metas de ativação por vertical inspiradas na seção 4.1 (ex.: "publique seu link de agendamento" como passo 1 para Manicure/Salão, "cadastre seu primeiro processo" como passo 1 para Advocacia).
- RF-12: Artigo(s) inicial(is) da Base de Conhecimento pré-criados como sugestão por nicho (ex. "Checklist de Instalação" para Climatização, já citado no mockup), marcados como "modelo" e removíveis/editáveis pelo usuário.

## 7. Requisitos não funcionais
- RNF-01: A personalização deve ser resolvida inteiramente por configuração (tema + dicionário + templates versionados), nunca por branch de código por nicho — pré-condição técnica para adicionar um 7º nicho no futuro sem reescrever o produto.
- RNF-02: Alterar a paleta ou os rótulos de uma conta já ativa não pode quebrar dados existentes (ex.: trocar de nicho depois de já ter agendamentos criados deve ser uma operação suportada, mesmo que rara).
- RNF-03: Tempo de carregamento do preview em tempo real (RF-02) deve ser imperceptível (sem reload de página) para não recriar a fricção que a personalização deveria eliminar.

## 8. Fora de escopo nesta versão (v1)
- Geração de logo por IA (RF-06 cobre apenas fallback simples tipo monograma; geração de logo completo por IA é uma feature de v2+).
- Paleta de cor totalmente livre (color picker aberto) — mantém-se catálogo curado no v1, conforme conclusão da seção 4.4.
- Personalização por sub-nicho ou por região (ex.: "Dentista — Ortodontia" como variação de "Dentista") — tratar como evolução futura da Camada 2/3, não do v1.
- Onboarding assistido por humano (modelo "high-touch" da seção 4.1) — o Kronos v1 é self-service para todos os nichos; suporte humano é decisão comercial, não deste PRD.

## 9. Riscos e decisões em aberto
- **Risco de over-engineering:** as 3 camadas propostas na seção 5 podem se tornar 3 sistemas de configuração complexos demais para 6 nichos. Recomenda-se validar a Camada 1 (visual) e parte da Camada 2 (rótulos) primeiro, e só avançar para Camada 3 (estrutura) depois de confirmar com usuários reais que a personalização estrutural realmente muda a percepção de valor — e não é só a equipe do produto assumindo que sim.
- **Decisão em aberto herdada do PRD-01:** a mesma pergunta ("até onde a personalização deve ir") aparece aqui de forma mais concreta — recomenda-se que José e Codex decidam explicitamente qual camada entra no MVP antes de começar a implementação do dicionário de termos (RF-07), porque essa escolha afeta diretamente o modelo de dados de todo o produto, não só deste módulo.
- **Fallback de logo (RF-06):** gerar um monograma automático é a opção mais simples, mas pode ficar genérico demais e contradizer a proposta de "sistema único" — vale validar com uma pequena amostra de usuários dos 6 nichos antes de assumir como padrão definitivo.

## 10. Métricas de sucesso
- Tempo entre início do cadastro e primeiro agendamento criado, comparado entre contas que passaram pela auto-personalização completa vs. contas que só selecionaram o nicho sem interagir com paleta/checklist.
- % de contas que trocam a paleta sugerida pelo nicho (sinal de que a curadoria por nicho está ou não alinhada com a expectativa real do usuário).
- % de itens do checklist de onboarding priorizado (RF-03/RF-11) concluídos nos primeiros 7 dias, por nicho.
- % de artigos-modelo da Base de Conhecimento (RF-12) mantidos vs. removidos pelo usuário — indica se o conteúdo sugerido por nicho é percebido como útil ou como ruído.

## 11. Próximos passos sugeridos
1. Fechar com José/Codex qual camada (visual, vocabulário, estrutura) entra no MVP, antes de iniciar o dicionário de termos por nicho.
2. Seguir para o PRD-03 (Kanban de Atendimentos), que consome diretamente o RF-10 deste documento (template de colunas sugerido por nicho).
3. Depois, PRD-04 (Dashboard + Relatórios), para checar se KPIs também deveriam variar por nicho (ex.: "taxa de retorno" importa mais para Manicure do que para Advocacia).

---

### Fontes da pesquisa

- [Demogo — Vertical SaaS Onboarding: Best Strategies to Personalize User Journeys by Industry](https://demogo.com/2025/06/17/vertical-saas-onboarding-best-strategies-to-personalize-user-journeys-by-industry/)
- [Candu — How Shopify onboards every store with a personalized product experience](https://www.candu.ai/blog/shopify-onboarding-flow)
- [Candu — How Notion crafts a personalized onboarding experience: 6 lessons](https://www.candu.ai/blog/how-notion-crafts-a-personalized-onboarding-experience-6-lessons-to-guide-new-users)
