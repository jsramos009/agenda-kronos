export type FaqCategory = "Primeiros passos" | "Conta e acesso" | "Agenda" | "Personalização" | "Dados e segurança";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  related?: string;
};

export const faqItems: FaqItem[] = [
  { id: "configuracao", category: "Primeiros passos", question: "Como a Kronos configura meu espaço?", answer: "Depois do cadastro, você informa nome, descrição, nicho, horários e recursos. A Kronos usa essas respostas para criar serviços, etapas do atendimento, cores e conteúdos iniciais. Tudo continua editável nas configurações.", related: "Leva cerca de cinco minutos." },
  { id: "nicho", category: "Primeiros passos", question: "Posso trocar de nicho depois?", answer: "Sim. A troca atualiza vocabulário, sugestões e tabela de cores. Antes de salvar, a Kronos mostra uma prévia para você decidir se também quer substituir os modelos de serviços e Kanban existentes.", related: "Seus clientes e agendamentos são preservados." },
  { id: "convite", category: "Conta e acesso", question: "Como adiciono minha equipe?", answer: "Em Configurações, abra Equipe e acesso. Convide a pessoa pelo e-mail e escolha o papel: administrador, recepção, profissional ou analista. Cada papel recebe somente as áreas necessárias para o trabalho.", related: "Convites podem ser cancelados antes do aceite." },
  { id: "senha", category: "Conta e acesso", question: "Esqueci minha senha. O que faço?", answer: "Na tela de entrada, selecione Esqueci minha senha e informe o e-mail da conta. Você receberá um link temporário para criar uma nova senha.", related: "O link expira por segurança." },
  { id: "conflito", category: "Agenda", question: "A agenda evita horários duplicados?", answer: "Sim. Antes de salvar, o sistema valida profissional, recurso, duração e intervalos do serviço. Se houver conflito, o horário é bloqueado e você pode escolher outra janela.", related: "Encaixes exigem confirmação explícita." },
  { id: "publico", category: "Agenda", question: "Meus clientes podem agendar sozinhos?", answer: "A conta pode habilitar um link público de agendamento. Você escolhe serviços, antecedência mínima, horários disponíveis e quais dados serão solicitados ao cliente.", related: "O link público pode ser desligado a qualquer momento." },
  { id: "cancelamento", category: "Agenda", question: "Como funcionam cancelamentos e remarcações?", answer: "A empresa define uma janela mínima. Dentro dela, o cliente pode remarcar ou cancelar pelo link recebido. O motivo fica registrado para os relatórios e para o histórico do cliente.", related: "A política é configurada por conta." },
  { id: "cores", category: "Personalização", question: "Preciso usar a paleta sugerida?", answer: "Não. Cada nicho começa com uma tabela curada para garantir contraste, mas você pode ajustar as cores da conta. A assinatura Kronos permanece consistente enquanto a sua marca conduz ações e destaques.", related: "A prévia é atualizada em tempo real." },
  { id: "logo", category: "Personalização", question: "Quais formatos de logo são aceitos?", answer: "PNG, JPG, WebP e SVG, com até 5 MB. Se a empresa ainda não tiver logo, usamos um monograma temporário criado a partir do nome do negócio.", related: "Prefira arquivos com fundo transparente." },
  { id: "isolamento", category: "Dados e segurança", question: "Os dados de uma empresa ficam separados das outras?", answer: "Sim. Clientes, agenda, equipe e configurações pertencem a uma organização. As políticas de acesso do banco validam a organização e o papel do usuário em cada leitura ou alteração.", related: "O isolamento também vale para arquivos de logo." },
  { id: "exportacao", category: "Dados e segurança", question: "Consigo exportar meus dados?", answer: "Relatórios e listas oferecem exportação em CSV. Os arquivos seguem os filtros aplicados e as exportações que contêm dados de clientes podem ser registradas na auditoria da conta.", related: "Use apenas em dispositivos autorizados." },
  { id: "suporte", category: "Dados e segurança", question: "Como envio uma dúvida que não está aqui?", answer: "Use o formulário desta página. Informe o e-mail da sua conta e descreva o contexto. A estrutura da pergunta fica pronta para triagem sem expor senha, documentos ou dados sensíveis de clientes.", related: "Nunca envie credenciais pelo formulário." },
];

export const faqCategories: Array<"Todas" | FaqCategory> = ["Todas", "Primeiros passos", "Conta e acesso", "Agenda", "Personalização", "Dados e segurança"];
