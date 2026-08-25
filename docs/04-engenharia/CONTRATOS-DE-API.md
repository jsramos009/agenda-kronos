# Contratos de API — visão inicial

## Convenções

JSON, IDs opacos, datas ISO 8601, paginação por cursor e idempotency key em criações sensíveis. Erros usam `{ code, message, fieldErrors?, traceId }`.

| Método | Rota | Uso |
|---|---|---|
| `POST` | `/api/onboarding/preview` | gerar configuração sem persistir |
| `POST` | `/api/onboarding/activate` | ativar versão revisada |
| `GET/POST` | `/api/appointments` | listar/criar agenda |
| `PATCH` | `/api/appointments/:id` | reagendar, confirmar, cancelar |
| `GET/POST` | `/api/customers` | listar/criar clientes |
| `GET/POST` | `/api/services` | catálogo |
| `GET/PATCH` | `/api/work-items` | Kanban e SLA |
| `GET/PATCH` | `/api/recommendations` | aplicar/dispensar insight |
| `GET/POST` | `/api/knowledge` | biblioteca |
| `GET` | `/api/reports/operations` | métricas agregadas |
| `GET/PATCH` | `/api/settings/theme` | identidade e tokens |

## Concorrência

Reagendamento exige `version`/ETag. Em conflito, retornar `409 schedule_conflict` com profissional, recurso, faixa e três próximos horários elegíveis.

## Assincronismo

Importação, lembretes e relatórios extensos retornam `job_id`; cliente consulta status ou recebe evento. Webhooks são assinados, idempotentes e repetidos com backoff.

