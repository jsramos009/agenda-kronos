# Kronos — instruções para Claude Code

Este repositório contém o produto Kronos: um sistema de agendamento que se autoconfigura para pequenos negócios de serviço.

## Ordem de leitura

1. `docs/00-descoberta/AUDITORIA-DA-BASE.md`
2. `docs/02-produto/PRD.md`
3. `docs/02-produto/ARQUITETURA-DE-INFORMACAO.md`
4. `docs/02-produto/MOTOR-ADAPTATIVO.md`
5. `docs/01-marca/DESIGN-SYSTEM.md`
6. `docs/01-marca/TABELAS-DE-CORES-POR-NICHO.md`
7. `docs/04-engenharia/ARQUITETURA-TECNICA.md`

## Regras de implementação

- Nome oficial: **Kronos**.
- Nichos são dados versionados, nunca forks do produto.
- Marfim/marrom formam a moldura da marca; o nicho muda somente tokens operacionais.
- Recomendações sempre exibem origem, evidência e ações aplicar/editar/dispensar.
- O mesmo agendamento alimenta agenda, Kanban, cliente e relatório.
- Interface em português do Brasil, responsiva, navegável por teclado e com contraste AA.
- Módulos regulados exigem validação específica; não presumir conformidade clínica ou jurídica.

## Estado atual

A primeira fatia vertical usa Supabase para autenticação, organização, tema, clientes, serviços, agendamentos e Kanban persistentes. Sem variáveis de ambiente, a interface entra em modo de demonstração. As próximas fatias devem ampliar disponibilidade/recursos, agendamento público, notificações, conhecimento e relatórios sem duplicar a fonte de dados.

## Verificação

```bash
npm run lint
npm run typecheck
npm run build
```


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
