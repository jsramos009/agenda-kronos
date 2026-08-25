import { AppointmentManager, type CalendarEvent } from "@/components/appointment-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const demoEvents: CalendarEvent[] = [
  { id: "1", day: 0, start: 1, span: 1, time: "09:00", client: "Lívia Rocha", service: "Preventiva" },
  { id: "2", day: 1, start: 2, span: 2, time: "10:00", client: "João Silva", service: "Instalação" },
  { id: "3", day: 1, start: 6, span: 1, time: "14:00", client: "Carlos Lima", service: "Reparo" },
  { id: "4", day: 2, start: 1, span: 1, time: "09:00", client: "Bia Ramos", service: "Orçamento" },
  { id: "5", day: 3, start: 4, span: 2, time: "12:00", client: "Marina Costa", service: "Instalação" },
  { id: "6", day: 4, start: 2, span: 1, time: "10:00", client: "Pedro Nunes", service: "Preventiva" },
];

export default async function AgendaPage() {
  const workspace = await getCurrentWorkspace();
  let events = demoEvents;
  let customers = [{ id: "demo", label: "Cliente demonstrativo" }];
  let services = [{ id: "demo", label: "Serviço demonstrativo" }];
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [{ data: appointmentData, error }, { data: customerData }, { data: serviceData }] = await Promise.all([
      supabase.from("appointments").select("id, starts_at, ends_at, customers(name), services(name)").eq("organization_id", workspace.organizationId).gte("starts_at", "2026-08-24T00:00:00-03:00").lt("starts_at", "2026-08-29T00:00:00-03:00").neq("status", "cancelled").order("starts_at"),
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
      return { id: item.id, day, start: Math.max(0, hour - 8), span: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000)), time, client: relationName(item.customers), service: relationName(item.services) };
    });
  }
  return <AppointmentManager events={events} customers={customers} services={services} demo={!workspace?.organizationId} />;
}

function relationName(value: { name: string } | { name: string }[] | null) {
  if (!value) return "Sem identificação";
  return Array.isArray(value) ? value[0]?.name ?? "Sem identificação" : value.name;
}
