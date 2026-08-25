"use client";

import { Filter, MoreHorizontal, Plus, Search } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

const clients = ["João Silva", "Maria Santos", "Pedro Costa", "Ana Oliveira", "Carlos Lima", "Fernanda Rocha", "Juliana Alves", "Ricardo Gomes"];

export default function AtendimentosPage() {
  const { niche } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Operação · Fluxo" title="Atendimentos" description={`Acompanhe cada etapa do fluxo de ${niche.label.toLowerCase()} sem perder prazo ou contexto.`} action="Novo atendimento" />
      <div className="toolbar"><label className="inline-search"><Search size={16} /><input placeholder="Buscar no quadro…" /></label><div><button className="chip"><Filter size={15} /> Filtros</button><button className="chip">Minha equipe</button></div></div>
      <section className="kanban-board">
        {niche.workflow.map((stage, columnIndex) => (
          <div className={`board-column tone-${stage.tone}`} key={stage.name}>
            <header><div><i /><strong>{stage.name}</strong><span>{columnIndex + 2}</span></div><button aria-label={`Opções de ${stage.name}`}><MoreHorizontal size={17} /></button></header>
            {clients.slice(columnIndex * 2, columnIndex * 2 + (columnIndex === 0 ? 3 : 2)).map((client, cardIndex) => <article key={client}><div className="card-top"><small>ATD-10{columnIndex}{cardIndex}</small><button aria-label="Mais opções"><MoreHorizontal size={15} /></button></div><h3>{client}</h3><p>{niche.services[(columnIndex + cardIndex) % niche.services.length].name}</p><div className="card-meta"><span>{cardIndex ? "11:20" : "10:15"}</span><em>{columnIndex === 2 ? "Peça pendente" : "No prazo"}</em></div><footer><span>{client.split(" ").map((part) => part[0]).join("")}</span><small>Ana Martins</small></footer></article>)}
            <button className="add-card"><Plus size={15} /> Adicionar atendimento</button>
          </div>
        ))}
      </section>
    </>
  );
}

