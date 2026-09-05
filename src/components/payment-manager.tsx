"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  createAsaasCharge,
  syncAsaasCharge,
  type BillingActionState,
} from "@/app/(workspace)/pagamentos/actions";
import { PageHeader } from "@/components/ui";

export type PaymentConnection = {
  connected: boolean;
  environment: "sandbox" | "production";
  accountName: string | null;
  accountDocument: string | null;
  lastVerifiedAt: string | null;
};

export type PaymentCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
};

export type PaymentAppointment = {
  id: string;
  customerId: string;
  label: string;
};

export type PaymentCharge = {
  id: string;
  customerName: string;
  appointmentLabel: string | null;
  description: string;
  amountCents: number;
  dueDate: string;
  status: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  paidAt: string | null;
};

const idle: BillingActionState = { status: "idle", message: "" };

export function PaymentManager({
  connection,
  customers,
  appointments,
  charges,
  today,
  canManage,
  canCreate,
  demo,
}: {
  connection: PaymentConnection;
  customers: PaymentCustomer[];
  appointments: PaymentAppointment[];
  charges: PaymentCharge[];
  today: string;
  canManage: boolean;
  canCreate: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const createForm = useRef<HTMLFormElement>(null);
  const customerSearchInput = useRef<HTMLInputElement>(null);
  const [chargeState, chargeAction, creating] = useActionState(createAsaasCharge, idle);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResultsOpen, setCustomerResultsOpen] = useState(false);
  const [document, setDocument] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "paid" | "overdue">("all");

  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId);
  const customerAppointments = appointments.filter((item) => item.customerId === selectedCustomerId);
  const matchingCustomers = useMemo(() => {
    const normalizedQuery = customerSearch.trim().toLocaleLowerCase("pt-BR");

    return customers
      .filter((customer) => {
        if (!normalizedQuery) return true;
        return `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""} ${customer.document ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedQuery);
      })
      .slice(0, 7);
  }, [customerSearch, customers]);
  const filteredCharges = useMemo(() => charges.filter((charge) => {
    const matchesQuery = `${charge.customerName} ${charge.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.trim().toLocaleLowerCase("pt-BR"));
    const category = statusCategory(charge.status);
    return matchesQuery && (filter === "all" || category === filter);
  }), [charges, filter, query]);

  const totals = useMemo(() => ({
    open: charges.filter((item) => statusCategory(item.status) === "open").reduce((sum, item) => sum + item.amountCents, 0),
    paid: charges.filter((item) => statusCategory(item.status) === "paid").reduce((sum, item) => sum + item.amountCents, 0),
    overdue: charges.filter((item) => statusCategory(item.status) === "overdue").reduce((sum, item) => sum + item.amountCents, 0),
  }), [charges]);

  useEffect(() => {
    if (chargeState.status !== "success") return;
    createForm.current?.reset();
    router.refresh();
  }, [chargeState.status, router]);

  const selectCustomer = (id: string) => {
    const customer = customers.find((item) => item.id === id);
    customerSearchInput.current?.setCustomValidity("");
    setSelectedCustomerId(id);
    setCustomerSearch(customer?.name ?? "");
    setDocument(customer?.document ?? "");
    setCustomerResultsOpen(false);
  };

  const stopDemo = (event: FormEvent<HTMLFormElement>) => {
    if (demo) {
      event.preventDefault();
      return;
    }

    if (!selectedCustomerId) {
      event.preventDefault();
      customerSearchInput.current?.setCustomValidity("Selecione um cliente cadastrado na lista.");
      customerSearchInput.current?.reportValidity();
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Pagamentos e boletos"
        description="Emita cobranças para os clientes da agenda e acompanhe cada baixa diretamente pelo Asaas."
        action={null}
      />

      <section className={`asaas-connection ${connection.connected ? "asaas-connection--active" : ""}`}>
        <span className="asaas-connection__mark"><Landmark size={22} /></span>
        <div>
          <small>Integração Asaas</small>
          <strong>{connection.connected ? connection.accountName || "Conta conectada" : "Conecte a conta deste espaço"}</strong>
          <p>{connection.connected
            ? `${connection.environment === "production" ? "Produção" : "Sandbox"}${connection.accountDocument ? ` · ${connection.accountDocument}` : ""}`
            : "A chave fica criptografada e é usada somente no servidor."}</p>
        </div>
        {connection.connected ? <div className="asaas-connection__status"><CheckCircle2 size={16} /> Baixa automática ativa</div> : null}
        {canManage && !demo ? <Link className="button button--secondary" href="/configuracoes/integracoes">Configurar conexão</Link> : null}
      </section>

      {!connection.connected ? (
        <section className="billing-connect-panel billing-connect-panel--redirect">
          <div className="billing-connect-panel__copy">
            <p className="eyebrow">Conexão por workspace</p>
            <h2>Uma conta Asaas para cada agenda</h2>
            <p>Por segurança, chaves e webhooks são gerenciados em uma rota protegida nas configurações.</p>
            <ul>
              <li><ShieldCheck size={16} /> Credencial criptografada antes de chegar ao banco</li>
              <li><ShieldCheck size={16} /> Webhook criado automaticamente para conciliação</li>
              <li><Banknote size={16} /> Boleto vinculado ao cliente e ao agendamento</li>
            </ul>
          </div>
          {canManage && !demo ? <Link className="button button--primary" href="/configuracoes/integracoes">Abrir integrações</Link> : <div className="billing-permission-note"><TriangleAlert size={18} /><p><strong>Acesso administrativo necessário</strong><span>Peça a um proprietário ou administrador para conectar a conta Asaas.</span></p></div>}
        </section>
      ) : null}

      <section className="billing-ledger-summary" aria-label="Resumo das cobranças">
        <article><span><CalendarClock size={18} /></span><small>Em aberto</small><strong>{money(totals.open)}</strong><p>Aguardando vencimento ou confirmação</p></article>
        <article><span><CheckCircle2 size={18} /></span><small>Recebido</small><strong>{money(totals.paid)}</strong><p>Valores conciliados pelo Asaas</p></article>
        <article><span><TriangleAlert size={18} /></span><small>Vencido</small><strong>{money(totals.overdue)}</strong><p>Cobranças que pedem acompanhamento</p></article>
      </section>

      <section id="nova-cobranca" className="billing-issue-panel billing-issue-panel--wide">
          <header><span><CircleDollarSign size={19} /></span><div><h2>Gerar boleto</h2><p>A cobrança ficará registrada no histórico do cliente.</p></div></header>
          {!connection.connected ? <div className="billing-empty-lock"><Landmark size={23} /><strong>Conecte o Asaas para começar</strong><span>O formulário será liberado após validar a conta.</span></div> : !canCreate ? <div className="billing-empty-lock"><ShieldCheck size={23} /><strong>Perfil somente para consulta</strong><span>Administradores e recepção podem emitir cobranças.</span></div> : customers.length === 0 ? <div className="billing-empty-lock"><Banknote size={23} /><strong>Nenhum cliente cadastrado</strong><span>Cadastre um cliente antes de emitir o primeiro boleto.</span><Link className="button button--secondary" href="/clientes">Ir para clientes</Link></div> : (
            <form ref={createForm} action={demo ? undefined : chargeAction} onSubmit={stopDemo} className="billing-issue-form">
              <div
                className="field field--wide billing-customer-search"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setCustomerResultsOpen(false);
                }}
              >
                <span>Cliente</span>
                <input type="hidden" name="customerId" value={selectedCustomerId} />
                <div className="billing-customer-search__control">
                  <Search size={18} aria-hidden="true" />
                  <input
                    ref={customerSearchInput}
                    value={customerSearch}
                    onChange={(event) => {
                      event.currentTarget.setCustomValidity("");
                      setCustomerSearch(event.target.value);
                      setSelectedCustomerId("");
                      setDocument("");
                      setCustomerResultsOpen(true);
                    }}
                    onFocus={() => setCustomerResultsOpen(true)}
                    role="combobox"
                    aria-expanded={customerResultsOpen}
                    aria-controls="billing-customer-results"
                    aria-autocomplete="list"
                    autoComplete="off"
                    required
                    placeholder="Digite nome, e-mail, telefone ou CPF/CNPJ"
                  />
                </div>
                {customerResultsOpen ? (
                  <div className="billing-customer-search__results" id="billing-customer-results" role="listbox">
                    {matchingCustomers.length > 0 ? matchingCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        role="option"
                        aria-selected={customer.id === selectedCustomerId}
                        onClick={() => selectCustomer(customer.id)}
                      >
                        <span className="billing-customer-search__avatar">{customerInitials(customer.name)}</span>
                        <span className="billing-customer-search__identity">
                          <strong>{customer.name}</strong>
                          <small>{customer.email || customer.phone || "Cliente cadastrado"}</small>
                        </span>
                        <span className="billing-customer-search__document">{customer.document || "Documento pendente"}</span>
                      </button>
                    )) : (
                      <div className="billing-customer-search__empty">
                        <strong>Nenhum cliente encontrado</strong>
                        <span>Revise a busca ou cadastre o cliente primeiro.</span>
                      </div>
                    )}
                  </div>
                ) : null}
                {selectedCustomer ? <small className="billing-customer-search__selected"><CheckCircle2 size={14} /> {selectedCustomer.name} selecionado</small> : null}
              </div>
              <label className="field"><span>CPF ou CNPJ</span><input name="customerDocument" value={document} onChange={(event) => setDocument(event.target.value)} inputMode="numeric" required placeholder="Somente números" /></label>
              <label className="field"><span>Valor</span><div className="money-input"><span>R$</span><input name="amount" type="number" min="1" max="1000000" step="0.01" required placeholder="0,00" /></div></label>
              <label className="field"><span>Vencimento</span><input name="dueDate" type="date" min={today} required /></label>
              <label className="field"><span>Agendamento</span><select name="appointmentId" defaultValue=""><option value="">Sem vínculo específico</option>{customerAppointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.label}</option>)}</select></label>
              <label className="field field--wide"><span>Descrição</span><textarea name="description" rows={3} required placeholder={`Serviço prestado para ${selectedCustomer?.name ?? "o cliente"}`} /></label>
              <button className="button button--primary field--wide" disabled={creating || demo}>{creating ? <><LoaderCircle className="spin" size={16} /> Gerando…</> : demo ? "Disponível na conta real" : "Gerar boleto no Asaas"}</button>
              {chargeState.message ? <p className={`action-feedback action-feedback--${chargeState.status}`}>{chargeState.message}</p> : null}
            </form>
          )}
      </section>

      <div className="billing-lower-grid">
        <aside className="billing-flow-note">
          <p className="eyebrow">Como funciona</p>
          <ol>
            <li><span>1</span><div><strong>Cliente sincronizado</strong><p>O cadastro é reaproveitado no Asaas pelo ID do Kronos.</p></div></li>
            <li><span>2</span><div><strong>Boleto emitido</strong><p>A fatura e o boleto ficam disponíveis aqui.</p></div></li>
            <li><span>3</span><div><strong>Pagamento conciliado</strong><p>O webhook atualiza pago, pendente ou vencido.</p></div></li>
          </ol>
        </aside>
        <section className="billing-ledger">
          <header>
            <div><h2>Livro de cobranças</h2><p>{charges.length} {charges.length === 1 ? "cobrança registrada" : "cobranças registradas"}</p></div>
            <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou descrição…" /></label>
          </header>
          <nav className="billing-filters" aria-label="Filtrar cobranças">{(["all", "open", "paid", "overdue"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{filterLabel(item)}</button>)}</nav>
          {filteredCharges.length === 0 ? <div className="billing-ledger__empty"><Banknote size={25} /><strong>Nenhuma cobrança neste filtro</strong><span>Os boletos emitidos aparecerão aqui com a situação atualizada.</span></div> : <div className="billing-table-wrap"><table><thead><tr><th>Cliente</th><th>Descrição</th><th>Vencimento</th><th>Situação</th><th>Valor</th><th aria-label="Ações" /></tr></thead><tbody>{filteredCharges.map((charge) => <tr key={charge.id}><td><strong>{charge.customerName}</strong><small>{charge.appointmentLabel || "Cobrança avulsa"}</small></td><td>{charge.description}</td><td>{dateLabel(charge.dueDate)}</td><td><span className={`billing-status billing-status--${statusCategory(charge.status)}`}>{statusLabel(charge.status)}</span></td><td><strong>{money(charge.amountCents)}</strong>{charge.paidAt ? <small>Baixa em {dateLabel(charge.paidAt)}</small> : null}</td><td><div className="billing-row-actions">{charge.bankSlipUrl || charge.invoiceUrl ? <a href={charge.bankSlipUrl || charge.invoiceUrl || "#"} target="_blank" rel="noreferrer">Abrir <ArrowUpRight size={14} /></a> : null}{!demo ? <form action={syncAsaasCharge}><input type="hidden" name="chargeId" value={charge.id} /><button title="Atualizar situação" aria-label={`Atualizar cobrança de ${charge.customerName}`}><RefreshCw size={14} /></button></form> : null}</div></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </>
  );
}

function statusCategory(status: string): "open" | "paid" | "overdue" {
  if (["confirmed", "received", "received_in_cash"].includes(status)) return "paid";
  if (["overdue", "dunning_requested", "dunning_received", "chargeback_requested", "chargeback_dispute"].includes(status)) return "overdue";
  return "open";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    received: "Recebido",
    received_in_cash: "Recebido em dinheiro",
    overdue: "Vencido",
    refunded: "Estornado",
    refund_requested: "Estorno solicitado",
    refund_in_progress: "Estorno em andamento",
    deleted: "Excluído",
    cancelled: "Cancelado",
    awaiting_risk_analysis: "Em análise",
    dunning_requested: "Negativação solicitada",
    dunning_received: "Negativado",
  };
  return labels[status] ?? "Em processamento";
}

function filterLabel(filter: "all" | "open" | "paid" | "overdue") {
  return { all: "Todas", open: "Em aberto", paid: "Recebidas", overdue: "Vencidas" }[filter];
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function dateLabel(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00-03:00`) : new Date(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function customerInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}
