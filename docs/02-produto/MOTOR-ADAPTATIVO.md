# Motor de auto-personalização

## Entrada

O motor recebe `niche_id`, descrição livre, tamanho da equipe, modo de atendimento, canais de entrada, horários, recursos e identidade enviada. A descrição livre complementa a seleção; ela nunca substitui a confirmação explícita do nicho.

## Saída configurável

```text
perfil da empresa
  ├── tema visual (tokens do nicho + logo)
  ├── catálogo inicial de serviços e durações
  ├── horários, buffers e recursos
  ├── etapas do Kanban e limites de WIP
  ├── métricas do dashboard
  ├── artigos/checklists sugeridos
  └── insights e automações recomendadas
```

## Regras por nicho

| Nicho | Serviços-modelo | Kanban inicial | Insight-chave | Controle adequado |
|---|---|---|---|---|
| Climatização | instalação, preventiva, reparo, orçamento | agendado → em campo → aguardando peça → concluído | agrupar visitas por região | SLA, deslocamento, peças e retorno |
| Odontologia | avaliação, profilaxia, restauração, retorno | confirmar → recepção → atendimento → pós | reduzir janelas ociosas e no-show | cadeira, profissional, retorno e consentimento |
| Advocacia | consulta, análise, reunião, audiência | triagem → documentos → análise → protocolado | alertar prazo e documento pendente | confidencialidade, prazo e responsável |
| Assistência técnica | diagnóstico, manutenção, instalação, retirada | recebido → diagnóstico → peça → pronto | identificar gargalo de bancada | equipamento, série, peça e SLA |
| Manicure | mão, pé, alongamento, manutenção | solicitado → confirmado → atendimento → finalizado | sugerir encaixes por duração | profissional, mesa, recorrência e no-show |
| Salão | corte, coloração, escova, tratamento | reserva → confirmado → cadeira → fidelização | otimizar profissional e estação | cadeira, duração variável, pacote e retorno |

## Geração de recomendações

1. Detectar um sinal: exemplo, três intervalos de 20 min entre atendimentos.
2. Relacionar ao modelo do nicho: buffers e durações típicas.
3. Gerar recomendação com impacto estimado e reversibilidade.
4. Exibir `Aplicar`, `Editar` e `Dispensar`.
5. Registrar decisão para não repetir sugestões irrelevantes.

## Governança

- Toda sugestão possui origem: “modelo do nicho”, “padrão da sua agenda” ou “configuração da equipe”.
- Aplicações em lote exigem confirmação e mostram diff.
- Mudanças geram versão e opção de restaurar.
- Dados sensíveis não entram em prompts de terceiros sem contrato e consentimento.

