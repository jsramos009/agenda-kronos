# Modelo de dados mínimo

| Entidade | Campos essenciais |
|---|---|
| `organizations` | id, name, description, niche_id, timezone, status |
| `organization_themes` | organization_id, logo_url, primary, accent, soft, version |
| `users` | id, name, email, status |
| `memberships` | organization_id, user_id, role, permissions |
| `niche_templates` | id, name, version, palette, workflow, recommendations |
| `services` | id, organization_id, name, duration_min, buffer_min, price, active |
| `resources` | id, organization_id, type, name, capacity |
| `customers` | id, organization_id, name, contacts, preferences, consent |
| `appointments` | id, organization_id, customer_id, service_id, assignee_id, starts_at, ends_at, status |
| `appointment_resources` | appointment_id, resource_id |
| `workflow_stages` | id, organization_id, name, position, wip_limit |
| `work_items` | id, organization_id, appointment_id, stage_id, sla_at, metadata |
| `knowledge_articles` | id, organization_id, type, title, body, status, template_origin |
| `recommendations` | id, organization_id, rule_id, evidence, impact, status, applied_at |
| `audit_events` | id, organization_id, actor_id, action, entity, before, after, created_at |

## Invariantes

- Horários são armazenados em UTC e exibidos no fuso da organização.
- Alteração de status do agendamento e movimentação do Kanban ocorre na mesma transação quando conectadas.
- Tema e template têm versão para diff, rollback e migração.
- Exclusão de cliente respeita retenção legal e anonimiza referências quando necessário.

