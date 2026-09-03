import { ReportsView, type ReportAppointment } from "@/components/reports-view";
import { brazilTodayKey } from "@/lib/calendar-date";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function RelatoriosPage() {
  const workspace = await getCurrentWorkspace();
  const today = brazilTodayKey();
  if (!workspace?.organizationId) return <ReportsView appointments={demoAppointments(today)} professionals={["Ana Martins", "Marina Costa"]} today={today} demo />;

  const supabase = await createClient();
  const yearStart = `${today.slice(0, 4)}-01-01T00:00:00-03:00`;
  const [appointmentsResult, professionalsResult] = await Promise.all([
    supabase
      .from("appointments")
      .select("starts_at, ends_at, status, professional:organization_members!appointments_professional_member_id_fkey(display_name), service:services!appointments_service_id_fkey(price_cents)")
      .eq("organization_id", workspace.organizationId)
      .gte("starts_at", yearStart)
      .order("starts_at"),
    supabase
      .from("organization_members")
      .select("display_name")
      .eq("organization_id", workspace.organizationId)
      .eq("active", true)
      .order("display_name"),
  ]);
  const firstError = appointmentsResult.error ?? professionalsResult.error;
  if (firstError) throw new Error(firstError.message);

  const appointments: ReportAppointment[] = (appointmentsResult.data ?? []).flatMap((item) => {
    if (!item.starts_at || !item.ends_at) return [];
    return [{
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      status: item.status,
      professional: relation(item.professional)?.display_name ?? "Sem profissional",
      priceCents: relation(item.service)?.price_cents ?? 0,
    }];
  });

  const professionals = [...new Set((professionalsResult.data ?? []).map((item) => item.display_name))];
  return <ReportsView appointments={appointments} professionals={professionals} today={today} />;
}

function relation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function demoAppointments(today: string): ReportAppointment[] {
  return [0, 1, 2, 4, 6].map((distance, index) => {
    const start = new Date(`${today}T${String(9 + index).padStart(2, "0")}:00:00-03:00`);
    start.setDate(start.getDate() - distance);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { startsAt: start.toISOString(), endsAt: end.toISOString(), status: index === 3 ? "no_show" : index < 2 ? "completed" : "confirmed", professional: index % 2 ? "Marina Costa" : "Ana Martins", priceCents: 18000 };
  });
}
