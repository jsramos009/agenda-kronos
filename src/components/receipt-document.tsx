"use client";

import { BadgeCheck, Check, Copy, FileText, Printer, UserRound } from "lucide-react";
import { PixQrCode } from "@/components/pix-qr-code";

type Item = { id: string; description: string; quantity: number; unitPriceCents: number; totalCents: number };
type Receipt = { number: string; customerName: string; customerDocument: string | null; totalCents: number; pixKey: string; pixPayload: string; issuedAt: string };
type Organization = { name: string; logoUrl: string | null };

export function ReceiptDocument({ receipt, items, organization }: { receipt: Receipt; items: Item[]; organization: Organization }) {
  const copyPix = () => navigator.clipboard.writeText(receipt.pixPayload);

  return (
    <main className="public-receipt-shell">
      <div className="public-receipt-actions" aria-label="Ações do recibo">
        <button onClick={copyPix}><Copy size={16} /> Copiar Pix</button>
        <button onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
      </div>

      <article className="receipt-paper">
        <header className="receipt-paper__heading">
          <div><h1>Recibo online</h1><p>Comprovante de pagamento emitido pelo sistema Kronos.</p></div>
          <div className="receipt-paper__number"><strong>#{receipt.number}</strong><span>{dateTime(receipt.issuedAt)}</span></div>
        </header>

        <section className="receipt-paper__summary">
          <div className="receipt-paper__brand">
            <span className={organization.logoUrl ? "has-logo" : ""} style={organization.logoUrl ? { backgroundImage: `url(${organization.logoUrl})` } : undefined} aria-hidden="true">{organization.logoUrl ? null : initials(organization.name)}</span>
            <div><small>Emitido por</small><strong>{organization.name}</strong></div>
          </div>
          <div className="receipt-paper__paid"><BadgeCheck size={25} /><span>Pagamento recebido</span><strong>{money(receipt.totalCents)}</strong></div>
        </section>

        <section className="receipt-paper__section">
          <header><span><UserRound size={18} /></span><h2>Cliente</h2></header>
          <div className="receipt-paper__customer"><strong>{receipt.customerName}</strong>{receipt.customerDocument ? <small>{documentLabel(receipt.customerDocument)}</small> : null}</div>
        </section>

        <section className="receipt-paper__section">
          <header><span><FileText size={18} /></span><h2>Detalhes do pagamento</h2></header>
          <table>
            <thead><tr><th>Serviço ou item</th><th>Qtd.</th><th>Valor unitário</th><th>Total</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td data-label="Item">{item.description}</td><td data-label="Quantidade">{number(item.quantity)}</td><td data-label="Valor unitário">{money(item.unitPriceCents)}</td><td data-label="Total">{money(item.totalCents)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={3}>Valor recebido</td><td>{money(receipt.totalCents)}</td></tr></tfoot>
          </table>
        </section>

        <section className="receipt-paper__statement"><Check size={18} /><div><strong>Pagamento confirmado</strong><p>Pagamento referente aos serviços e itens discriminados neste recibo.</p></div></section>

        <section className="receipt-paper__pix">
          <div><small>Pix</small><h2>Dados do pagamento</h2><p>Use o QR Code ou copie o código Pix para consultar os dados desta cobrança.</p><label><span>{receipt.pixKey}</span><button onClick={copyPix}><Copy size={14} /> Copiar Pix</button></label></div>
          <PixQrCode payload={receipt.pixPayload} />
        </section>

        <footer><span><Check size={15} /> Documento emitido digitalmente pelo Kronos</span><small>A autenticidade pode ser conferida por este link exclusivo.</small></footer>
      </article>
    </main>
  );
}

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function number(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value); }
function dateTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function documentLabel(value: string) { const digits = value.replace(/\D/g, ""); return `${digits.length > 11 ? "CNPJ" : "CPF"}: ${value}`; }
