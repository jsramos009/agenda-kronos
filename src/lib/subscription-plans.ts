export const subscriptionPlans = {
  monthly: {
    cycle: "monthly",
    name: "Plano mensal",
    description: "Flexibilidade para começar e ajustar sua operação.",
    badge: "Mensal",
    discountPercent: 0,
    url: "https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ",
  },
  annual: {
    cycle: "annual",
    name: "Plano anual",
    description: "Um ano de Kronos com economia sobre o valor mensal.",
    badge: "15% OFF",
    discountPercent: 15,
    url: "https://invoice.infinitepay.io/plans/js_gabrielsilva/b2UiQh9OL1",
  },
} as const;

export type SubscriptionCycle = keyof typeof subscriptionPlans;
