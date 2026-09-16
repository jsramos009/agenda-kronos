"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, Plus, Printer, QrCode, Trash2, X } from "lucide-react";
import { createReceipt, type ReceiptActionState } from "@/app/(workspace)/recibos/actions";
import { PageHeader } from "@/components/ui";

export type ReceiptCustomer = { id: string; name: string; document: string | null; email: string | null; phone: string | null };
export type ReceiptService = { id: string; name: string; priceCents: number | null };
export type ReceiptListItem = { id: string; number: string; customer: string; service: string; totalCents: number; issuedAt: string; publicToken: string };
type Line = { id: string; type: "service" | "material" | "product" | "other"; description: string; quantity: string; unitPrice: string };
const idle: ReceiptActionState = { status: "idle", message: "" };
const newLine = (): Line => ({ id: crypto.randomUUID(), type: "material", description: "", quantity: "1", unitPrice: "" });
const initialLine: Line = { id: "initial-item", type: "material", description: "", quantity: "1", unitPrice: "" };

export function ReceiptManager({ customers, services, receipts, pixConfigured, demo }: { customers: ReceiptCustomer[]; services: ReceiptService[]; receipts: ReceiptListItem[]; pixConfigured: boolean; demo: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([initialLine]);
  const [state, action, pending] = useActionState(createReceipt, idle);
  const selectedCustomer = customers.find((item) => item.id === customerId);
  const totalCents = useMemo(() => lines.reduce((sum, line) => sum + Math.round((Number(line.quantity.replace(",", ".")) || 0) * (Number(line.unitPrice.replace(",", ".")) || 0) * 100), 0), [lines]);
  const serializedItems = JSON.stringify(lines.map((line) => ({ type: line.type, description: line.description, quantity: Number(line.quantity.replace(",", ".")), unitPriceCents: Math.round((Number(line.unitPrice.replace(",", ".")) || 0) * 100) })));
  const setLine = (id: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const selectService = (id: string) => { const service = services.find((item) => item.id === id); setServiceId(id); if (service) { setServiceDescription(service.name); if (service.priceCents && lines.length === 1 && !lines[0].description) setLines([{ ...lines[0], type: "service", description: service.name, unitPrice: (service.priceCents / 100).toFixed(2).replace(".", ",") }]); } };

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  useEffect(() => {
    if (!creating) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setCreating(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [creating]);

  return <>
    <PageHeader eyebrow="Financeiro · Documentos" title="Recibos" description="Registre serviço, materiais e produtos. O Pix sai pronto com o valor exato do documento." action={null} />
    <div className="receipt-toolbar"><div><strong>{receipts.length}</strong><span>recibos emitidos</span></div><button className="button button--primary" onClick={() => setCreating(true)} disabled={!pixConfigured || customers.length === 0}><Plus size={17} /> Criar novo recibo</button></div>
    {!pixConfigured ? <div className="receipt-callout"><QrCode size={21} /><div><strong>Cadastre sua chave Pix primeiro</strong><span>Ela será convertida em um QR Code com o valor de cada recibo.</span></div><Link className="button button--secondary" href="/configuracoes">Configurar Pix</Link></div> : null}
    <section className="receipt-book">
      {receipts.length ? receipts.map((receipt) => <article key={receipt.id}><div className="receipt-book__mark"><FileText size={18} /></div><div><small>{receipt.number}</small><strong>{receipt.customer}</strong><span>{receipt.service}</span></div><div><strong>{money(receipt.totalCents)}</strong><span>{date(receipt.issuedAt)}</span></div><Link href={`/recibo/${receipt.publicToken}`} target="_blank" aria-label={`Abrir ${receipt.number}`}><ExternalLink size={17} /></Link></article>) : <div className="empty-state"><FileText size={23} /><h3>Nenhum recibo emitido</h3><p>O primeiro documento aparecerá aqui com histórico, Pix e link de compartilhamento.</p></div>}
    </section>
    {creating ? <><button className="drawer-backdrop" aria-label="Fechar criação de recibo" onClick={() => setCreating(false)} /><aside className="receipt-composer" role="dialog" aria-modal="true" aria-label="Criar novo recibo"><header><div><small>Novo documento</small><h2>Criar recibo</h2></div><button className="icon-button" aria-label="Fechar" onClick={() => setCreating(false)}><X size={19} /></button></header>
      <form action={demo ? undefined : action} onSubmit={(event) => { if (demo) { event.preventDefault(); } }}>
        <input type="hidden" name="items" value={serializedItems} />
        <section className="receipt-composer__form"><div className="form-grid"><label className="field"><span>Cliente</span><select name="customerId" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>CPF ou CNPJ</span><input name="customerDocument" defaultValue={selectedCustomer?.document ?? ""} key={selectedCustomer?.id ?? "empty"} placeholder="Opcional" /></label><label className="field"><span>Serviço cadastrado</span><select name="serviceId" value={serviceId} onChange={(e) => selectService(e.target.value)}><option value="">Outro serviço</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Descrição do serviço</span><input name="serviceDescription" required value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} placeholder="Ex.: Instalação de ar-condicionado" /></label></div>
          <div className="receipt-lines"><header><div><strong>Serviços e insumos</strong><span>Detalhe tudo que compõe o valor.</span></div><button type="button" className="button button--secondary" onClick={() => setLines((current) => [...current, newLine()])}><Plus size={15} /> Adicionar item</button></header>{lines.map((line, index) => <div className="receipt-line" key={line.id}><span>{String(index + 1).padStart(2, "0")}</span><select aria-label={`Tipo do item ${index + 1}`} value={line.type} onChange={(e) => setLine(line.id, { type: e.target.value as Line["type"] })}><option value="service">Serviço</option><option value="material">Material</option><option value="product">Produto</option><option value="other">Outro</option></select><input aria-label={`Descrição do item ${index + 1}`} value={line.description} onChange={(e) => setLine(line.id, { description: e.target.value })} placeholder="Descrição" required /><input aria-label={`Quantidade do item ${index + 1}`} value={line.quantity} onChange={(e) => setLine(line.id, { quantity: e.target.value })} inputMode="decimal" placeholder="Qtd." required /><div><span>R$</span><input aria-label={`Valor unitário do item ${index + 1}`} value={line.unitPrice} onChange={(e) => setLine(line.id, { unitPrice: e.target.value })} inputMode="decimal" placeholder="0,00" required /></div><button type="button" aria-label={`Remover item ${index + 1}`} onClick={() => setLines((current) => current.length === 1 ? current : current.filter((item) => item.id !== line.id))}><Trash2 size={16} /></button></div>)}</div>
          <label className="field"><span>Observações</span><textarea name="notes" rows={3} placeholder="Garantia, condições ou informações adicionais." /></label>
        </section>
        <aside className="receipt-composer__summary"><span>Valor total</span><strong>{money(totalCents)}</strong><p>O QR Code Pix será criado exatamente com este valor.</p>{selectedCustomer ? <dl><div><dt>Cliente</dt><dd>{selectedCustomer.name}</dd></div><div><dt>Contato</dt><dd>{selectedCustomer.phone || selectedCustomer.email || "Não informado"}</dd></div></dl> : null}<button className="button button--primary" disabled={pending || totalCents <= 0}>{pending ? "Emitindo…" : "Emitir recibo e Pix"}</button>{state.message ? <div className={`action-feedback action-feedback--${state.status}`}>{state.message}</div> : null}{state.publicToken ? <div className="receipt-success-actions"><Link className="button button--secondary" href={`/recibo/${state.publicToken}`} target="_blank"><Printer size={15} /> Ver recibo</Link><button type="button" className="button button--ghost" onClick={() => navigator.clipboard.writeText(`${location.origin}/recibo/${state.publicToken}`)}><Copy size={15} /> Copiar link</button></div> : null}</aside>
      </form></aside></> : null}
  </>;
}

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function date(value: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
