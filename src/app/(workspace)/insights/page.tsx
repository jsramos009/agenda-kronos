import { InsightsManager, type InsightRow } from "@/components/insights-manager";
import { niches } from "@/lib/niches";
import { getInsightsHistory } from "@/lib/queries/insights";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function InsightsPage() {
  const workspace = await getCurrentWorkspace();
  const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: InsightRow[] = workspace?.organizationId ? [] : niche.insights.map((item, index) => ({
    id: `demo-${index}`,
    title: item.title,
    evidence: item.evidence,
    impact: item.impact,
    origin: index === 0 ? "Sua agenda" : `Modelo de ${niche.label}`,
    effort: index === 2 ? "10 minutos" : "2 minutos",
    status: "new",
    readAt: null,
    snoozedUntil: null,
  }));
  let loadError = "";

  if (workspace?.organizationId) {
    const supabase = await createClient();
    const { data, error } = await getInsightsHistory(supabase, workspace.organizationId);
    if (error) loadError = "Não foi possível atualizar os insights deste espaço.";
    else {
      rows = (data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        evidence: textFromJson(item.evidence),
        impact: textFromJson(item.impact),
        origin: item.origin,
        effort: effortFromJson(item.action_payload),
        status: item.status,
        readAt: item.read_at,
        snoozedUntil: item.snoozed_until,
      }));
    }
  }

  const canManageInsights = workspace?.demo === true || workspace?.roleKey === "owner" || workspace?.roleKey === "admin";
  return <InsightsManager initialInsights={rows} demo={workspace?.demo ?? true} loadError={loadError} canManageInsights={canManageInsights} />;
}

function textFromJson(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.text ?? record.message ?? Object.values(record)[0] ?? "Baseado nos dados da operação.");
  }
  return "Baseado nos dados da operação.";
}

function effortFromJson(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as Record<string, unknown>;
  const label = payload.effort ?? payload.estimated_time;
  if (typeof label === "string" && label.trim()) return label.trim();
  const minutes = payload.estimated_minutes;
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0 ? `${minutes} minutos` : undefined;
}
