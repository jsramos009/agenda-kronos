# PRD — Kronos V1

## Visão

Permitir que um pequeno negócio de serviço crie sua conta, descreva como trabalha e receba em minutos um sistema de agenda e controle já configurado para seu nicho — sem perder a liberdade de editar nomes, etapas, cores, serviços e recomendações.

## Usuário principal

Dono(a), administrador(a) ou profissional autônomo que hoje combina WhatsApp, agenda, papel e planilha. Usuários secundários: recepção, técnico/profissional e gestor.

## Objetivos da V1

- Concluir personalização inicial em até 5 minutos.
- Criar primeiro agendamento em até 2 minutos após o onboarding.
- Concentrar agenda, atendimento, cliente e histórico em uma só fonte.
- Oferecer recomendações específicas do nicho com explicação e controle.
- Reduzir faltas e conflitos de horário.

## Fluxo principal

1. Conta criada e e-mail validado.
2. Empresa informa nome, descrição, nicho, tamanho e forma de atendimento.
3. Empresa envia logo ou usa monograma temporário.
4. Motor sugere tabela de cores, serviços, duração, buffers, Kanban, artigos e métricas.
5. Usuário revisa a prévia e ativa o espaço.
6. Dashboard abre com checklist de primeiros passos.

## Escopo funcional

| Épico | Entregas V1 |
|---|---|
| Onboarding | perfil, nicho, logo, descrição, horários, equipe, canais, revisão |
| Agenda | dia/semana/lista, criação, edição, bloqueio, conflito, recorrência simples |
| Atendimentos | Kanban configurável, cartão, status, SLA, notas, anexos |
| Clientes | cadastro, busca, histórico, preferências, consentimentos |
| Serviços | nome, duração, preço, buffer, profissional, recursos |
| Insights | recomendações específicas, motivo, prioridade, aplicar/dispensar |
| Conhecimento | artigos-modelo, checklist, FAQ, procedimentos |
| Relatórios | ocupação, faltas, receita estimada, tempo por etapa, origem |
| Configurações | marca, nicho, equipe, agenda, notificações, Kanban, permissões |

## Fora da V1

Marketplace, prontuário clínico completo, gestão processual jurídica, estoque/ERP profundo, emissão fiscal, pagamentos split e criação automática de campanhas. Integrações externas entram após validação do núcleo.

## Regras críticas

- Uma alteração de nicho nunca apaga dados; gera prévia de migração.
- Recomendações não são aplicadas silenciosamente.
- Eventos da agenda e cartões do Kanban referenciam o mesmo `appointment_id`.
- Logo e cor do cliente nunca removem a identificação da Kronos em áreas administrativas.
- Perfis de acesso limitam dados sensíveis e exportações.

## Métricas de sucesso

- Taxa de conclusão do onboarding.
- Tempo até primeiro valor (primeiro agendamento + cliente).
- Ocupação da agenda e taxa de no-show.
- Recomendações aplicadas/dispensadas.
- Semanas ativas por organização.
- Percentual de atendimentos com fluxo concluído.

## Critérios de aceite do onboarding

- Logo aceita PNG/JPG/WebP até 5 MB e oferece monograma se ausente.
- Usuário vê uma prévia real do dashboard antes de ativar.
- A paleta escolhida passa por validação de contraste.
- Serviços e etapas sugeridos podem ser editados, removidos e reordenados.
- Configuração final é salva como versão recuperável.

