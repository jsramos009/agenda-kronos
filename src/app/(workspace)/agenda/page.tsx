import { AppointmentManager, type CalendarEvent } from "@/components/appointment-manager";
import {
  dateKeyInBrazil,
  daysBetween,
  isDateKey,
  mondayOfWeek,
  shiftDateKey,
} from "@/lib/calendar-date";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { localDateTimeToIso, minutesBetween, normalizeSlotInterval, timeToMinutes } from "@/lib/calendar-grid";

type AgendaPageProps = {
  searchParams: Promise<{ week?: string; date?: string; view?: string; novo?: string }>;
};

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const organizationResult = workspace?.organizationId ? await supabase.from("organizations").select("preferences, timezone").eq("id", workspace.organizationId).single() : null;
  if (organizationResult?.error) throw new Error(organizationResult.error.message);
  const organization = organizationResult?.data;
  const timeZone = organization?.timezone ?? "America/Sao_Paulo";
  const today = dateKeyInBrazil(new Date(), timeZone);
  const anchorDate = isDateKey(params.date) ? params.date : isDateKey(params.week) ? params.week : today;
  const weekStart = mondayOfWeek(anchorDate);
  const rangeStart = shiftDateKey(anchorDate, -45);
  const rangeEnd = shiftDateKey(anchorDate, 46);
  const initialView = params.view === "day" || params.view === "month" || params.view === "list" ? params.view : "week";
  let events = demoEventsFor(weekStart);
  let customers = [{ id: "demo", label: "Cliente demonstrativo" }];
  let services = [{ id: "demo", label: "Serviço demonstrativo" }];
  let allowedWeekdays = [1, 2, 3, 4, 5, 6];
  let workingHours = { start: "08:00", end: "18:00" };
  let slotInterval = normalizeSlotInterval(30);

  if (workspace?.organizationId) {
    const [{ data: appointmentData, error }, { data: customerData, error: customerError }, { data: serviceData, error: serviceError }, { data: availabilityData, error: availabilityError }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, title, description, location, color, kind, status, starts_at, ends_at, notes, customer_id, service_id, customers:customers!appointments_customer_id_fkey(name, phone), services:services!appointments_service_id_fkey(name, duration_minutes, price_cents, color)")
        .eq("organization_id", workspace.organizationId)
        .gte("starts_at", localDateTimeToIso(`${rangeStart}T00:00`, timeZone))
        .lt("starts_at", localDateTimeToIso(`${rangeEnd}T00:00`, timeZone))
        .neq("status", "cancelled")
        .order("starts_at"),
      supabase.from("customers").select("id, name").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("services").select("id, name, duration_minutes, price_cents, color").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("availability_rules").select("weekday, starts_at, ends_at").eq("organization_id", workspace.organizationId).eq("active", true),
    ]);
    const firstError = error ?? customerError ?? serviceError ?? availabilityError;
    if (firstError) throw new Error(firstError.message);

    customers = (customerData ?? []).map((item) => ({ id: item.id, label: item.name }));
    services = (serviceData ?? []).map((item) => ({ id: item.id, label: item.name, durationMinutes: item.duration_minutes, priceCents: item.price_cents, color: item.color }));
    if (availabilityData?.length) {
      allowedWeekdays = [...new Set(availabilityData.map((item) => item.weekday))];
      workingHours = { start: String(availabilityData[0].starts_at).slice(0, 5), end: String(availabilityData[0].ends_at).slice(0, 5) };
    }
    const preferences = organization?.preferences as { agenda?: { slotIntervalMinutes?: number; startsAt?: string; endsAt?: string } } | null;
    slotInterval = normalizeSlotInterval(preferences?.agenda?.slotIntervalMinutes);
    workingHours = { start: preferences?.agenda?.startsAt ?? workingHours.start, end: preferences?.agenda?.endsAt ?? workingHours.end };
    events = (appointmentData ?? []).flatMap((item) => {
      if (!item.starts_at || !item.ends_at) return [];
      const start = new Date(item.starts_at);
      const end = new Date(item.ends_at);
      const dateKey = dateKeyInBrazil(start, timeZone);
      const day = daysBetween(weekStart, dateKey);
      const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(start);
      const endTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(end);
      const customer = relation(item.customers);
      return [{
        id: item.id,
        dateKey,
        day,
        startMinutes: timeToMinutes(time),
        durationMinutes: minutesBetween(start, end), endsAt: item.ends_at, status: item.status,
        time,
        endTime,
        startsAt: item.starts_at,
        title: item.title ?? customer?.name ?? relationName(item.services) ?? "Evento",
        description: item.description ?? "", location: item.location ?? "", color: item.color ?? relation(item.services)?.color ?? workspace.theme.primary,
        customerId: item.customer_id, serviceId: item.service_id,
        client: customer?.name ?? "Sem cliente",
        phone: customer?.phone ?? null,
        service: relationName(item.services) === "Sem identificação" ? "Evento livre" : relationName(item.services),
        notes: item.notes ?? "",
      }];
    });
  }

  const instanceKey = `${weekStart}:${events.map((event) => `${event.id}-${event.startsAt}`).join("|")}`;
  return <AppointmentManager key={instanceKey} events={events} customers={customers} services={services} demo={!workspace?.organizationId} weekStart={weekStart} anchorDate={anchorDate} today={today} initialView={initialView} allowedWeekdays={allowedWeekdays} workingHours={workingHours} slotInterval={slotInterval} timeZone={timeZone} openNewEvent={params.novo === "1"} />;
}

function demoEventsFor(weekStart: string): CalendarEvent[] {
  const examples = [
    { id: "1", day: 0, start: 1, span: 1, client: "Lívia Rocha", service: "Preventiva", phone: "5511999990001", notes: "Limpeza e revisão completa." },
    { id: "2", day: 1, start: 2, span: 2, client: "João Silva", service: "Instalação", phone: "5511999990002", notes: "Instalação na sala comercial." },
    { id: "3", day: 1, start: 6, span: 1, client: "Carlos Lima", service: "Reparo", phone: "5511999990003", notes: "Equipamento com ruído." },
    { id: "4", day: 2, start: 1, span: 1, client: "Bia Ramos", service: "Orçamento", phone: "5511999990004", notes: "Visita técnica inicial." },
    { id: "5", day: 3, start: 4, span: 2, client: "Marina Costa", service: "Instalação", phone: "5511999990005", notes: "Confirmar acesso à cobertura." },
    { id: "6", day: 4, start: 2, span: 1, client: "Pedro Nunes", service: "Preventiva", phone: null, notes: "Cliente prefere contato por e-mail." },
  ];

  return examples.map((example) => {
    const hour = 8 + example.start;
    const date = shiftDateKey(weekStart, example.day);
    return {
      ...example,
      title: example.client, description: "", location: "", color: "#6A2E16", customerId: null, serviceId: null,
      dateKey: date,
      startMinutes: hour * 60,
      durationMinutes: example.span * 60,
      time: `${String(hour).padStart(2, "0")}:00`,
      endTime: `${String(hour + example.span).padStart(2, "0")}:00`,
      startsAt: `${date}T${String(hour).padStart(2, "0")}:00:00-03:00`,
      endsAt: `${date}T${String(hour + example.span).padStart(2, "0")}:00:00-03:00`, status: "scheduled",
    };
  });
}

function relationName(value: { name: string } | { name: string }[] | null) {
  if (!value) return "Sem identificação";
  return Array.isArray(value) ? value[0]?.name ?? "Sem identificação" : value.name;
}

function relation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
