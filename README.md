# Kronos — sistema de agendamento adaptativo

Aplicação Next.js e Supabase para organizar agenda, clientes, serviços, atendimentos e indicadores de negócios de serviço.

## O que existe aqui

- `docs/00-descoberta`: leitura da base original e decisões de escopo.
- `docs/01-marca`: fundamentos, tokens e tabelas de cores por nicho.
- `docs/02-produto`: PRD, arquitetura de informação e motor adaptativo.
- `docs/03-ux`: onboarding e especificação de cada página.
- `docs/04-engenharia`: arquitetura, modelo de dados e contratos.
- `docs/05-claude`: contexto e instruções para continuidade no Claude Code.
- `PRDs`: requisitos funcionais e não funcionais entregues para agenda, personalização, kanban e relatórios.
- `src`: aplicação Next.js com site, autenticação SSR, onboarding e primeira fatia operacional persistente.
- `supabase`: configuração local, migrações PostgreSQL, RLS, dados iniciais e testes pgTAP.
- `brand`: fontes visuais originais, tokens e regras de uso.

## Nichos da primeira versão

1. Climatização
2. Odontologia
3. Advocacia
4. Assistência técnica
5. Manicure
6. Salão de beleza

## Rodar em modo de demonstração

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis do Supabase, a interface usa dados demonstrativos e não grava alterações.

## Rodar com banco local

Requer Docker Desktop.

```bash
npm install
npx supabase start
```

Copie `.env.example` para `.env.local` e use a `API_URL` e a `PUBLISHABLE_KEY` exibidas pelo comando. Depois:

```bash
npm run dev
```

As migrações criam seis modelos de nicho, isolamento multiempresa por RLS, autenticação, organização, clientes, serviços, disponibilidade, agenda, recursos, kanban, histórico, notificações, conhecimento, recomendações e auditoria.

## Verificação

```bash
npm run lint
npm run typecheck
npm run build
npx supabase db lint --local --schema public --level warning --fail-on error
npx supabase test db --local
```

## Fonte da verdade

Leia nesta ordem: `CLAUDE.md`, `docs/02-produto/PRD.md`, `docs/01-marca/DESIGN-SYSTEM.md` e `docs/04-engenharia/ARQUITETURA-TECNICA.md`.
