# Design system Kronos

## Direção

Uma interface de precisão tranquila: fundo marfim, tinta escura, linhas finas e pequenos marcadores inspirados em relógios. A principal assinatura visual é a **régua do tempo**, uma linha com marcações e horário atual usada no topo das páginas de operação.

## Tokens da marca

| Token | Valor | Uso |
|---|---:|---|
| `brand.canvas` | `#FFFEFA` | fundo principal |
| `brand.paper` | `#F6F2EA` | superfícies secundárias |
| `brand.ink` | `#201A17` | texto principal |
| `brand.umber` | `#3F1F01` | ações institucionais e foco |
| `brand.copper` | `#825729` | símbolo e detalhes |
| `brand.taupe` | `#806A50` | texto secundário e bordas fortes |
| `neutral.200` | `#E7E0D6` | bordas |
| `neutral.600` | `#6E655D` | texto secundário |
| `success` | `#247A4A` | concluído |
| `warning` | `#A35A13` | atenção |
| `danger` | `#B43B42` | conflito/erro |

As cores do nicho entram como `tenant.primary`, `tenant.accent`, `tenant.soft` e `tenant.line`.

## Tipografia

- **Display:** Univers/Arial Narrow, títulos com peso 700 e tracking negativo discreto.
- **Interface:** Intro Pro/Inter/Arial, corpo e controles.
- **Dados:** ui-monospace, horários, duração, códigos e indicadores.

Escala: 12, 14, 16, 20, 28, 40 px. Corpo padrão 14 px; títulos de página 28 px; grandes números 32–40 px.

## Layout

- Sidebar: 248 px em desktop; navegação inferior compacta em telas pequenas.
- Conteúdo: máximo 1440 px; grid de 12 colunas; gap 20 px.
- Espaçamento: base 4; sequência 4, 8, 12, 16, 20, 24, 32, 40, 56.
- Raios: 8 px para controles, 12 px para cards, 16 px para painéis principais.
- Sombras: apenas em overlays; cards usam borda e contraste de superfície.

## Componentes essenciais

| Componente | Variantes/estados | Regras |
|---|---|---|
| Botão | primary, secondary, ghost, danger; hover, focus, disabled, loading | um CTA primário por região |
| Campo | text, textarea, select, file, search; default, focus, error, disabled | label sempre visível |
| Card | metric, appointment, insight, article, empty | informação acionável, sem decoração gratuita |
| Status | scheduled, in-progress, waiting, completed, cancelled | cor + rótulo + ícone; nunca só cor |
| Kanban | coluna, cartão, limite de WIP | colunas vêm do template do nicho e são editáveis |
| Agenda | dia, semana, lista | conflitos e buffers aparecem explicitamente |
| Data table | default, compact; loading, empty, error | cabeçalho fixo e ações acessíveis por teclado |
| Toast | success, warning, error, neutral | confirmar a mesma ação nomeada no botão |
| Modal/Drawer | confirmation, form, detail | foco preso, Esc fecha, retorno de foco |

## Acessibilidade

- Contraste mínimo WCAG AA: 4,5:1 para texto comum; 3:1 para texto grande e elementos gráficos.
- Foco visível de 2 px usando `tenant.primary`, com offset de 2 px.
- Todos os ícones possuem rótulo acessível quando são o único conteúdo do botão.
- Animações respeitam `prefers-reduced-motion`.
- Grade de agenda oferece alternativa em lista e navegação por teclado.

