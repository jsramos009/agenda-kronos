"use client";

import { useMemo, useState } from "react";
import { Activity, Building2, CircleDollarSign, CreditCard, ExternalLink, Search, ShieldCheck, UsersRound } from "lucide-react";
import { updatePlatformSubscription } from "@/app/admin-kronos/actions";

export type PlatformTenant = {
  id: string; name: string; niche: string; owner: string; createdAt: string;
  status: "pending" | "active" | "past_due" | "cancelled"; cycle: string;
  receiptUrl: string | null; members: number; charges: number; receivedCents: number;
};
export type PlatformCharge = { id: string; tenant: string; description: string; amountCents: number; status: string; dueDate: string; invoiceUrl: string | null };

export function PlatformAdminDashboard({ tenants, charges, monthly }: { tenants: PlatformTenant[]; charges: PlatformCharge[]; monthly: { label: string; value: number }[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"assinantes" | "faturas">("assinantes");
  const filteredTenants = useMemo(() => tenants.filter((tenant) => `${tenant.name} ${tenant.owner} ${tenant.niche}`.toLowerCase().includes(query.toLowerCase())), [query, tenants]);
  const filteredCharges = useMemo(() => charges.filter((charge) => `${charge.tenant} ${charge.description} ${charge.status}`.toLowerCase().includes(query.toLowerCase())), [query, charges]);
  const active = tenants.filter((tenant) => tenant.status === "active").length;
  const pending = tenants.filter((tenant) => tenant.status === "pending" || tenant.status === "past_due").length;
  const received = charges.filter((charge) => ["received", "confirmed", "received_in_cash"].includes(charge.status)).reduce((sum, charge) => sum + charge.amountCents, 0);
  const open = charges.filter((charge) => ["pending", "overdue"].includes(charge.status)).reduce((sum, charge) => sum + charge.amountCents, 0);
  const max = Math.max(...monthly.map((item) => item.value), 1);

  return <main className="platform-admin">
    <header className="platform-admin__top"><div><span><ShieldCheck size={16} /> Central privada Kronos</span><h1>Operação da plataforma</h1><p>Acessos, assinaturas e movimentação financeira em uma visão única.</p></div><a href="/dashboard">Voltar ao workspace</a></header>
    <section className="platform-kpis">
      <article><Building2 /><span>Workspaces</span><strong>{tenants.length}</strong><small>{active} com acesso ativo</small></article>
      <article><UsersRound /><span>Assinantes ativos</span><strong>{active}</strong><small>{pending} exigem atenção</small></article>
      <article><CircleDollarSign /><span>Recebido dos clientes</span><strong>{money(received)}</strong><small>Boletos conciliados</small></article>
      <article><CreditCard /><span>Em aberto</span><strong>{money(open)}</strong><small>Cobranças pendentes e vencidas</small></article>
    </section>
    <section className="platform-overview">
      <div className="platform-chart"><div className="platform-section-title"><div><span>Movimentação</span><h2>Recebimentos em seis meses</h2></div><Activity size={20} /></div><div className="platform-bars">{monthly.map((item) => <div key={item.label}><div><i style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} /><em>{money(item.value)}</em></div><span>{item.label}</span></div>)}</div></div>
      <aside><span>Saúde da base</span><strong>{tenants.length ? Math.round((active / tenants.length) * 100) : 0}%</strong><p>dos espaços estão liberados para uso.</p><div><i style={{ width: `${tenants.length ? (active / tenants.length) * 100 : 0}%` }} /></div><small>{pending ? `${pending} assinatura(s) aguardando revisão.` : "Nenhuma pendência agora."}</small></aside>
    </section>
    <section className="platform-ledger">
      <div className="platform-toolbar"><div className="platform-tabs"><button className={tab === "assinantes" ? "active" : ""} onClick={() => setTab("assinantes")}>Assinantes</button><button className={tab === "faturas" ? "active" : ""} onClick={() => setTab("faturas")}>Faturas e pagamentos</button></div><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, titular ou cobrança" /></label></div>
      {tab === "assinantes" ? <div className="platform-table-wrap"><table><thead><tr><th>Workspace</th><th>Responsável</th><th>Plano</th><th>Uso</th><th>Situação</th><th>Acesso</th></tr></thead><tbody>{filteredTenants.map((tenant) => <tr key={tenant.id}><td><strong>{tenant.name}</strong><small>{tenant.niche} · desde {date(tenant.createdAt)}</small></td><td>{tenant.owner}</td><td><strong>{tenant.cycle === "annual" ? "Anual" : "Mensal"}</strong>{tenant.receiptUrl ? <a href={tenant.receiptUrl} target="_blank" rel="noreferrer">Comprovante <ExternalLink size={13} /></a> : <small>Sem comprovante</small>}</td><td><strong>{tenant.members} acessos</strong><small>{tenant.charges} cobranças · {money(tenant.receivedCents)}</small></td><td><span className={`platform-status platform-status--${tenant.status}`}>{statusLabel(tenant.status)}</span></td><td><form action={updatePlatformSubscription}><input type="hidden" name="organizationId" value={tenant.id} /><select name="status" defaultValue={tenant.status} aria-label={`Acesso de ${tenant.name}`}><option value="active">Ativo</option><option value="pending">Pendente</option><option value="past_due">Em atraso</option><option value="cancelled">Cancelado</option></select><button>Salvar</button></form></td></tr>)}{!filteredTenants.length ? <tr><td colSpan={6}>Nenhum assinante encontrado.</td></tr> : null}</tbody></table></div> : <div className="platform-table-wrap"><table><thead><tr><th>Empresa</th><th>Cobrança</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Documento</th></tr></thead><tbody>{filteredCharges.map((charge) => <tr key={charge.id}><td><strong>{charge.tenant}</strong></td><td>{charge.description}</td><td>{date(charge.dueDate)}</td><td><span className={`platform-status platform-status--${charge.status}`}>{statusLabel(charge.status)}</span></td><td><strong>{money(charge.amountCents)}</strong></td><td>{charge.invoiceUrl ? <a href={charge.invoiceUrl} target="_blank" rel="noreferrer">Abrir <ExternalLink size={13} /></a> : <small>Indisponível</small>}</td></tr>)}{!filteredCharges.length ? <tr><td colSpan={6}>Nenhuma cobrança encontrada.</td></tr> : null}</tbody></table></div>}
    </section>
  </main>;
}

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100); }
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)); }
function statusLabel(value: string) { return ({ active: "Ativo", pending: "Pendente", past_due: "Em atraso", cancelled: "Cancelado", received: "Recebido", confirmed: "Confirmado", received_in_cash: "Recebido", overdue: "Vencido", refunded: "Estornado" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }
