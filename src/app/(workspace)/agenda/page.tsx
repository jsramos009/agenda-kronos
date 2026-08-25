"use client";

import { ChevronLeft, ChevronRight, Filter, List, Rows3 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { useNiche } from "@/components/niche-provider";

const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const days = ["SEG 24", "TER 25", "QUA 26", "QUI 27", "SEX 28"];
const events = [
  { day: 0, start: 1, span: 1, client: "Lívia Rocha", service: "Preventiva" },
  { day: 1, start: 2, span: 2, client: "João Silva", service: "Instalação" },
  { day: 1, start: 6, span: 1, client: "Carlos Lima", service: "Reparo" },
  { day: 2, start: 1, span: 1, client: "Bia Ramos", service: "Orçamento" },
  { day: 3, start: 4, span: 2, client: "Marina Costa", service: "Instalação" },
  { day: 4, start: 2, span: 1, client: "Pedro Nunes", service: "Preventiva" },
];

export default function AgendaPage() {
  const { niche } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Operação · Agenda" title="Agenda da semana" description={`Horários, equipe e ${niche.resource.toLowerCase()} em uma visão.`} />
      <div className="toolbar"><div className="date-switcher"><button aria-label="Semana anterior"><ChevronLeft size={17} /></button><strong>24–28 de agosto, 2026</strong><button aria-label="Próxima semana"><ChevronRight size={17} /></button></div><div><button className="chip active"><Rows3 size={15} /> Semana</button><button className="chip"><List size={15} /> Lista</button><button className="chip"><Filter size={15} /> Filtrar</button></div></div>
      <section className="calendar-panel">
        <div className="calendar-head"><span>GMT−3</span>{days.map((day, index) => <strong key={day} className={index === 1 ? "today" : ""}>{day}</strong>)}</div>
        <div className="calendar-body">
          <div className="calendar-times">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div>
          {days.map((day, dayIndex) => <div className="calendar-day" key={day}>{slots.map((slot) => <button aria-label={`Criar às ${slot} em ${day}`} key={slot} />)}{events.filter((event) => event.day === dayIndex).map((event) => <article key={`${event.client}-${event.start}`} style={{ top: `calc(${event.start} * 54px + 4px)`, height: `calc(${event.span} * 54px - 8px)` }}><span>{slots[event.start]}</span><strong>{event.client}</strong><small>{niche.services[event.start % niche.services.length]?.name ?? event.service}</small></article>)}</div>)}
          <div className="calendar-now"><span>10:24</span></div>
        </div>
      </section>
    </>
  );
}

