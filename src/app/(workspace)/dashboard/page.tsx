import { DashboardView, type DashboardData } from "@/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const demo: DashboardData = {
  today: 23,
  inProgress: 8,
  scheduled: 15,
  completed: 18,
  stageCounts: { Agendado: 8, "Em campo": 3, "Aguardando peça": 2, Concluído: 10 },
  upcoming: [
    { id: "1", time: "10:30", client: "Maria Santos", service: "Instalação" },
    { id: "2", time: "13:30", client: "Carlos Lima", service: "Reparo técnico" },
    { id: "3", time: "15:30", client: "Ana Oliveira", service: "Orçamento" },
  ],
};

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId) return <DashboardView data={demo} />;

  const supabase = await createClient();
  const todayStart = "2026-08-25T00:00:00-03:00";
  const tomorrowStart = "2026-08-26T00:00:00-03:00";
  const baseToday = () => supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId!).gte("starts_at", todayStart).lt("starts_at", tomorrowStart);
  const [todayResult, inProgressResult, scheduledResult, completedResult, upcomingResult, stageResult] = await Promise.all([
    baseToday().neq("status", "cancelled"),
    baseToday().eq("status", "in_progress"),
    baseToday().in("status", ["scheduled", "confirmed"]),
    baseToday().eq("status", "completed"),
    supabase.from("appointments").select("id, starts_at, customers:customers!appointments_customer_id_fkey(name), services:services!appointments_service_id_fkey(name)").eq("organization_id", workspace.organizationId).gte("starts_at", new Date().toISOString()).not("status", "in", "(cancelled,no_show)").order("starts_at").limit(5),
    supabase.from("work_items").select("workflow_stages:workflow_stages!work_items_stage_id_fkey(name)").eq("organization_id", workspace.organizationId),
  ]);
  const firstError = [todayResult, inProgressResult, scheduledResult, completedResult, upcomingResult, stageResult].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);

  const stageCounts: Record<string, number> = {};
  for (const row of stageResult.data ?? []) {
    const stage = firstRelation(row.workflow_stages);
    if (stage?.name) stageCounts[stage.name] = (stageCounts[stage.name] ?? 0) + 1;
  }
  const data: DashboardData = {
    today: todayResult.count ?? 0,
    inProgress: inProgressResult.count ?? 0,
    scheduled: scheduledResult.count ?? 0,
    completed: completedResult.count ?? 0,
    stageCounts,
    upcoming: (upcomingResult.data ?? []).map((row) => ({
      id: row.id,
      time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(row.starts_at)),
      client: relationName(row.customers),
      service: relationName(row.services),
    })),
  };
  return <DashboardView data={data} />;
}

function firstRelation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
function relationName(value: { name: string } | { name: string }[] | null) { return firstRelation(value)?.name ?? "Sem identificação"; }
