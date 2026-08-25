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

O protótipo usa dados locais e `localStorage`. A próxima fatia vertical deve substituir mocks por autenticação, organização, clientes, serviços e agendamentos persistentes, preservando os contratos documentados.

## Verificação

```bash
npm run lint
npm run typecheck
npm run build
```

