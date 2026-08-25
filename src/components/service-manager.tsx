"use client";

import { FormEvent, useActionState, useMemo, useState } from "react";
import { Clock3, MoreHorizontal, Search, UsersRound, X } from "lucide-react";
import { createService, type ActionState } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export type ServiceRow = { id: string; name: string; description: string; durationMinutes: number; bufferMinutes: number; priceCents: number | null; active: boolean };
const initialActionState: ActionState = { status: "idle", message: "" };

export function ServiceManager({ services, demo }: { services: ServiceRow[]; demo: boolean }) {
  const { niche } = useNiche();
  const [rows, setRows] = useState(services);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(createService, initialActionState);
  const filtered = useMemo(() => rows.filter((service) => (!activeOnly || service.active) && `${service.name} ${service.description}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [activeOnly, query, rows]);

  const createDemoService = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const durationMinutes = Number(form.get("durationMinutes"));
    if (name.length < 2 || durationMinutes < 5) { setMessage("Revise nome e duração."); return; }
    setRows((current) => [...current, { id: `demo-${crypto.randomUUID()}`, name, description: "Serviço criado nesta demonstração.", durationMinutes, bufferMinutes: Number(form.get("bufferMinutes") ?? 0), priceCents: Math.round(Number(form.get("price") ?? 0) * 100), active: true }]);
    setMessage("Serviço criado na demonstração."); event.currentTarget.reset();
  };

  const addTemplate = (name: string, duration: string, price: string) => {
    if (rows.some((row) => row.name === name)) { setMessage("Esse modelo já está no catálogo."); return; }
    setRows((current) => [...current, { id: `template-${crypto.randomUUID()}`, name, description: `Modelo de ${niche.label.toLowerCase()} adicionado à demonstração.`, durationMinutes: Number.parseInt(duration) || 60, bufferMinutes: 10, priceCents: currencyToCents(price), active: true }]);
    setMessage("Modelo adicionado ao catálogo.");
  };

  return <>
    <PageHeader eyebrow="Configuração · Catálogo" title="Serviços" description={`Modelos de ${niche.label.toLowerCase()} com duração, preço e recursos necessários.`} action={null} />
    <details className="create-panel"><summary className="button button--primary">Novo serviço</summary><form action={demo ? undefined : action} onSubmit={createDemoService} className="inline-create-form inline-create-form--service"><label className="field"><span>Nome</span><input name="name" required /></label><label className="field"><span>Duração (min)</span><input name="durationMinutes" type="number" min={5} defaultValue={60} required /></label><label className="field"><span>Intervalo depois (min)</span><input name="bufferMinutes" type="number" min={0} defaultValue={10} /></label><label className="field"><span>Preço (R$)</span><input name="price" type="number" min={0} step="0.01" defaultValue={0} /></label><label className="check-field"><input name="requiresAddress" type="checkbox" /><span>Exige endereço do cliente</span></label><button className="button button--primary" disabled={pending}>{pending ? "Salvando…" : "Salvar serviço"}</button>{(message || state.message) ? <span className={`action-feedback action-feedback--${state.status === "error" ? "error" : "success"}`}>{message || state.message}</span> : null}</form></details>
    <div className="toolbar"><label className="inline-search inline-search--wide"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar serviço…" /></label><button className={`chip ${activeOnly ? "active" : ""}`} onClick={() => setActiveOnly((value) => !value)}>Somente ativos</button></div>
    <section className="service-grid">{filtered.map((service, index) => <article key={service.id}><header><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => setSelected(service)} aria-label={`Detalhes de ${service.name}`}><MoreHorizontal size={18} /></button></header><h2>{service.name}</h2><p>{service.description}</p><div><span><Clock3 size={15} /> {service.durationMinutes} min</span><span><UsersRound size={15} /> +{service.bufferMinutes} min</span></div><footer><strong>{formatCurrency(service.priceCents)}</strong><em>{service.active ? "Ativo" : "Inativo"}</em></footer></article>)}<article className="service-template"><span>MODELO DO NICHO</span><h2>Adicione a partir da biblioteca</h2><p>Use um modelo pronto ou crie um serviço do zero.</p><button className="button button--secondary" onClick={() => setLibraryOpen(true)}>Abrir biblioteca</button></article></section>
    {selected ? <aside className="detail-drawer"><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={18} /></button><p className="eyebrow">Serviço</p><h2>{selected.name}</h2><p>{selected.description}</p><dl><div><dt>Duração</dt><dd>{selected.durationMinutes} min</dd></div><div><dt>Intervalo</dt><dd>{selected.bufferMinutes} min</dd></div><div><dt>Preço</dt><dd>{formatCurrency(selected.priceCents)}</dd></div></dl>{demo ? <button className="button button--secondary" onClick={() => { setRows((current) => current.map((row) => row.id === selected.id ? { ...row, active: !row.active } : row)); setSelected(null); }}>Marcar como {selected.active ? "inativo" : "ativo"}</button> : null}</aside> : null}
    {libraryOpen ? <aside className="detail-drawer detail-drawer--wide"><button className="icon-button" onClick={() => setLibraryOpen(false)} aria-label="Fechar biblioteca"><X size={18} /></button><p className="eyebrow">Biblioteca · {niche.label}</p><h2>Modelos prontos</h2><div className="template-list">{niche.services.map((template) => <article key={template.name}><div><strong>{template.name}</strong><small>{template.duration} · {template.price}</small></div><button className="button button--secondary" onClick={() => addTemplate(template.name, template.duration, template.price)}>Adicionar</button></article>)}</div></aside> : null}
  </>;
}

function formatCurrency(value: number | null) { if (value === null) return "Sob consulta"; return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
function currencyToCents(value: string) { const numeric = Number(value.replace(/[^\d,]/g, "").replace(",", ".")); return Number.isFinite(numeric) ? Math.round(numeric * 100) : null; }
