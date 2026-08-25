# Tabelas de cores por nicho

As tabelas abaixo substituem a ideia inicial de “três paletas por nicho” por uma única tabela operacional específica para cada nicho. Cada tabela traz os tokens necessários para interface, comunicação e Kanban. A moldura institucional da Kronos permanece marfim/marrom.

## 1. Climatização — Ar técnico

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Azul petróleo | `#125A72` | CTA, foco, links |
| Acento | Ciano técnico | `#1F9DBB` | indicadores e gráficos |
| Suave | Névoa fria | `#DDF2F5` | fundos selecionados |
| Linha | Azul gelo | `#B7DDE5` | bordas e agenda |
| Kanban: agendado | Azul claro | `#DCEEF8` | visita marcada |
| Kanban: em campo | Ciano | `#BFEAF0` | execução |
| Kanban: peça/orçamento | Âmbar | `#F7E5BD` | dependência |
| Kanban: concluído | Verde | `#DCECDD` | finalizado |

## 2. Odontologia — Clínica serena

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Verde profundo | `#145E5A` | CTA, foco, links |
| Acento | Menta clínica | `#27A89C` | indicadores e gráficos |
| Suave | Água clara | `#E0F5F2` | fundos selecionados |
| Linha | Menta pálida | `#B9DED8` | bordas e agenda |
| Kanban: confirmação | Azul suave | `#E1EDF5` | retorno pendente |
| Kanban: recepção | Menta | `#D7F0EA` | check-in |
| Kanban: atendimento | Lavanda | `#E9E3F5` | cadeira/procedimento |
| Kanban: retorno | Verde | `#DDEBDA` | pós-atendimento |

## 3. Advocacia — Autoridade sóbria

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Azul jurídico | `#24365B` | CTA, foco, links |
| Acento | Ouro fosco | `#A57B38` | prazos e destaques |
| Suave | Pergaminho | `#F1EADF` | fundos selecionados |
| Linha | Areia | `#D7C7AA` | bordas e agenda |
| Kanban: triagem | Azul névoa | `#E1E8F3` | novo contato |
| Kanban: documentos | Areia | `#F0E4CD` | coleta |
| Kanban: análise | Lavanda cinza | `#E5E2EB` | estudo do caso |
| Kanban: protocolado | Verde oliva claro | `#E4E9D5` | concluído |

## 4. Assistência técnica — Oficina precisa

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Grafite azulado | `#334155` | CTA, foco, links |
| Acento | Laranja ferramenta | `#C96A12` | SLA e alertas operacionais |
| Suave | Cinza oficina | `#EEF1F4` | fundos selecionados |
| Linha | Aço claro | `#CBD3DD` | bordas e agenda |
| Kanban: recebido | Azul aço | `#DEE8F0` | entrada |
| Kanban: diagnóstico | Amarelo técnico | `#F7E9B9` | bancada |
| Kanban: aguardando peça | Laranja pálido | `#F6D8BE` | bloqueio |
| Kanban: pronto | Verde | `#DDECDD` | retirada |

## 5. Manicure — Precisão expressiva

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Vinho ameixa | `#7B2F5B` | CTA, foco, links |
| Acento | Rosa framboesa | `#C94E82` | indicadores e destaques |
| Suave | Rosa véu | `#F9E5EE` | fundos selecionados |
| Linha | Rosa antigo | `#E4BDD0` | bordas e agenda |
| Kanban: solicitado | Rosa névoa | `#F6E3EC` | novo pedido |
| Kanban: confirmado | Lilás | `#E9E0F3` | horário confirmado |
| Kanban: em atendimento | Pêssego | `#F5DFD2` | execução |
| Kanban: finalizado | Verde sálvia | `#DFEBDD` | concluído |

## 6. Salão de beleza — Cuidado editorial

| Papel | Cor | Hex | Aplicação |
|---|---|---:|---|
| Primária | Cacau | `#5A3D2E` | CTA, foco, links |
| Acento | Cobre rosado | `#A56644` | indicadores e destaques |
| Suave | Nude claro | `#F2E7DD` | fundos selecionados |
| Linha | Bege quente | `#DCC8B8` | bordas e agenda |
| Kanban: reserva | Nude | `#F3E6DC` | pedido inicial |
| Kanban: confirmado | Rosé | `#EDD9D6` | horário confirmado |
| Kanban: em cadeira | Dourado pálido | `#EEE3BF` | execução |
| Kanban: fidelização | Verde sálvia | `#E0E9DC` | retorno sugerido |

## Regra de aplicação

O motor escolhe a tabela pelo `niche_id`. O administrador pode ajustar primária e acento, mas o sistema recalcula tons suaves e bloqueia combinações abaixo do contraste mínimo. Status críticos (`danger`, `warning`, `success`) permanecem semânticos e não assumem a cor do nicho.

