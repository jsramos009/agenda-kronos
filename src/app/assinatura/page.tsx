import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CalendarDays, CreditCard, ExternalLink, LockKeyhole } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";
import { createClient } from "@/lib/supabase/server";
import { subscriptionPlans, type SubscriptionCycle } from "@/lib/subscription-plans";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requestSubscriptionReview, startSubscriptionCheckout } from "./actions";

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ mensagem?: string; erro?: string }>;
}) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/onboarding");
  if (workspace.demo) redirect("/dashboard");
  if (workspace.subscriptionStatus === "active") redirect("/dashboard");
  const params = await searchParams;
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("confirmation_requested_at, billing_cycle")
    .eq("organization_id", workspace.organizationId)
    .maybeSingle();
  const selectedCycle = (subscription?.billing_cycle === "annual" ? "annual" : "monthly") as SubscriptionCycle;
  const selectedPlan = subscriptionPlans[selectedCycle];

  return (
    <main className="billing-page">
      <section className="billing-card">
        <header><KronosMark /><span>Etapa final</span></header>
        <div className="billing-copy">
          <p className="eyebrow">Assinatura Kronos</p>
          <h1>Seu espaço está configurado.</h1>
          <p>Ative a assinatura para liberar a agenda de <strong>{workspace.companyName}</strong> e manter cada dado isolado no seu próprio ambiente.</p>
        </div>
        <div className="billing-plan-heading">
          <span><CreditCard size={20} /></span>
          <div><strong>Escolha seu plano</strong><small>Pagamento protegido pela InfinitePay</small></div>
          <BadgeCheck size={19} />
        </div>
        <div className="billing-plan-options">
          {(Object.values(subscriptionPlans)).map((plan) => (
            <article className={`billing-plan-option ${plan.cycle === selectedCycle ? "billing-plan-option--selected" : ""}`} key={plan.cycle}>
              <header>
                <span><CalendarDays size={18} /></span>
                <em>{plan.badge}</em>
              </header>
              <strong>{plan.name}</strong>
              <p>{plan.description}</p>
              <form action={startSubscriptionCheckout}>
                <input type="hidden" name="billingCycle" value={plan.cycle} />
                <button className={plan.cycle === "annual" ? "button button--primary" : "button button--secondary"}>
                  Escolher {plan.cycle === "annual" ? "anual" : "mensal"} <ExternalLink size={15} />
                </button>
              </form>
            </article>
          ))}
        </div>
        <ul className="billing-benefits">
          <li><LockKeyhole size={16} /> Workspace independente com proteção por tenant</li>
          <li><BadgeCheck size={16} /> Até duas agendas personalizadas</li>
          <li><BadgeCheck size={16} /> Cores, nicho, serviços e fluxo editáveis</li>
        </ul>
        {params.erro ? <div className="form-message form-message--error">{params.erro}</div> : null}
        {params.mensagem ? <div className="form-message form-message--success">{params.mensagem}</div> : null}
        {subscription?.confirmation_requested_at ? (
          <div className="billing-pending"><span>Confirmação solicitada · {selectedPlan.name}</span><p>Assim que o pagamento for confirmado, o painel será liberado.</p></div>
        ) : null}
        <form action={requestSubscriptionReview}>
          <button className="button button--secondary">Já concluí a assinatura do {selectedPlan.name.toLowerCase()}</button>
        </form>
        <footer>
          <Link href="/onboarding?novo=1">Revisar configuração</Link>
          <form action="/auth/logout" method="post"><button>Sair da conta</button></form>
        </footer>
      </section>
    </main>
  );
}
