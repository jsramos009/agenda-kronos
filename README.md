# Kronos — sistema de agendamento adaptativo

Este pacote transforma a base visual fornecida em uma especificação executável e em um protótipo navegável do produto.

## O que existe aqui

- `docs/00-descoberta`: leitura da base original e decisões de escopo.
- `docs/01-marca`: fundamentos, tokens e tabelas de cores por nicho.
- `docs/02-produto`: PRD, arquitetura de informação e motor adaptativo.
- `docs/03-ux`: onboarding e especificação de cada página.
- `docs/04-engenharia`: arquitetura, modelo de dados e contratos.
- `docs/05-claude`: contexto e instruções para continuidade no Claude Code.
- `src`: protótipo Next.js com onboarding e área autenticada simulada.
- `brand`: fontes visuais originais, tokens e regras de uso.

## Nichos da primeira versão

1. Climatização
2. Odontologia
3. Advocacia
4. Assistência técnica
5. Manicure
6. Salão de beleza

## Rodar o protótipo

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. O protótipo usa dados locais e `localStorage`; não depende de banco ou credenciais.

## Fonte da verdade

Leia nesta ordem: `CLAUDE.md`, `docs/02-produto/PRD.md`, `docs/01-marca/DESIGN-SYSTEM.md` e `docs/04-engenharia/ARQUITETURA-TECNICA.md`.
