"use client";

import { useMemo, useState, useTransition } from "react";
import { Filter, MoreHorizontal, Plus, Search } from "lucide-react";
import { moveWorkItem } from "@/app/(workspace)/actions";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export type KanbanCard = { id: string; stageId: string; code: string; client: string; service: string; time: string; assignee: string; aging: string };
export type KanbanStage = { id: string; name: string; color: string; position: number };

export function KanbanBoard({ initialStages, initialCards, demo }: { initialStages: KanbanStage[]; initialCards: KanbanCard[]; demo: boolean }) {
  const { niche } = useNiche();
  const [cards, setCards] = useState(initialCards);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();
  const stages = useMemo(() => [...initialStages].sort((a, b) => a.position - b.position), [initialStages]);

  const onDrop = (stageId: string, cardId: string) => {
    if (demo) return;
    const previous = cards;
    setCards((current) => current.map((card) => card.id === cardId ? { ...card, stageId } : card));
    startTransition(async () => {
      const result = await moveWorkItem(cardId, stageId);
      setFeedback(result.message);
      if (result.status === "error") setCards(previous);
    });
  };

  return (
    <>
      <PageHeader eyebrow="Operação · Fluxo" title="Atendimentos" description={`Acompanhe cada etapa do fluxo de ${niche.label.toLowerCase()} sem perder prazo ou contexto.`} action={null} />
      <div className="toolbar"><label className="inline-search"><Search size={16} /><input placeholder="Buscar no quadro…" /></label><div><button className="chip"><Filter size={15} /> Filtros</button><button className="chip">Minha equipe</button></div></div>
      {feedback ? <div className="board-feedback" aria-live="polite">{pending ? "Atualizando…" : feedback}</div> : null}
      <section className="kanban-board">
        {stages.map((stage, columnIndex) => {
          const stageCards = cards.filter((card) => card.stageId === stage.id);
          return (
            <div className={`board-column tone-${["blue", "cyan", "amber", "green"][columnIndex % 4]}`} key={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(stage.id, event.dataTransfer.getData("text/plain"))}>
              <header><div><i style={{ background: stage.color }} /><strong>{stage.name}</strong><span>{stageCards.length}</span></div><button aria-label={`Opções de ${stage.name}`}><MoreHorizontal size={17} /></button></header>
              {stageCards.map((card) => <article key={card.id} draggable={!demo} onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}><div className="card-top"><small>{card.code}</small><button aria-label="Mais opções"><MoreHorizontal size={15} /></button></div><h3>{card.client}</h3><p>{card.service}</p><div className="card-meta"><span>{card.time}</span><em>{card.aging}</em></div><footer><span>{initials(card.client)}</span><small>{card.assignee}</small></footer></article>)}
              <button className="add-card"><Plus size={15} /> Adicionar atendimento</button>
            </div>
          );
        })}
      </section>
    </>
  );
}

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
