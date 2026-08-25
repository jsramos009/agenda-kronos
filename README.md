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

## Rotas entregues

- Site público: `/`, `/faq`, `/privacidade` e `/termos`.
- Acesso: `/entrar`, `/criar-conta`, `/recuperar-senha` e `/redefinir-senha`.
- Operação: `/dashboard`, `/agenda`, `/clientes`, `/servicos`, `/atendimentos`, `/insights`, `/conhecimento` e `/relatorios`.
- Administração: `/configuracoes`, `/conta`, `/ajuda` e `/busca`.

As áreas operacionais possuem busca, filtros e estados interativos em demonstração. Quando o Supabase está configurado, os fluxos compatíveis passam a persistir no banco com isolamento por organização.

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

## Conectar ao Supabase hospedado

O projeto remoto `auidksphelvjffwzzpre` já está indicado em `.env.example`. Copie o arquivo para `.env.local`, preencha `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave publicável exibida em **Project Settings > API** e autorize este repositório no Supabase para aplicar as migrações de `supabase/migrations`.

Enquanto a chave publicável não estiver preenchida, a aplicação permanece no modo de demonstração e não tenta consultar o banco local desligado.

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

As migrações criam seis modelos de nicho, isolamento multiempresa por RLS, autenticação, organização, convites de equipe, clientes, serviços, disponibilidade, agenda, recursos, kanban, histórico, notificações, conhecimento, recomendações e auditoria.

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
