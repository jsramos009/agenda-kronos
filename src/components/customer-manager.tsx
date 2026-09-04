"use client";

import { FormEvent, useActionState, useMemo, useState, type SetStateAction } from "react";
import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import { createCustomer, type ActionState } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";

export type CustomerRow = { id: string; name: string; phone: string | null; email: string | null; active: boolean; createdAt: string };
const initialActionState: ActionState = { status: "idle", message: "" };

export function CustomerManager({ customers, demo }: { customers: CustomerRow[]; demo: boolean }) {
  const incomingCustomersSignature = customers.map((customer) => `${customer.id}:${customer.name}:${customer.active}`).join("|");
  const [customerModel, setCustomerModel] = useState(() => ({ signature: incomingCustomersSignature, rows: customers }));
  const rows = customerModel.rows;
  const setRows = (next: SetStateAction<CustomerRow[]>) => setCustomerModel((current) => ({
    ...current,
    rows: typeof next === "function" ? next(current.rows) : next,
  }));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [demoMessage, setDemoMessage] = useState("");
  const [state, action, pending] = useActionState(createCustomer, initialActionState);
  const filtered = useMemo(() => rows.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
    return matchesQuery && (filter === "all" || customer.active === (filter === "active"));
  }), [filter, query, rows]);

  if (customerModel.signature !== incomingCustomersSignature) {
    setCustomerModel({ signature: incomingCustomersSignature, rows: customers });
  }

  const createDemoCustomer = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (name.length < 2 || (!phone && !email)) { setDemoMessage("Informe nome e ao menos um contato."); return; }
    setRows((current) => [{ id: `demo-${crypto.randomUUID()}`, name, phone: phone || null, email: email || null, active: true, createdAt: "Agora" }, ...current]);
    setDemoMessage("Cliente adicionado à demonstração.");
    event.currentTarget.reset();
  };

  const exportCsv = () => {
    const lines = [["Nome", "Telefone", "E-mail", "Cadastro", "Status"], ...filtered.map((item) => [item.name, item.phone ?? "", item.email ?? "", item.createdAt, item.active ? "Ativo" : "Inativo"])];
    downloadCsv("clientes-kronos.csv", lines);
  };

  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Clientes" description="Histórico, preferências e próximos atendimentos em um só lugar." action={null} />
      <details className="create-panel">
        <summary className="button button--primary">Novo cliente</summary>
        <form action={demo ? undefined : action} onSubmit={createDemoCustomer} className="inline-create-form">
          <label className="field"><span>Nome</span><input name="name" required minLength={2} /></label><label className="field"><span>Telefone</span><input name="phone" type="tel" /></label><label className="field"><span>E-mail</span><input name="email" type="email" /></label><button className="button button--primary" disabled={pending}>{pending ? "Salvando…" : "Salvar cliente"}</button>
          <label className="check-field consent-field"><input name="consent" type="checkbox" /> O cliente autorizou o uso deste contato para comunicações da empresa.</label>
          {(demoMessage || state.message) ? <span className={`action-feedback action-feedback--${state.status === "error" ? "error" : "success"}`}>{demoMessage || state.message}</span> : null}
        </form>
      </details>
      <div className="toolbar"><label className="inline-search inline-search--wide"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail…" /></label><div><button className="chip" onClick={() => setFilter((current) => current === "all" ? "active" : current === "active" ? "inactive" : "all")}><SlidersHorizontal size={15} /> {filter === "all" ? "Todos" : filter === "active" ? "Ativos" : "Inativos"}</button><button className="chip" onClick={exportCsv}><Download size={15} /> Exportar</button></div></div>
      <section className="table-panel"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th><th>Status</th></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id} onClick={() => setSelected(customer)} className="clickable-row"><td><div className="client-cell"><span>{initials(customer.name)}</span><strong>{customer.name}</strong></div></td><td>{customer.phone ?? "—"}</td><td>{customer.email ?? "—"}</td><td>{customer.createdAt}</td><td><em className={`status status--${customer.active ? "ativo" : "inativo"}`}>{customer.active ? "Ativo" : "Inativo"}</em></td></tr>)}</tbody></table><footer><span>{filtered.length} de {rows.length} clientes</span></footer></section>
      {selected ? <aside className="detail-drawer"><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={18} /></button><span className="detail-avatar">{initials(selected.name)}</span><p className="eyebrow">Perfil do cliente</p><h2>{selected.name}</h2><dl><div><dt>Telefone</dt><dd>{selected.phone ?? "Não informado"}</dd></div><div><dt>E-mail</dt><dd>{selected.email ?? "Não informado"}</dd></div><div><dt>Cadastro</dt><dd>{selected.createdAt}</dd></div><div><dt>Status</dt><dd>{selected.active ? "Ativo" : "Inativo"}</dd></div></dl><a className="button button--primary" href={`mailto:${selected.email ?? ""}`}>Enviar mensagem</a></aside> : null}
    </>
  );
}

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function downloadCsv(filename: string, rows: string[][]) { const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
