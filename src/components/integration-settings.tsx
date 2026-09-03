"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, KeyRound, Landmark, LoaderCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { connectAsaas, disconnectAsaas, type BillingActionState } from "@/app/(workspace)/pagamentos/actions";
import type { PaymentConnection } from "@/components/payment-manager";
import { PageHeader } from "@/components/ui";

const idle: BillingActionState = { status: "idle", message: "" };

export function IntegrationSettings({ connection, resendReady }: { connection: PaymentConnection; resendReady: boolean }) {
  const [state, action, pending] = useActionState(connectAsaas, idle);
  return <>
    <PageHeader eyebrow="Configurações · Integrações" title="Conexões" description="Credenciais, autenticação e meios de pagamento deste workspace." action="Voltar às configurações" actionHref="/configuracoes" />
    <section className="integration-security-note"><ShieldCheck size={20} /><div><strong>Rota administrativa protegida</strong><p>Somente proprietários e administradores podem alterar conexões. Chaves secretas nunca voltam para o navegador.</p></div></section>
    <section className="integration-grid">
      <article className="integration-card integration-card--featured"><header><span><Landmark size={22} /></span><div><small>Cobranças por workspace</small><h2>Asaas</h2></div><Status active={connection.connected} /></header>{connection.connected ? <div className="integration-connected"><p><strong>{connection.accountName || "Conta Asaas"}</strong><span>{connection.environment === "production" ? "Produção" : "Sandbox"}{connection.accountDocument ? ` · ${connection.accountDocument}` : ""}</span></p><p>A baixa automática está ativa e vinculada a este tenant.</p><form action={disconnectAsaas}><button className="button button--secondary">Desconectar conta</button></form></div> : <form action={action} className="integration-form"><label className="field"><span>Ambiente</span><select name="environment" defaultValue="production"><option value="production">Produção — cobranças reais</option><option value="sandbox">Sandbox — testes</option></select></label><label className="field"><span>Chave de API</span><div className="secret-input"><KeyRound size={17} /><input name="apiKey" type="password" autoComplete="off" required placeholder="$aact_••••••••••••••••" /></div></label><button className="button button--primary" disabled={pending}>{pending ? <><LoaderCircle className="spin" size={16} /> Validando…</> : "Conectar e criar webhook"}</button>{state.message ? <p className={`action-feedback action-feedback--${state.status}`}>{state.message}</p> : null}</form>}</article>
      <article className="integration-card"><header><span><Mail size={21} /></span><div><small>E-mails transacionais</small><h2>Resend</h2></div><Status active={resendReady} /></header><p>Confirmações de cadastro, recuperação de acesso e mensagens automáticas do sistema.</p><footer><span>Gerenciado pela plataforma</span><a href="https://resend.com" target="_blank" rel="noreferrer">Abrir Resend <ExternalLink size={13} /></a></footer></article>
      <article className="integration-card"><header><span><CheckCircle2 size={21} /></span><div><small>Autenticação</small><h2>Google</h2></div><Status active /></header><p>Login social habilitado pelo Supabase Auth para todas as contas Kronos.</p><footer><span>Gerenciado pela plataforma</span></footer></article>
      <article className="integration-card"><header><span><CreditCard size={21} /></span><div><small>Assinatura do Kronos</small><h2>InfinitePay</h2></div><Status active /></header><p>Planos mensal e anual disponíveis na etapa de ativação da assinatura.</p><footer><Link href="/assinatura">Ver planos</Link></footer></article>
      <article className="integration-card integration-card--muted"><header><span><MessageCircle size={21} /></span><div><small>Comunicação</small><h2>WhatsApp</h2></div><Status /></header><p>Os atalhos de mensagem já funcionam. A automação oficial será conectada em uma próxima etapa.</p><footer><span>Em preparação</span></footer></article>
    </section>
  </>;
}

function Status({ active = false }: { active?: boolean }) { return <span className={`integration-status ${active ? "active" : ""}`}>{active ? "Ativo" : "Não conectado"}</span>; }
