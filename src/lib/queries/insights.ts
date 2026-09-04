import type { SupabaseClient } from "@supabase/supabase-js";

export type InsightStatus = "new" | "applied" | "dismissed" | "snoozed";

export type InsightHistoryRecord = {
  id: string;
  title: string;
  evidence: unknown;
  impact: unknown;
  origin: string;
  action_payload: unknown;
  status: InsightStatus;
  snoozed_until: string | null;
  read_at: string | null;
  created_at: string;
};

export type VisibleInsightReadState = Pick<InsightHistoryRecord, "id" | "status" | "snoozed_until" | "read_at">;

export function activeInsightVisibilityFilter(now = new Date()) {
  return `status.eq.new,and(status.eq.snoozed,snoozed_until.lte.${now.toISOString()})`;
}

export function isActiveInsight(insight: { status: InsightStatus; snoozedUntil: string | null }, now = Date.now()) {
  return insight.status === "new" || (insight.status === "snoozed" && Boolean(insight.snoozedUntil) && new Date(insight.snoozedUntil as string).getTime() <= now);
}

async function retryRead<T extends { error: unknown }>(load: () => PromiseLike<T>) {
  let result = await load();
  if (!result.error) return result;
  await new Promise((resolve) => setTimeout(resolve, 120));
  result = await load();
  return result;
}

export function getInsightsHistory(supabase: SupabaseClient, organizationId: string) {
  return retryRead(() => supabase
    .from("recommendations")
    .select("id, title, evidence, impact, origin, action_payload, status, snoozed_until, read_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .returns<InsightHistoryRecord[]>());
}

/** Minimal backend projection used by the badge, with the same active rule as the Novos tab. */
export function getVisibleInsightReadState(supabase: SupabaseClient, organizationId: string, now = new Date()) {
  return retryRead(() => supabase
    .from("recommendations")
    .select("id, status, snoozed_until, read_at")
    .eq("organization_id", organizationId)
    .or(activeInsightVisibilityFilter(now))
    .returns<VisibleInsightReadState[]>());
}

export function unreadInsightCount(insights: VisibleInsightReadState[]) {
  return insights.reduce((total, insight) => total + (insight.read_at ? 0 : 1), 0);
}

export function unreadInsightIds(insights: VisibleInsightReadState[]) {
  return insights.filter((insight) => !insight.read_at).map((insight) => insight.id);
}
