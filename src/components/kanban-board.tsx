"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Filter, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { moveWorkItem } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export type KanbanCard = { id: string; stageId: string; code: string; client: string; service: string; time: string; assignee: string; aging: string };
export type KanbanStage = { id: string; name: string; color: string; position: number };

export function KanbanBoard({ initialStages, initialCards, demo }: { initialStages: KanbanStage[]; initialCards: KanbanCard[]; demo: boolean }) {
  const { niche } = useNiche();
  const [cards, setCards] = useState(initialCards);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [selected, setSelected] = useState<KanbanCard | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const stages = useMemo(() => [...initialStages].sort((a, b) => a.position - b.position), [initialStages]);
  const visibleCards = useMemo(() => cards.filter((card) => `${card.client} ${card.service} ${card.code}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (!onlyMine || card.assignee === "Ana Martins")), [cards, onlyMine, query]);

  const onDrop = (stageId: string, cardId: string) => {
    const previous = cards;
    setCards((current) => current.map((card) => card.id === cardId ? { ...card, stageId, aging: "Movido agora" } : card));
    if (demo) { setFeedback("Atendimento movido na demonstração."); return; }
    startTransition(async () => { const result = await moveWorkItem(cardId, stageId); setFeedback(result.message); if (result.status === "error") setCards(previous); });
  };

  return <>
    <PageHeader eyebrow="Operação · Fluxo" title="Atendimentos" description={`Acompanhe cada etapa do fluxo de ${niche.label.toLowerCase()} sem perder prazo ou contexto.`} action={null} />
    <div className="toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no quadro…" /></label><div><button className="chip"><Filter size={15} /> {visibleCards.length} visíveis</button><button className={`chip ${onlyMine ? "active" : ""}`} onClick={() => setOnlyMine((value) => !value)}>Meus atendimentos</button></div></div>
    {feedback ? <div className="board-feedback" aria-live="polite">{pending ? "Atualizando…" : feedback}</div> : null}
    <section className="kanban-board">{stages.map((stage, columnIndex) => { const stageCards = visibleCards.filter((card) => card.stageId === stage.id); return <div className={`board-column tone-${["blue", "cyan", "amber", "green"][columnIndex % 4]}`} key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(stage.id, event.dataTransfer.getData("text/plain"))}><header><div><i style={{ background: stage.color }} /><strong>{stage.name}</strong><span>{stageCards.length}</span></div><button aria-label={`Informações de ${stage.name}`} title="A coluna mantém o estado da agenda"><MoreHorizontal size={17} /></button></header>{stageCards.map((card) => <article key={card.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)} onClick={() => setSelected(card)}><div className="card-top"><small>{card.code}</small><button aria-label="Abrir detalhes"><MoreHorizontal size={15} /></button></div><h3>{card.client}</h3><p>{card.service}</p><div className="card-meta"><span>{card.time}</span><em>{card.aging}</em></div><footer><span>{initials(card.client)}</span><small>{card.assignee}</small></footer></article>)}<Link className="add-card" href="/agenda"><Plus size={15} /> Adicionar atendimento</Link></div>; })}</section>
    {selected ? <aside className="detail-drawer"><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={18} /></button><p className="eyebrow">{selected.code}</p><h2>{selected.client}</h2><p>{selected.service}</p><dl><div><dt>Horário</dt><dd>{selected.time}</dd></div><div><dt>Responsável</dt><dd>{selected.assignee}</dd></div><div><dt>Na etapa</dt><dd>{selected.aging}</dd></div><div><dt>Etapa atual</dt><dd>{stages.find((stage) => stage.id === selected.stageId)?.name}</dd></div></dl><Link className="button button--primary" href="/agenda">Abrir na agenda</Link></aside> : null}
  </>;
}

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
