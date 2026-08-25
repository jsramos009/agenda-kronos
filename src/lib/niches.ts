export type NicheId =
  | "climatizacao"
  | "odontologia"
  | "advocacia"
  | "assistencia-tecnica"
  | "manicure"
  | "salao";

export type Niche = {
  id: NicheId;
  label: string;
  descriptor: string;
  theme: { primary: string; accent: string; soft: string; line: string };
  resource: string;
  services: Array<{ name: string; duration: string; price: string }>;
  workflow: Array<{ name: string; tone: string }>;
  insights: Array<{ title: string; evidence: string; impact: string }>;
  knowledge: Array<{ title: string; type: string }>;
};

export const niches: Record<NicheId, Niche> = {
  climatizacao: {
    id: "climatizacao",
    label: "Climatização",
    descriptor: "Visitas técnicas, deslocamento, peças e manutenção preventiva.",
    theme: { primary: "#125A72", accent: "#1F9DBB", soft: "#DDF2F5", line: "#B7DDE5" },
    resource: "Técnicos e veículos",
    services: [
      { name: "Instalação", duration: "2h", price: "R$ 480" },
      { name: "Manutenção preventiva", duration: "1h", price: "R$ 220" },
      { name: "Reparo técnico", duration: "1h30", price: "Sob avaliação" },
    ],
    workflow: [
      { name: "Agendado", tone: "blue" },
      { name: "Em campo", tone: "cyan" },
      { name: "Aguardando peça", tone: "amber" },
      { name: "Concluído", tone: "green" },
    ],
    insights: [
      { title: "Agrupe visitas por região", evidence: "4 deslocamentos cruzam a mesma região amanhã.", impact: "Economia estimada de 1h20." },
      { title: "Crie retorno automático", evidence: "38% das preventivas ainda não têm próxima visita.", impact: "+6 horários recorrentes por mês." },
      { title: "Reserve buffer para instalação", evidence: "Instalações atrasam, em média, 18 minutos.", impact: "Menos 3 conflitos por semana." },
    ],
    knowledge: [
      { title: "Checklist de instalação", type: "Checklist" },
      { title: "Procedimento de manutenção", type: "Processo" },
      { title: "Guia de peças e materiais", type: "Manual" },
    ],
  },
  odontologia: {
    id: "odontologia",
    label: "Odontologia",
    descriptor: "Cadeiras, profissionais, retornos e confirmação de pacientes.",
    theme: { primary: "#145E5A", accent: "#27A89C", soft: "#E0F5F2", line: "#B9DED8" },
    resource: "Cadeiras e profissionais",
    services: [
      { name: "Avaliação", duration: "40 min", price: "R$ 160" },
      { name: "Profilaxia", duration: "50 min", price: "R$ 240" },
      { name: "Restauração", duration: "1h", price: "A partir de R$ 320" },
    ],
    workflow: [
      { name: "A confirmar", tone: "blue" },
      { name: "Na recepção", tone: "cyan" },
      { name: "Em atendimento", tone: "violet" },
      { name: "Pós-atendimento", tone: "green" },
    ],
    insights: [
      { title: "Confirme a agenda da manhã", evidence: "3 pacientes ainda não responderam.", impact: "Protege 2h10 de agenda." },
      { title: "Antecipe dois retornos", evidence: "Há uma janela de 50 minutos na quinta-feira.", impact: "Ocupação pode chegar a 91%." },
      { title: "Padronize o tempo de limpeza", evidence: "Buffers variam entre 5 e 20 minutos.", impact: "Agenda mais previsível." },
    ],
    knowledge: [
      { title: "Checklist de abertura da sala", type: "Checklist" },
      { title: "Orientações pós-procedimento", type: "Modelo" },
      { title: "Perguntas frequentes de retorno", type: "FAQ" },
    ],
  },
  advocacia: {
    id: "advocacia",
    label: "Advocacia",
    descriptor: "Consultas, documentos, responsáveis e prazos sensíveis.",
    theme: { primary: "#24365B", accent: "#A57B38", soft: "#F1EADF", line: "#D7C7AA" },
    resource: "Responsáveis e salas",
    services: [
      { name: "Consulta inicial", duration: "1h", price: "R$ 350" },
      { name: "Análise documental", duration: "1h30", price: "Sob proposta" },
      { name: "Reunião de acompanhamento", duration: "45 min", price: "Incluída" },
    ],
    workflow: [
      { name: "Triagem", tone: "blue" },
      { name: "Documentos", tone: "amber" },
      { name: "Em análise", tone: "violet" },
      { name: "Protocolado", tone: "green" },
    ],
    insights: [
      { title: "Cobre documentos pendentes", evidence: "4 reuniões dependem de anexos do cliente.", impact: "Evita reagendamentos." },
      { title: "Revise dois prazos críticos", evidence: "Vencimento em menos de 48 horas.", impact: "Reduz risco operacional." },
      { title: "Crie um roteiro de triagem", evidence: "Consultas iniciais variam 34 minutos.", impact: "Mais consistência no atendimento." },
    ],
    knowledge: [
      { title: "Roteiro de consulta inicial", type: "Checklist" },
      { title: "Solicitação de documentos", type: "Modelo" },
      { title: "Política de confidencialidade", type: "Processo" },
    ],
  },
  "assistencia-tecnica": {
    id: "assistencia-tecnica",
    label: "Assistência técnica",
    descriptor: "Equipamentos, diagnóstico, peças, bancada e SLA.",
    theme: { primary: "#334155", accent: "#C96A12", soft: "#EEF1F4", line: "#CBD3DD" },
    resource: "Bancadas e técnicos",
    services: [
      { name: "Diagnóstico", duration: "45 min", price: "R$ 90" },
      { name: "Manutenção", duration: "1h30", price: "Sob avaliação" },
      { name: "Instalação", duration: "1h", price: "R$ 180" },
    ],
    workflow: [
      { name: "Recebido", tone: "blue" },
      { name: "Diagnóstico", tone: "amber" },
      { name: "Aguardando peça", tone: "orange" },
      { name: "Pronto", tone: "green" },
    ],
    insights: [
      { title: "Priorize dois SLAs", evidence: "Ordens vencem hoje às 17h.", impact: "Evita atraso comunicado." },
      { title: "Agrupe compras de peça", evidence: "5 ordens aguardam o mesmo fornecedor.", impact: "Menor custo de frete." },
      { title: "Abra uma bancada à tarde", evidence: "Fila de diagnóstico acima do limite.", impact: "Menos 1 dia de espera." },
    ],
    knowledge: [
      { title: "Checklist de recebimento", type: "Checklist" },
      { title: "Roteiro de diagnóstico", type: "Processo" },
      { title: "Termo de retirada", type: "Modelo" },
    ],
  },
  manicure: {
    id: "manicure",
    label: "Manicure",
    descriptor: "Duração, recorrência, preferências e encaixes inteligentes.",
    theme: { primary: "#7B2F5B", accent: "#C94E82", soft: "#F9E5EE", line: "#E4BDD0" },
    resource: "Profissionais e mesas",
    services: [
      { name: "Mão", duration: "40 min", price: "R$ 45" },
      { name: "Pé e mão", duration: "1h20", price: "R$ 82" },
      { name: "Manutenção de gel", duration: "1h40", price: "R$ 135" },
    ],
    workflow: [
      { name: "Solicitado", tone: "pink" },
      { name: "Confirmado", tone: "violet" },
      { name: "Em atendimento", tone: "orange" },
      { name: "Finalizado", tone: "green" },
    ],
    insights: [
      { title: "Ofereça dois encaixes", evidence: "Janelas compatíveis com serviço de mão amanhã.", impact: "+R$ 90 de receita possível." },
      { title: "Convide clientes para retorno", evidence: "8 clientes completam 21 dias nesta semana.", impact: "Agenda recorrente mais estável." },
      { title: "Ajuste duração do gel", evidence: "Últimos 6 serviços levaram 12 min a mais.", impact: "Evita atrasos em sequência." },
    ],
    knowledge: [
      { title: "Checklist de esterilização", type: "Checklist" },
      { title: "Cuidados com alongamento", type: "Modelo" },
      { title: "Política de atraso", type: "FAQ" },
    ],
  },
  salao: {
    id: "salao",
    label: "Salão de beleza",
    descriptor: "Cadeiras, profissionais, duração variável e fidelização.",
    theme: { primary: "#5A3D2E", accent: "#A56644", soft: "#F2E7DD", line: "#DCC8B8" },
    resource: "Cadeiras e profissionais",
    services: [
      { name: "Corte", duration: "50 min", price: "R$ 95" },
      { name: "Escova", duration: "45 min", price: "R$ 80" },
      { name: "Coloração", duration: "2h30", price: "A partir de R$ 260" },
    ],
    workflow: [
      { name: "Reserva", tone: "pink" },
      { name: "Confirmado", tone: "violet" },
      { name: "Em cadeira", tone: "amber" },
      { name: "Fidelização", tone: "green" },
    ],
    insights: [
      { title: "Proteja a janela da coloração", evidence: "Há sobreposição de profissional em 25 minutos.", impact: "Evita atraso em 3 clientes." },
      { title: "Sugira retorno de corte", evidence: "11 clientes chegaram ao ciclo de 45 dias.", impact: "+7 reservas potenciais." },
      { title: "Use uma cadeira ociosa", evidence: "Recurso livre entre 14h e 16h.", impact: "Ocupação pode subir 9%." },
    ],
    knowledge: [
      { title: "Ficha de diagnóstico capilar", type: "Modelo" },
      { title: "Checklist de coloração", type: "Checklist" },
      { title: "Orientações de manutenção", type: "FAQ" },
    ],
  },
};

export const nicheList = Object.values(niches);

export const appointments = [
  { time: "09:00", client: "João Silva", service: "Manutenção preventiva", duration: "1h", status: "Confirmado" },
  { time: "10:30", client: "Maria Santos", service: "Instalação", duration: "2h", status: "A confirmar" },
  { time: "13:30", client: "Carlos Lima", service: "Reparo técnico", duration: "1h30", status: "Confirmado" },
  { time: "15:30", client: "Ana Oliveira", service: "Orçamento", duration: "45 min", status: "Confirmado" },
];

