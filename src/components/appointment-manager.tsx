"use client";

import { useActionState } from "react";
import { ChevronLeft, ChevronRight, Filter, List, Rows3 } from "lucide-react";
import { createAppointment, type ActionState } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";
import { useNiche } from "@/components/niche-provider";

const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const days = ["SEG 24", "TER 25", "QUA 26", "QUI 27", "SEX 28"];

export type CalendarEvent = { id: string; day: number; start: number; span: number; time: string; client: string; service: string };
export type AppointmentOption = { id: string; label: string };
const initialActionState: ActionState = { status: "idle", message: "" };

export function AppointmentManager({ events, customers, services, demo }: { events: CalendarEvent[]; customers: AppointmentOption[]; services: AppointmentOption[]; demo: boolean }) {
  const { niche } = useNiche();
  const [state, action, pending] = useActionState(createAppointment, initialActionState);
  return (
    <>
      <PageHeader eyebrow="Operação · Agenda" title="Agenda da semana" description={`Horários, equipe e ${niche.resource.toLowerCase()} em uma visão.`} action={null} />
      <details className="create-panel">
        <summary className="button button--primary">Novo agendamento</summary>
        <form action={action} className="inline-create-form inline-create-form--appointment">
          <label className="field"><span>Cliente</span><select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="field"><span>Serviço</span><select name="serviceId" required defaultValue=""><option value="" disabled>Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="field"><span>Início</span><input name="startsAt" type="datetime-local" defaultValue="2026-08-25T10:00" required /></label>
          <label className="field"><span>Observações</span><input name="notes" /></label>
          <button className="button button--primary" disabled={pending || demo || !customers.length || !services.length}>{pending ? "Agendando…" : "Confirmar horário"}</button>
          {state.message ? <span className={`action-feedback action-feedback--${state.status}`}>{state.message}</span> : null}
        </form>
      </details>
      <div className="toolbar"><div className="date-switcher"><button aria-label="Semana anterior"><ChevronLeft size={17} /></button><strong>24–28 de agosto, 2026</strong><button aria-label="Próxima semana"><ChevronRight size={17} /></button></div><div><button className="chip active"><Rows3 size={15} /> Semana</button><button className="chip"><List size={15} /> Lista</button><button className="chip"><Filter size={15} /> Filtrar</button></div></div>
      <section className="calendar-panel">
        <div className="calendar-head"><span>GMT−3</span>{days.map((day, index) => <strong key={day} className={index === 1 ? "today" : ""}>{day}</strong>)}</div>
        <div className="calendar-body">
          <div className="calendar-times">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div>
          {days.map((day, dayIndex) => <div className="calendar-day" key={day}>{slots.map((slot) => <button aria-label={`Criar às ${slot} em ${day}`} key={slot} />)}{events.filter((event) => event.day === dayIndex).map((event) => <article key={event.id} style={{ top: `calc(${event.start} * 54px + 4px)`, height: `calc(${event.span} * 54px - 8px)` }}><span>{event.time}</span><strong>{event.client}</strong><small>{event.service}</small></article>)}</div>)}
          <div className="calendar-now"><span>10:24</span></div>
        </div>
      </section>
    </>
  );
}
