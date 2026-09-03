import { AppointmentManager, type CalendarEvent } from "@/components/appointment-manager";
import {
  brazilTodayKey,
  dateKeyInBrazil,
  daysBetween,
  isDateKey,
  mondayOfWeek,
  shiftDateKey,
} from "@/lib/calendar-date";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

type AgendaPageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const today = brazilTodayKey();
  const weekStart = mondayOfWeek(isDateKey(params.week) ? params.week : today);
  const weekEnd = shiftDateKey(weekStart, 5);
  const workspace = await getCurrentWorkspace();
  let events = demoEventsFor(weekStart);
  let customers = [{ id: "demo", label: "Cliente demonstrativo" }];
  let services = [{ id: "demo", label: "Serviço demonstrativo" }];

  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [{ data: appointmentData, error }, { data: customerData, error: customerError }, { data: serviceData, error: serviceError }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, ends_at, notes, customers:customers!appointments_customer_id_fkey(name, phone), services:services!appointments_service_id_fkey(name)")
        .eq("organization_id", workspace.organizationId)
        .gte("starts_at", `${weekStart}T00:00:00-03:00`)
        .lt("starts_at", `${weekEnd}T00:00:00-03:00`)
        .neq("status", "cancelled")
        .order("starts_at"),
      supabase.from("customers").select("id, name").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("services").select("id, name").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
    ]);
    const firstError = error ?? customerError ?? serviceError;
    if (firstError) throw new Error(firstError.message);

    customers = (customerData ?? []).map((item) => ({ id: item.id, label: item.name }));
    services = (serviceData ?? []).map((item) => ({ id: item.id, label: item.name }));
    events = (appointmentData ?? []).flatMap((item) => {
      if (!item.starts_at || !item.ends_at) return [];
      const start = new Date(item.starts_at);
      const end = new Date(item.ends_at);
      const day = daysBetween(weekStart, dateKeyInBrazil(start));
      if (day < 0 || day > 4) return [];
      const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(start));
      const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(start);
      const endTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(end);
      const customer = relation(item.customers);
      return [{
        id: item.id,
        day,
        start: Math.max(0, hour - 8),
        span: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000)),
        time,
        endTime,
        startsAt: item.starts_at,
        client: customer?.name ?? "Sem identificação",
        phone: customer?.phone ?? null,
        service: relationName(item.services),
        notes: item.notes ?? "",
      }];
    });
  }

  const instanceKey = `${weekStart}:${events.map((event) => `${event.id}-${event.startsAt}`).join("|")}`;
  return <AppointmentManager key={instanceKey} events={events} customers={customers} services={services} demo={!workspace?.organizationId} weekStart={weekStart} today={today} />;
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
      time: `${String(hour).padStart(2, "0")}:00`,
      endTime: `${String(hour + example.span).padStart(2, "0")}:00`,
      startsAt: `${date}T${String(hour).padStart(2, "0")}:00:00-03:00`,
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
