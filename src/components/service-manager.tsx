"use client";

import { useActionState } from "react";
import { Clock3, MoreHorizontal, UsersRound } from "lucide-react";
import { createService, type ActionState } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export type ServiceRow = { id: string; name: string; description: string; durationMinutes: number; bufferMinutes: number; priceCents: number | null; active: boolean };
const initialActionState: ActionState = { status: "idle", message: "" };

export function ServiceManager({ services, demo }: { services: ServiceRow[]; demo: boolean }) {
  const { niche } = useNiche();
  const [state, action, pending] = useActionState(createService, initialActionState);
  return (
    <>
      <PageHeader eyebrow="Configuração · Catálogo" title="Serviços" description={`Modelos de ${niche.label.toLowerCase()} com duração, preço e recursos necessários.`} action={null} />
      <details className="create-panel">
        <summary className="button button--primary">Novo serviço</summary>
        <form action={action} className="inline-create-form inline-create-form--service">
          <label className="field"><span>Nome</span><input name="name" required /></label>
          <label className="field"><span>Duração (min)</span><input name="durationMinutes" type="number" min={5} defaultValue={60} required /></label>
          <label className="field"><span>Intervalo depois (min)</span><input name="bufferMinutes" type="number" min={0} defaultValue={10} /></label>
          <label className="field"><span>Preço (R$)</span><input name="price" type="number" min={0} step="0.01" defaultValue={0} /></label>
          <label className="check-field"><input name="requiresAddress" type="checkbox" /><span>Exige endereço do cliente</span></label>
          <button className="button button--primary" disabled={pending || demo}>{pending ? "Salvando…" : "Salvar serviço"}</button>
          {state.message ? <span className={`action-feedback action-feedback--${state.status}`}>{state.message}</span> : null}
        </form>
      </details>
      <section className="service-grid">
        {services.map((service, index) => <article key={service.id}><header><span>{String(index + 1).padStart(2, "0")}</span><button aria-label="Opções do serviço"><MoreHorizontal size={18} /></button></header><h2>{service.name}</h2><p>{service.description}</p><div><span><Clock3 size={15} /> {service.durationMinutes} min</span><span><UsersRound size={15} /> +{service.bufferMinutes} min</span></div><footer><strong>{formatCurrency(service.priceCents)}</strong><em>{service.active ? "Ativo" : "Inativo"}</em></footer></article>)}
        <article className="service-template"><span>MODELO DO NICHO</span><h2>Adicione a partir da biblioteca</h2><p>Use um modelo pronto ou crie um serviço do zero.</p><button className="button button--secondary">Abrir biblioteca</button></article>
      </section>
    </>
  );
}

function formatCurrency(value: number | null) {
  if (value === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
}
