"use client";

import { Download, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui";

const clients = [
  ["João Silva", "(11) 98874-2231", "Manutenção preventiva", "Hoje, 09:00", "Ativo"],
  ["Maria Santos", "(11) 97632-4180", "Instalação", "Hoje, 10:30", "A confirmar"],
  ["Carlos Lima", "(11) 96581-0972", "Reparo técnico", "Hoje, 13:30", "Ativo"],
  ["Ana Oliveira", "(11) 95420-6681", "Orçamento", "Hoje, 15:30", "Novo"],
  ["Fernanda Rocha", "(11) 94388-1120", "Manutenção preventiva", "22 ago.", "Ativo"],
  ["Ricardo Gomes", "(11) 93247-9065", "Instalação", "19 ago.", "Inativo"],
];

export default function ClientesPage() {
  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Clientes" description="Histórico, preferências e próximos atendimentos em um só lugar." action="Novo cliente" />
      <div className="toolbar"><label className="inline-search inline-search--wide"><Search size={16} /><input placeholder="Buscar por nome ou telefone…" /></label><div><button className="chip"><SlidersHorizontal size={15} /> Filtros</button><button className="chip"><Download size={15} /> Exportar</button></div></div>
      <section className="table-panel"><table><thead><tr><th>Cliente</th><th>Contato</th><th>Último serviço</th><th>Próximo/último horário</th><th>Status</th></tr></thead><tbody>{clients.map((client) => <tr key={client[0]}><td><div className="client-cell"><span>{client[0].split(" ").map((part) => part[0]).join("")}</span><strong>{client[0]}</strong></div></td><td>{client[1]}</td><td>{client[2]}</td><td>{client[3]}</td><td><em className={`status status--${client[4].toLowerCase().replace(" ", "-")}`}>{client[4]}</em></td></tr>)}</tbody></table><footer><span>6 de 248 clientes</span><div><button disabled>Anterior</button><button>Próxima</button></div></footer></section>
    </>
  );
}

