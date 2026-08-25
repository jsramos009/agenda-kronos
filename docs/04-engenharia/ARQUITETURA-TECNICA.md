# Arquitetura técnica

## Stack recomendada

- Next.js App Router + TypeScript para web responsiva.
- PostgreSQL com isolamento por `organization_id`.
- Autenticação baseada em sessão e papéis por organização.
- Fila para lembretes, importações, geração de insights e webhooks.
- Object storage para logos/anexos com URLs assinadas.
- Serviço de recomendação desacoplado; regras determinísticas antes de IA generativa.

## Módulos

```text
Web Next.js
  ├── Auth & tenancy
  ├── Scheduling
  ├── Workflow / Kanban
  ├── CRM de clientes
  ├── Catálogo e recursos
  ├── Knowledge
  ├── Insights
  ├── Reports
  └── Settings / Theme
        │
        ├── PostgreSQL
        ├── Queue/Workers
        ├── Object Storage
        └── Notification providers
```

## Princípios

- Configuração por dados: nichos vivem em templates versionados, não em condicionais espalhadas.
- Agenda é a fonte do horário; workflow referencia o agendamento.
- Escritas passam por serviços transacionais e registram auditoria.
- Server Components carregam dados; Client Components ficam restritos à interação.
- Consultas independentes são paralelizadas e listas grandes usam paginação por cursor.

## Segurança

- `organization_id` obrigatório em todas as tabelas de negócio e políticas de acesso.
- RBAC: admin, atendimento, profissional, analista.
- Criptografia em trânsito e repouso; URLs assinadas; rate limiting.
- Logs de exportação, mudança de permissão, acesso a dado sensível e alteração de agenda.
- Backups testados e política LGPD de retenção/exclusão.

## Evolução

Fase 1: protótipo local e validação. Fase 2: auth, banco, agenda e clientes. Fase 3: notificações, importação e insights. Fase 4: integrações e recursos regulados específicos por vertical.

