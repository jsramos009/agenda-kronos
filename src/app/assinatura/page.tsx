import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CreditCard, ExternalLink, LockKeyhole } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";
import { signOut } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { requestSubscriptionReview } from "./actions";

const planUrl = "https://invoice.infinitepay.io/plans/js_gabrielsilva/U80hrJJ1kZ";

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
    .select("confirmation_requested_at")
    .eq("organization_id", workspace.organizationId)
    .maybeSingle();

  return (
    <main className="billing-page">
      <section className="billing-card">
        <header><KronosMark /><span>Etapa final</span></header>
        <div className="billing-copy">
          <p className="eyebrow">Assinatura Kronos</p>
          <h1>Seu espaço está configurado.</h1>
          <p>Ative a assinatura para liberar a agenda de <strong>{workspace.companyName}</strong> e manter cada dado isolado no seu próprio ambiente.</p>
        </div>
        <div className="billing-plan">
          <span><CreditCard size={20} /></span>
          <div><strong>Plano Kronos</strong><small>Pagamento protegido pela InfinitePay</small></div>
          <BadgeCheck size={19} />
        </div>
        <ul className="billing-benefits">
          <li><LockKeyhole size={16} /> Workspace independente com proteção por tenant</li>
          <li><BadgeCheck size={16} /> Até duas agendas personalizadas</li>
          <li><BadgeCheck size={16} /> Cores, nicho, serviços e fluxo editáveis</li>
        </ul>
        {params.erro ? <div className="form-message form-message--error">{params.erro}</div> : null}
        {params.mensagem ? <div className="form-message form-message--success">{params.mensagem}</div> : null}
        {subscription?.confirmation_requested_at ? (
          <div className="billing-pending"><span>Confirmação solicitada</span><p>Assim que o pagamento for confirmado, o painel será liberado.</p></div>
        ) : null}
        <a className="button button--primary billing-checkout" href={planUrl} target="_blank" rel="noreferrer">
          Assinar com InfinitePay <ExternalLink size={17} />
        </a>
        <form action={requestSubscriptionReview}>
          <button className="button button--secondary">Já concluí a assinatura</button>
        </form>
        <footer>
          <Link href="/onboarding?novo=1">Revisar configuração</Link>
          <form action={signOut}><button>Sair da conta</button></form>
        </footer>
      </section>
    </main>
  );
}
