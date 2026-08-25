import { InsightsManager, type InsightRow } from "@/components/insights-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function InsightsPage() {
  const workspace = await getCurrentWorkspace(); const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: InsightRow[] = niche.insights.map((item, index) => ({ id: `demo-${index}`, title: item.title, evidence: item.evidence, impact: item.impact, origin: index === 0 ? "Sua agenda" : `Modelo de ${niche.label}`, effort: index === 2 ? "10 minutos" : "2 minutos", status: "new" }));
  if (workspace?.organizationId) { const supabase = await createClient(); const { data, error } = await supabase.from("recommendations").select("id, title, evidence, impact, origin, status").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false }); if (error) throw new Error(error.message); rows = (data ?? []).map((item) => ({ id: item.id, title: item.title, evidence: textFromJson(item.evidence), impact: textFromJson(item.impact), origin: item.origin, effort: "2 minutos", status: item.status as InsightRow["status"] })); }
  return <InsightsManager initialInsights={rows} demo={workspace?.demo ?? true} />;
}

function textFromJson(value: unknown) { if (typeof value === "string") return value; if (value && typeof value === "object") { const record = value as Record<string, unknown>; return String(record.text ?? record.message ?? Object.values(record)[0] ?? "Baseado nos dados da operação."); } return "Baseado nos dados da operação."; }
