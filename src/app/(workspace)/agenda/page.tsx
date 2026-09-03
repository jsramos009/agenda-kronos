import { AppointmentManager, type CalendarEvent } from "@/components/appointment-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const demoEvents: CalendarEvent[] = [
  { id: "1", day: 0, start: 1, span: 1, time: "09:00", endTime: "10:00", startsAt: "2026-08-24T09:00:00-03:00", client: "Lívia Rocha", service: "Preventiva", phone: "5511999990001", notes: "Limpeza e revisão completa." },
  { id: "2", day: 1, start: 2, span: 2, time: "10:00", endTime: "12:00", startsAt: "2026-08-25T10:00:00-03:00", client: "João Silva", service: "Instalação", phone: "5511999990002", notes: "Instalação na sala comercial." },
  { id: "3", day: 1, start: 6, span: 1, time: "14:00", endTime: "15:00", startsAt: "2026-08-25T14:00:00-03:00", client: "Carlos Lima", service: "Reparo", phone: "5511999990003", notes: "Equipamento com ruído." },
  { id: "4", day: 2, start: 1, span: 1, time: "09:00", endTime: "10:00", startsAt: "2026-08-26T09:00:00-03:00", client: "Bia Ramos", service: "Orçamento", phone: "5511999990004", notes: "Visita técnica inicial." },
  { id: "5", day: 3, start: 4, span: 2, time: "12:00", endTime: "14:00", startsAt: "2026-08-27T12:00:00-03:00", client: "Marina Costa", service: "Instalação", phone: "5511999990005", notes: "Confirmar acesso à cobertura." },
  { id: "6", day: 4, start: 2, span: 1, time: "10:00", endTime: "11:00", startsAt: "2026-08-28T10:00:00-03:00", client: "Pedro Nunes", service: "Preventiva", phone: null, notes: "Cliente prefere contato por e-mail." },
];

export default async function AgendaPage() {
  const workspace = await getCurrentWorkspace();
  let events = demoEvents;
  let customers = [{ id: "demo", label: "Cliente demonstrativo" }];
  let services = [{ id: "demo", label: "Serviço demonstrativo" }];
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [{ data: appointmentData, error }, { data: customerData }, { data: serviceData }] = await Promise.all([
      supabase.from("appointments").select("id, starts_at, ends_at, notes, customers:customers!appointments_customer_id_fkey(name, phone), services:services!appointments_service_id_fkey(name)").eq("organization_id", workspace.organizationId).gte("starts_at", "2026-08-24T00:00:00-03:00").lt("starts_at", "2026-08-29T00:00:00-03:00").neq("status", "cancelled").order("starts_at"),
      supabase.from("customers").select("id, name").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("services").select("id, name").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
    ]);
    if (error) throw new Error(error.message);
    customers = (customerData ?? []).map((item) => ({ id: item.id, label: item.name }));
    services = (serviceData ?? []).map((item) => ({ id: item.id, label: item.name }));
    events = (appointmentData ?? []).map((item) => {
      const start = new Date(item.starts_at);
      const end = new Date(item.ends_at);
      const day = (start.getDay() + 6) % 7;
      const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(start));
      const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(start);
      const endTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(end);
      const customer = relation(item.customers);
      return { id: item.id, day, start: Math.max(0, hour - 8), span: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000)), time, endTime, startsAt: item.starts_at, client: customer?.name ?? "Sem identificação", phone: customer?.phone ?? null, service: relationName(item.services), notes: item.notes ?? "" };
    });
  }
  return <AppointmentManager events={events} customers={customers} services={services} demo={!workspace?.organizationId} />;
}

function relationName(value: { name: string } | { name: string }[] | null) {
  if (!value) return "Sem identificação";
  return Array.isArray(value) ? value[0]?.name ?? "Sem identificação" : value.name;
}

function relation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
