import { InsightsManager, type InsightRow } from "@/components/insights-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function InsightsPage() {
  const workspace = await getCurrentWorkspace(); const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: InsightRow[] = niche.insights.map((item, index) => ({ id: `demo-${index}`, title: item.title, evidence: item.evidence, impact: item.impact, origin: index === 0 ? "Sua agenda" : `Modelo de ${niche.label}`, effort: index === 2 ? "10 minutos" : "2 minutos", status: "new" }));
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const initial = await supabase.from("recommendations").select("id, title, evidence, impact, origin, status").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false });
    let data = initial.data;
    const error = initial.error;
    if (error) throw new Error(error.message);
    if (!data?.length) {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 86_400_000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
      const [{ count: upcoming }, { count: customers }, { count: noShows }] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId).gte("starts_at", now.toISOString()).lt("starts_at", sevenDays.toISOString()).neq("status", "cancelled"),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId).eq("active", true),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId).eq("status", "no_show").gte("starts_at", thirtyDaysAgo.toISOString()),
      ]);
      const operationalEvidence = [
        `${upcoming ?? 0} agendamentos estão previstos para os próximos 7 dias.`,
        `${customers ?? 0} clientes ativos podem receber ações de retorno e confirmação.`,
        `${noShows ?? 0} faltas foram registradas nos últimos 30 dias.`,
      ];
      const { error: seedError } = await supabase.from("recommendations").insert(niche.insights.map((item, index) => ({ organization_id: workspace.organizationId, rule_key: `starter-${niche.id}-${index + 1}`, title: item.title, evidence: { text: operationalEvidence[index] }, impact: { text: item.impact }, origin: index === 0 ? "Agenda dos próximos 7 dias" : `Modelo de ${niche.label}`, action_payload: { kind: "review", niche: niche.id } })));
      if (seedError) throw new Error(seedError.message);
      const refreshed = await supabase.from("recommendations").select("id, title, evidence, impact, origin, status").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false });
      if (refreshed.error) throw new Error(refreshed.error.message);
      data = refreshed.data;
    }
    rows = (data ?? []).map((item) => ({ id: item.id, title: item.title, evidence: textFromJson(item.evidence), impact: textFromJson(item.impact), origin: item.origin, effort: "2 minutos", status: item.status as InsightRow["status"] }));
  }
  return <InsightsManager initialInsights={rows} demo={workspace?.demo ?? true} />;
}

function textFromJson(value: unknown) { if (typeof value === "string") return value; if (value && typeof value === "object") { const record = value as Record<string, unknown>; return String(record.text ?? record.message ?? Object.values(record)[0] ?? "Baseado nos dados da operação."); } return "Baseado nos dados da operação."; }
