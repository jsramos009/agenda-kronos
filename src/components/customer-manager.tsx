"use client";

import { useActionState } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { createCustomer, type ActionState } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";

export type CustomerRow = { id: string; name: string; phone: string | null; email: string | null; active: boolean; createdAt: string };
const initialActionState: ActionState = { status: "idle", message: "" };

export function CustomerManager({ customers, demo }: { customers: CustomerRow[]; demo: boolean }) {
  const [state, action, pending] = useActionState(createCustomer, initialActionState);
  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Clientes" description="Histórico, preferências e próximos atendimentos em um só lugar." action={null} />
      <details className="create-panel">
        <summary className="button button--primary">Novo cliente</summary>
        <form action={action} className="inline-create-form">
          <label className="field"><span>Nome</span><input name="name" required minLength={2} /></label>
          <label className="field"><span>Telefone</span><input name="phone" type="tel" /></label>
          <label className="field"><span>E-mail</span><input name="email" type="email" /></label>
          <button className="button button--primary" disabled={pending || demo}>{pending ? "Salvando…" : "Salvar cliente"}</button>
          {demo ? <small>Conecte o banco para habilitar gravação.</small> : null}
          {state.message ? <span className={`action-feedback action-feedback--${state.status}`}>{state.message}</span> : null}
        </form>
      </details>
      <div className="toolbar"><label className="inline-search inline-search--wide"><Search size={16} /><input placeholder="Buscar por nome ou telefone…" /></label><div><button className="chip"><SlidersHorizontal size={15} /> Filtros</button><button className="chip"><Download size={15} /> Exportar</button></div></div>
      <section className="table-panel"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>Cadastro</th><th>Status</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td><div className="client-cell"><span>{initials(customer.name)}</span><strong>{customer.name}</strong></div></td><td>{customer.phone ?? "—"}</td><td>{customer.email ?? "—"}</td><td>{customer.createdAt}</td><td><em className={`status status--${customer.active ? "ativo" : "inativo"}`}>{customer.active ? "Ativo" : "Inativo"}</em></td></tr>)}</tbody></table><footer><span>{customers.length} cliente{customers.length === 1 ? "" : "s"}</span></footer></section>
    </>
  );
}

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
