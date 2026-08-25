"use client";

import { FormEvent, useActionState, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, List, Rows3, Search, X } from "lucide-react";
import { createAppointment, type ActionState } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";
import { useNiche } from "@/components/niche-provider";

const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const days = ["SEG 24", "TER 25", "QUA 26", "QUI 27", "SEX 28"];
const weekLabels = ["17–21 de agosto, 2026", "24–28 de agosto, 2026", "31 de agosto–4 de setembro, 2026"];
export type CalendarEvent = { id: string; day: number; start: number; span: number; time: string; client: string; service: string };
export type AppointmentOption = { id: string; label: string };
const initialActionState: ActionState = { status: "idle", message: "" };

export function AppointmentManager({ events, customers, services, demo }: { events: CalendarEvent[]; customers: AppointmentOption[]; services: AppointmentOption[]; demo: boolean }) {
  const { niche } = useNiche();
  const [rows, setRows] = useState(events);
  const [view, setView] = useState<"week" | "list">("week");
  const [week, setWeek] = useState(1);
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("2026-08-25T10:00");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [demoMessage, setDemoMessage] = useState("");
  const [state, action, pending] = useActionState(createAppointment, initialActionState);
  const filtered = useMemo(() => rows.filter((event) => `${event.client} ${event.service}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (serviceFilter === "all" || event.service === serviceFilter)), [query, rows, serviceFilter]);
  const serviceNames = [...new Set(rows.map((event) => event.service))];

  const openSlot = (day: number, slot: string) => { setSelectedSlot(`2026-08-${String(24 + day).padStart(2, "0")}T${slot}`); setFormOpen(true); };
  const createDemoAppointment = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault(); const form = new FormData(event.currentTarget); const customer = customers.find((item) => item.id === form.get("customerId")); const service = services.find((item) => item.id === form.get("serviceId")); const startsAt = String(form.get("startsAt"));
    if (!customer || !service || !startsAt) { setDemoMessage("Selecione cliente, serviço e horário."); return; }
    const day = Math.max(0, Number(startsAt.slice(8, 10)) - 24); const hour = Number(startsAt.slice(11, 13)); const time = startsAt.slice(11, 16);
    if (rows.some((item) => item.day === day && item.start === hour - 8)) { setDemoMessage("Esse horário já está ocupado na demonstração."); return; }
    setRows((current) => [...current, { id: `demo-${crypto.randomUUID()}`, day, start: hour - 8, span: 1, time, client: customer.label, service: service.label }]); setDemoMessage("Agendamento incluído na agenda."); setFormOpen(false);
  };

  return <>
    <PageHeader eyebrow="Operação · Agenda" title="Agenda da semana" description={`Horários, equipe e ${niche.resource.toLowerCase()} em uma visão.`} action={null} />
    <div className="page-actions"><button className="button button--primary" onClick={() => setFormOpen((value) => !value)}>Novo agendamento</button></div>
    {formOpen ? <section className="inline-panel"><button className="icon-button inline-panel__close" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={18} /></button><form action={demo ? undefined : action} onSubmit={createDemoAppointment} className="inline-create-form inline-create-form--appointment"><label className="field"><span>Cliente</span><select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Serviço</span><select name="serviceId" required defaultValue=""><option value="" disabled>Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Início</span><input name="startsAt" type="datetime-local" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} required /></label><label className="field"><span>Observações</span><input name="notes" /></label><button className="button button--primary" disabled={pending || !customers.length || !services.length}>{pending ? "Agendando…" : "Confirmar horário"}</button>{(demoMessage || state.message) ? <span className={`action-feedback action-feedback--${state.status === "error" ? "error" : "success"}`}>{demoMessage || state.message}</span> : null}</form></section> : null}
    <div className="toolbar"><div className="date-switcher"><button aria-label="Semana anterior" disabled={week === 0} onClick={() => setWeek((value) => Math.max(0, value - 1))}><ChevronLeft size={17} /></button><strong>{weekLabels[week]}</strong><button aria-label="Próxima semana" disabled={week === weekLabels.length - 1} onClick={() => setWeek((value) => Math.min(weekLabels.length - 1, value + 1))}><ChevronRight size={17} /></button></div><div><button className={`chip ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}><Rows3 size={15} /> Semana</button><button className={`chip ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}><List size={15} /> Lista</button><label className="chip chip--select"><Filter size={15} /><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="all">Todos os serviços</option>{serviceNames.map((name) => <option key={name}>{name}</option>)}</select></label></div></div>
    <label className="inline-search inline-search--wide agenda-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou serviço…" /></label>
    {view === "week" ? <section className="calendar-panel"><div className="calendar-head"><span>GMT−3</span>{days.map((day, index) => <strong key={day} className={index === 1 ? "today" : ""}>{day}</strong>)}</div><div className="calendar-body"><div className="calendar-times">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div>{days.map((day, dayIndex) => <div className="calendar-day" key={day}>{slots.map((slot) => <button onClick={() => openSlot(dayIndex, slot)} aria-label={`Criar às ${slot} em ${day}`} key={slot} />)}{filtered.filter((event) => event.day === dayIndex).map((event) => <article key={event.id} onClick={() => setSelectedEvent(event)} style={{ top: `calc(${event.start} * 54px + 4px)`, height: `calc(${event.span} * 54px - 8px)` }}><span>{event.time}</span><strong>{event.client}</strong><small>{event.service}</small></article>)}</div>)}</div></section> : <section className="agenda-list">{filtered.sort((a, b) => a.day - b.day || a.start - b.start).map((event) => <button key={event.id} onClick={() => setSelectedEvent(event)}><time>{days[event.day]} · {event.time}</time><div><strong>{event.client}</strong><span>{event.service}</span></div><span>Ver detalhes</span></button>)}</section>}
    {selectedEvent ? <aside className="detail-drawer"><button className="icon-button" onClick={() => setSelectedEvent(null)} aria-label="Fechar detalhes"><X size={18} /></button><p className="eyebrow">Agendamento</p><h2>{selectedEvent.client}</h2><dl><div><dt>Data</dt><dd>{days[selectedEvent.day]}</dd></div><div><dt>Horário</dt><dd>{selectedEvent.time}</dd></div><div><dt>Serviço</dt><dd>{selectedEvent.service}</dd></div><div><dt>Duração</dt><dd>{selectedEvent.span}h</dd></div></dl><button className="button button--secondary" onClick={() => { setSelectedSlot(`2026-08-${String(24 + selectedEvent.day).padStart(2, "0")}T${selectedEvent.time}`); setSelectedEvent(null); setFormOpen(true); }}>Remarcar</button></aside> : null}
  </>;
}
