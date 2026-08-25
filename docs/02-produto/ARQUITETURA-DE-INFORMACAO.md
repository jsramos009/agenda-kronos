# Arquitetura de informação e paginação

## Área pública

| Rota | Página | Objetivo |
|---|---|---|
| `/` | Apresentação | explicar proposta e iniciar cadastro |
| `/entrar` | Login | autenticar |
| `/criar-conta` | Cadastro | criar organização e administrador |
| `/recuperar-senha` | Recuperação | restaurar acesso |

## Personalização

| Rota | Etapa | Conteúdo |
|---|---|---|
| `/onboarding/empresa` | 1. Empresa | nome, descrição, nicho, tamanho |
| `/onboarding/identidade` | 2. Identidade | logo, tabela de cores, prévia |
| `/onboarding/operacao` | 3. Operação | horários, equipe, canais, recursos |
| `/onboarding/modelos` | 4. Modelos | serviços, durações, Kanban, conhecimento |
| `/onboarding/revisao` | 5. Revisão | resumo, ajustes e ativação |

No protótipo, essas etapas aparecem em uma única rota para tornar a avaliação mais rápida; na produção, cada etapa deve ter URL própria e salvamento automático.

## Aplicação autenticada

| Rota | Página | Subpáginas/ações |
|---|---|---|
| `/dashboard` | Visão geral | hoje, alertas, próximos, atalhos, onboarding progressivo |
| `/agenda` | Agenda | dia, semana, lista, novo agendamento, bloqueios |
| `/atendimentos` | Kanban | quadro, fila, detalhes do atendimento, automações |
| `/clientes` | Clientes | lista, perfil, histórico, preferências, documentos |
| `/servicos` | Serviços | catálogo, duração, preço, buffers, recursos |
| `/insights` | Insights | caixa de recomendações, aplicados, dispensados |
| `/conhecimento` | Conhecimento | artigos, checklists, FAQ, categorias, editor |
| `/relatorios` | Relatórios | operação, agenda, clientes, financeiro estimado |
| `/configuracoes` | Configurações | empresa, marca, nicho, agenda, equipe, notificações, Kanban, segurança |
| `/ajuda` | Ajuda | central, contato, status, atalhos |

## Navegação por papel

- **Administrador:** todas as páginas.
- **Atendimento/recepção:** dashboard, agenda, atendimentos, clientes e conhecimento.
- **Profissional:** própria agenda, atendimentos atribuídos, clientes autorizados e conhecimento.
- **Analista:** dashboard e relatórios, com dados agregados.

## Busca global

Busca clientes, telefone, serviço, atendimento, artigo e comando. Resultados exibem tipo, contexto, última atualização e ação principal.

