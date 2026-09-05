export type DashboardGreeting = {
  salutation: "Bom dia" | "Boa tarde" | "Boa noite";
  headline: string;
  welcome: string;
  scheduleMessage: string;
};

export function dashboardGreeting(hour: number, fullName: string, upcomingCount: number): DashboardGreeting {
  const firstName = fullName.trim().split(/\s+/)[0] || "por aí";
  const hasUpcoming = upcomingCount > 0;

  if (hour >= 5 && hour < 12) {
    if (hour >= 11) return {
      salutation: "Bom dia", headline: `Bom dia, ${firstName}.`,
      welcome: "Já está quase na hora do almoço. Faça uma pausa e confira seus agendamentos.",
      scheduleMessage: hasUpcoming ? "Seus próximos horários já estão organizados para o restante do dia." : "A manhã está livre. Aproveite para organizar os próximos atendimentos.",
    };
    return {
      salutation: "Bom dia", headline: `Bom dia, ${firstName}.`,
      welcome: hour < 8 ? "Hoje será um dia fantástico. Vamos começar?" : "A manhã está a todo vapor. Pronto para faturar bastante?",
      scheduleMessage: hasUpcoming ? "Comece com tranquilidade: estes são os próximos horários da operação." : "Sua agenda está livre por enquanto. Que tal preparar o dia?",
    };
  }
  if (hour >= 12 && hour < 18) return {
    salutation: "Boa tarde", headline: `Boa tarde, ${firstName}.`,
    welcome: hour < 14 ? "Faça uma pausa, respire e volte com energia para uma tarde excelente." : hour < 17 ? "A tarde está em movimento. Vamos transformar cada horário em resultado?" : "O dia está avançando bem. Que tal revisar os últimos agendamentos?",
    scheduleMessage: hasUpcoming ? "Aqui estão os próximos compromissos da sua operação." : "Nenhum horário pela frente. Use este momento para planejar o próximo passo.",
  };
  return {
    salutation: "Boa noite", headline: `Boa noite, ${firstName}.`,
    welcome: hour < 21 ? "A operação está organizada para você encerrar o dia com tranquilidade." : "Tudo certo por hoje. Amanhã será mais um dia fantástico.",
    scheduleMessage: hasUpcoming ? "Confira os próximos horários antes de finalizar o dia." : "Sua agenda está tranquila. Descanse, amanhã a gente continua.",
  };
}
