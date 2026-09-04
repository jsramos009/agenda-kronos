"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useActionState, useEffect, useMemo, useState, useTransition, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Filter, GripVertical, LayoutGrid, List, MessageCircle, Rows3, Search, X } from "lucide-react";
import { createAppointment, rescheduleAppointment, resizeAppointment, updateAppointmentNotes, type ActionState } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";
import { useNiche } from "@/components/niche-provider";
import { daysBetween, shiftDateKey, weekDayLabels, weekRangeLabel } from "@/lib/calendar-date";

const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
type CalendarView = "day" | "week" | "month" | "list";
export type CalendarEvent = { id: string; dateKey: string; day: number; start: number; span: number; time: string; endTime: string; startsAt: string; client: string; service: string; phone?: string | null; notes?: string | null };
export type AppointmentOption = { id: string; label: string };
const initialActionState: ActionState = { status: "idle", message: "" };

export function AppointmentManager({ events, customers, services, demo, weekStart, anchorDate, today, initialView, allowedWeekdays }: { events: CalendarEvent[]; customers: AppointmentOption[]; services: AppointmentOption[]; demo: boolean; weekStart: string; anchorDate: string; today: string; initialView: "day" | "week" | "month"; allowedWeekdays: number[] }) {
  const router = useRouter();
  const { niche } = useNiche();
  const incomingEventsSignature = events.map((event) => `${event.id}:${event.startsAt}:${event.endTime}:${event.notes ?? ""}`).join("|");
  const [calendarModel, setCalendarModel] = useState(() => ({ signature: incomingEventsSignature, rows: events }));
  const rows = calendarModel.rows;
  const setRows = (next: SetStateAction<CalendarEvent[]>) => setCalendarModel((current) => ({
    ...current,
    rows: typeof next === "function" ? next(current.rows) : next,
  }));
  const [view, setView] = useState<CalendarView>(initialView);
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(`${anchorDate}T10:00`);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [isUpdating, startUpdating] = useTransition();
  const [isChangingPeriod, startPeriodChange] = useTransition();
  const [state, action, pending] = useActionState(createAppointment, initialActionState);
  const days = weekDayLabels(weekStart);
  const selectedEvent = rows.find((event) => event.id === selectedEventId) ?? null;
  const filtered = useMemo(() => rows.filter((event) => `${event.client} ${event.service} ${event.notes ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (serviceFilter === "all" || event.service === serviceFilter)), [query, rows, serviceFilter]);
  const visible = filtered.filter((event) => isVisibleInView(event.dateKey, view, anchorDate, weekStart));
  const serviceNames = [...new Set(rows.map((event) => event.service))];

  if (!pending && !isUpdating && calendarModel.signature !== incomingEventsSignature) {
    setCalendarModel({ signature: incomingEventsSignature, rows: events });
  }

  useEffect(() => {
    const normalizedView = view === "list" ? "week" : view;
    const distance = view === "week" || view === "list" ? 7 : 1;
    const previous = view === "month" ? shiftMonth(anchorDate, -1) : shiftDateKey(anchorDate, -distance);
    const next = view === "month" ? shiftMonth(anchorDate, 1) : shiftDateKey(anchorDate, distance);
    router.prefetch(`/agenda?view=${normalizedView}&date=${previous}`);
    router.prefetch(`/agenda?view=${normalizedView}&date=${next}`);
  }, [anchorDate, router, view]);

  const openSlot = (dateKey: string, slot = "10:00") => { if (!allowedWeekdays.includes(new Date(`${dateKey}T00:00:00Z`).getUTCDay())) { setDemoMessage("Este dia está marcado como sem atendimento. Altere a disponibilidade em Configurações."); return; } setSelectedSlot(`${dateKey}T${slot}`); setFormOpen(true); };
  const openEvent = (event: CalendarEvent) => { setSelectedEventId(event.id); setNotesDraft(event.notes ?? ""); };
  const changeView = (next: CalendarView) => { setView(next); if (next !== "list") router.replace(`/agenda?view=${next}&date=${anchorDate}`, { scroll: false }); };
  const navigate = (distance: number) => {
    const next = view === "month" ? shiftMonth(anchorDate, distance) : shiftDateKey(anchorDate, distance * (view === "week" || view === "list" ? 7 : 1));
    startPeriodChange(() => router.push(`/agenda?view=${view === "list" ? "week" : view}&date=${next}`, { scroll: false }));
  };

  const createDemoAppointment = (event: FormEvent<HTMLFormElement>) => {
    if (!demo) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer = customers.find((item) => item.id === form.get("customerId"));
    const service = services.find((item) => item.id === form.get("serviceId"));
    const startsAt = String(form.get("startsAt"));
    if (!customer || !service || !startsAt) { setDemoMessage("Selecione cliente, serviço e horário."); return; }
    const dateKey = startsAt.slice(0, 10);
    const hour = Number(startsAt.slice(11, 13));
    const time = startsAt.slice(11, 16);
    if (rows.some((item) => item.dateKey === dateKey && item.start === hour - 8)) { setDemoMessage("Esse horário já está ocupado na demonstração."); return; }
    setRows((current) => [...current, { id: `demo-${crypto.randomUUID()}`, dateKey, day: daysBetween(weekStart, dateKey), start: hour - 8, span: 1, time, endTime: `${String(hour + 1).padStart(2, "0")}:00`, startsAt: `${startsAt}:00-03:00`, client: customer.label, service: service.label, notes: String(form.get("notes") ?? ""), phone: null }]);
    setDemoMessage("Agendamento incluído na agenda.");
    setFormOpen(false);
  };

  const moveEvent = (appointmentId: string, dateKey: string, slot: string) => {
    const previous = rows;
    const current = rows.find((item) => item.id === appointmentId);
    if (!current) return;
    const startIndex = slots.indexOf(slot);
    const startsAt = `${dateKey}T${slot}:00-03:00`;
    const endHour = Number(slot.slice(0, 2)) + current.span;
    setRows((items) => items.map((item) => item.id === appointmentId ? { ...item, dateKey, day: daysBetween(weekStart, dateKey), start: startIndex, time: slot, endTime: `${String(endHour).padStart(2, "0")}:00`, startsAt } : item));
    setDemoMessage(demo ? "Horário atualizado nesta demonstração." : "Atualizando horário…");
    if (demo) return;
    startUpdating(async () => { const result = await rescheduleAppointment(appointmentId, startsAt); setDemoMessage(result.message); if (result.status === "error") setRows(previous); });
  };

  const beginResize = (pointerEvent: ReactPointerEvent<HTMLButtonElement>, event: CalendarEvent) => {
    pointerEvent.preventDefault(); pointerEvent.stopPropagation();
    const originY = pointerEvent.clientY; const previous = rows;
    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener("pointerup", finish);
      const extraSlots = Math.round((upEvent.clientY - originY) / 68);
      const nextSpan = Math.max(1, Math.min(slots.length - event.start, event.span + extraSlots));
      if (nextSpan === event.span) return;
      const endHour = Number(event.time.slice(0, 2)) + nextSpan;
      setRows((items) => items.map((item) => item.id === event.id ? { ...item, span: nextSpan, endTime: `${String(endHour).padStart(2, "0")}:00` } : item));
      if (demo) { setDemoMessage("Duração atualizada nesta demonstração."); return; }
      startUpdating(async () => { const result = await resizeAppointment(event.id, nextSpan * 60); setDemoMessage(result.message); if (result.status === "error") setRows(previous); });
    };
    window.addEventListener("pointerup", finish, { once: true });
  };

  const saveNotes = () => {
    if (!selectedEvent) return;
    if (demo) { setRows((items) => items.map((item) => item.id === selectedEvent.id ? { ...item, notes: notesDraft } : item)); setDemoMessage("Detalhes atualizados nesta demonstração."); return; }
    startUpdating(async () => { const result = await updateAppointmentNotes(selectedEvent.id, notesDraft); setDemoMessage(result.message); if (result.status === "success") setRows((items) => items.map((item) => item.id === selectedEvent.id ? { ...item, notes: notesDraft } : item)); });
  };

  const renderEvent = (event: CalendarEvent) => <article key={event.id} className="calendar-event" draggable onDragStart={(dragEvent) => { dragEvent.dataTransfer.setData("text/appointment-id", event.id); dragEvent.dataTransfer.effectAllowed = "move"; }} onClick={() => openEvent(event)} style={{ top: `calc(${event.start} * 68px + 4px)`, height: `calc(${event.span} * 68px - 8px)` }}><div className="calendar-event__time"><GripVertical size={13} /><strong>{event.time}</strong><span>– {event.endTime}</span></div><b>{event.client}</b><small>{event.service}</small><button type="button" className="calendar-event__details" onClick={(clickEvent) => { clickEvent.stopPropagation(); openEvent(event); }}>Detalhes</button><button type="button" className="calendar-event__resize" aria-label={`Alterar duração de ${event.client}`} onPointerDown={(resizeEvent) => beginResize(resizeEvent, event)} /></article>;
  const whatsappUrl = selectedEvent?.phone ? buildWhatsappUrl(selectedEvent) : null;

  return <>
    <PageHeader eyebrow="Operação · Agenda" title="Agenda" description={`Visualize e organize os horários de ${niche.resource.toLowerCase()} por dia, semana ou mês.`} action={null} />
    <div className="calendar-commandbar"><div className="date-switcher"><button aria-label="Período anterior" disabled={isChangingPeriod} onClick={() => navigate(-1)}><ChevronLeft size={17} /></button><strong>{isChangingPeriod ? "Atualizando…" : periodLabel(view, anchorDate, weekStart)}</strong><button aria-label="Próximo período" disabled={isChangingPeriod} onClick={() => navigate(1)}><ChevronRight size={17} /></button><button className="calendar-today" onClick={() => startPeriodChange(() => router.push(`/agenda?view=${view === "list" ? "week" : view}&date=${today}`))}>Hoje</button></div><div className="calendar-view-switch"><button className={view === "day" ? "active" : ""} onClick={() => changeView("day")}><CalendarDays size={15} /> Dia</button><button className={view === "week" ? "active" : ""} onClick={() => changeView("week")}><Rows3 size={15} /> Semana</button><button className={view === "month" ? "active" : ""} onClick={() => changeView("month")}><LayoutGrid size={15} /> Mês</button><button className={view === "list" ? "active" : ""} onClick={() => changeView("list")}><List size={15} /> Lista</button></div><button className="button button--primary" onClick={() => openSlot(anchorDate)}>Novo evento</button></div>
    <div className="agenda-search-row"><label className="inline-search inline-search--wide agenda-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, serviço ou observação…" /></label><label className="chip chip--select"><Filter size={15} /><select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="all">Todos os serviços</option>{serviceNames.map((name) => <option key={name}>{name}</option>)}</select></label>{demoMessage || state.message ? <span className="calendar-feedback" aria-live="polite">{isUpdating ? "Atualizando…" : demoMessage || state.message}</span> : null}</div>
    {view === "week" ? <WeekCalendar days={days} weekStart={weekStart} today={today} events={visible} openSlot={openSlot} moveEvent={moveEvent} renderEvent={renderEvent} /> : null}
    {view === "day" ? <DayCalendar dateKey={anchorDate} events={visible} openSlot={openSlot} moveEvent={moveEvent} renderEvent={renderEvent} /> : null}
    {view === "month" ? <MonthCalendar anchorDate={anchorDate} today={today} events={visible} openSlot={openSlot} openEvent={openEvent} /> : null}
    {view === "list" ? <section className="agenda-list">{visible.length ? visible.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)).map((event) => <button key={event.id} onClick={() => openEvent(event)}><time>{dateLabel(event.dateKey)} · {event.time}–{event.endTime}</time><div><strong>{event.client}</strong><span>{event.service}</span></div><span>Ver detalhes</span></button>) : <p className="empty-state">Nenhum agendamento neste período.</p>}</section> : null}
    {formOpen ? <><button className="calendar-popover-backdrop" onClick={() => setFormOpen(false)} aria-label="Fechar novo evento" /><section className="calendar-quick-create" role="dialog" aria-modal="true" aria-label="Criar novo evento"><header><div><CalendarDays size={19} /><strong>Novo evento</strong></div><button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={18} /></button></header><form action={demo ? undefined : action} onSubmit={createDemoAppointment}><label className="field"><span>Cliente</span><select name="customerId" required defaultValue=""><option value="" disabled>Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Serviço</span><select name="serviceId" required defaultValue=""><option value="" disabled>Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="field"><span>Data e hora</span><input name="startsAt" type="datetime-local" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} required /></label><label className="field"><span><Bell size={14} /> Lembrete</span><select name="reminderMinutes" defaultValue="60"><option value="0">Sem lembrete</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option><option value="1440">1 dia antes</option></select></label><label className="field field--wide"><span>Observações</span><textarea name="notes" rows={3} placeholder="Endereço, instruções ou detalhes do atendimento" /></label><footer><button type="button" className="button button--ghost" onClick={() => setFormOpen(false)}>Cancelar</button><button className="button button--primary" disabled={pending || !customers.length || !services.length}>{pending ? "Agendando…" : "Salvar evento"}</button></footer></form></section></> : null}
    {selectedEvent ? <><button className="drawer-backdrop" onClick={() => setSelectedEventId(null)} aria-label="Fechar detalhes" /><aside className="detail-drawer appointment-drawer"><button className="icon-button" onClick={() => setSelectedEventId(null)} aria-label="Fechar detalhes"><X size={18} /></button><p className="eyebrow">Agendamento</p><h2>{selectedEvent.client}</h2><p>{selectedEvent.service}</p><dl><div><dt>Data</dt><dd>{dateLabel(selectedEvent.dateKey)}</dd></div><div><dt>Horário</dt><dd>{selectedEvent.time}–{selectedEvent.endTime}</dd></div><div><dt>Duração</dt><dd>{selectedEvent.span}h</dd></div><div><dt>Contato</dt><dd>{selectedEvent.phone || "Não informado"}</dd></div></dl><label className="field"><span>Observações</span><textarea rows={5} value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} /></label><button className="button button--secondary drawer-save" onClick={saveNotes} disabled={isUpdating}>{isUpdating ? "Salvando…" : "Salvar detalhes"}</button><div className="drawer-actions"><button className="button button--secondary" onClick={() => { setSelectedSlot(`${selectedEvent.dateKey}T${selectedEvent.time}`); setSelectedEventId(null); setFormOpen(true); }}>Remarcar</button>{whatsappUrl ? <a className="button button--whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a> : <button className="button button--whatsapp" disabled><MessageCircle size={17} /> WhatsApp</button>}</div><small className="drawer-hint">Arraste o evento para outro horário ou use a borda inferior para alterar a duração.</small></aside></> : null}
  </>;
}

function WeekCalendar({ days, weekStart, today, events, openSlot, moveEvent, renderEvent }: { days: string[]; weekStart: string; today: string; events: CalendarEvent[]; openSlot: (date: string, slot?: string) => void; moveEvent: (id: string, date: string, slot: string) => void; renderEvent: (event: CalendarEvent) => React.ReactNode }) { return <div className="calendar-scroll"><section className="calendar-panel"><div className="calendar-head"><span>GMT−3</span>{days.map((day, index) => <strong key={day} className={shiftDateKey(weekStart, index) === today ? "today" : ""}>{day}</strong>)}</div><div className="calendar-body"><div className="calendar-times">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div>{days.map((day, dayIndex) => { const date = shiftDateKey(weekStart, dayIndex); return <div className="calendar-day" key={day}>{slots.map((slot) => <button onClick={() => openSlot(date, slot)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveEvent(event.dataTransfer.getData("text/appointment-id"), date, slot)} aria-label={`Criar ou mover para ${slot} em ${day}`} key={slot} />)}{events.filter((event) => event.dateKey === date).map(renderEvent)}</div>; })}</div></section></div>; }
function DayCalendar({ dateKey, events, openSlot, moveEvent, renderEvent }: { dateKey: string; events: CalendarEvent[]; openSlot: (date: string, slot?: string) => void; moveEvent: (id: string, date: string, slot: string) => void; renderEvent: (event: CalendarEvent) => React.ReactNode }) { return <div className="calendar-scroll"><section className="calendar-panel calendar-panel--day"><div className="calendar-head"><span>GMT−3</span><strong>{dateLabel(dateKey)}</strong></div><div className="calendar-body"><div className="calendar-times">{slots.map((slot) => <span key={slot}>{slot}</span>)}</div><div className="calendar-day">{slots.map((slot) => <button onClick={() => openSlot(dateKey, slot)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveEvent(event.dataTransfer.getData("text/appointment-id"), dateKey, slot)} aria-label={`Criar evento às ${slot}`} key={slot} />)}{events.map(renderEvent)}</div></div></section></div>; }
function MonthCalendar({ anchorDate, today, events, openSlot, openEvent }: { anchorDate: string; today: string; events: CalendarEvent[]; openSlot: (date: string, slot?: string) => void; openEvent: (event: CalendarEvent) => void }) { const monthStart = `${anchorDate.slice(0, 7)}-01`; const offset = new Date(`${monthStart}T00:00:00Z`).getUTCDay(); const gridStart = shiftDateKey(monthStart, -offset); const cells = Array.from({ length: 42 }, (_, index) => shiftDateKey(gridStart, index)); return <section className="month-calendar"><header>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</header><div>{cells.map((date) => <article key={date} className={`${date.slice(0, 7) !== anchorDate.slice(0, 7) ? "outside" : ""} ${date === today ? "today" : ""}`} onDoubleClick={() => openSlot(date)}><button className="month-calendar__date" onClick={() => openSlot(date)}>{Number(date.slice(8, 10))}</button>{events.filter((event) => event.dateKey === date).slice(0, 3).map((event) => <button key={event.id} className="month-calendar__event" onClick={() => openEvent(event)}><strong>{event.time}</strong><span>{event.client}</span></button>)}{events.filter((event) => event.dateKey === date).length > 3 ? <small>+{events.filter((event) => event.dateKey === date).length - 3} eventos</small> : null}</article>)}</div></section>; }
function isVisibleInView(date: string, view: CalendarView, anchor: string, weekStart: string) { if (view === "day") return date === anchor; if (view === "month") return date.slice(0, 7) === anchor.slice(0, 7); return date >= weekStart && date <= shiftDateKey(weekStart, 6); }
function periodLabel(view: CalendarView, anchor: string, weekStart: string) { if (view === "day") return dateLabel(anchor); if (view === "month") return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T00:00:00Z`)); return weekRangeLabel(weekStart); }
function shiftMonth(dateKey: string, distance: number) { const date = new Date(`${dateKey}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + distance, 1); return date.toISOString().slice(0, 10); }
function dateLabel(dateKey: string) { return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateKey}T00:00:00Z`)).replace(/\./g, ""); }
function buildWhatsappUrl(event: CalendarEvent) { const phone = (event.phone ?? "").replace(/\D/g, ""); const message = `Olá, ${event.client}! Seu agendamento de ${event.service} está marcado para ${dateLabel(event.dateKey)}, das ${event.time} às ${event.endTime}. Se precisar ajustar o horário, responda por aqui.`; return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`; }
