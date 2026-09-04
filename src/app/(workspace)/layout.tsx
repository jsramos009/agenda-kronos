import { AppShell } from "@/components/app-shell";
import { NicheProvider } from "@/components/niche-provider";
import { getAvailableWorkspaces, getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { getVisibleInsightReadState, unreadInsightIds } from "@/lib/queries/insights";
import { WorkspaceRealtimeProvider } from "@/components/workspace-realtime-provider";
import { mapNotification, type InAppNotificationRow } from "@/lib/notifications";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/onboarding");
  if (!workspace.demo && workspace.subscriptionStatus !== "active") redirect("/assinatura");
  const organizationId = workspace.organizationId;
  const insightSummaryPromise = !workspace.demo && organizationId
    ? (async () => {
        const supabase = await createClient();
        const { data, error } = await getVisibleInsightReadState(supabase, organizationId);
        return { ids: error ? [] : unreadInsightIds(data ?? []), error: Boolean(error) };
      })()
    : Promise.resolve({ ids: [] as string[], error: false });
  const notificationSummaryPromise = !workspace.demo && organizationId
    ? readNotificationSummary(organizationId)
    : Promise.resolve({ userId: null, notifications: [], loadError: "" });
  const [workspaces, platformAdmin, insightSummary, notificationSummary] = await Promise.all([
    getAvailableWorkspaces(),
    workspace.demo ? Promise.resolve(null) : getPlatformAdmin(),
    insightSummaryPromise,
    notificationSummaryPromise,
  ]);

  return (
    <NicheProvider
      initialNicheId={workspace.nicheId}
      initialCompanyName={workspace.companyName}
      initialTheme={workspace.theme}
    >
      <WorkspaceRealtimeProvider
        key={`${organizationId ?? "demo"}:${notificationSummary.userId ?? "guest"}`}
        organizationId={organizationId}
        userId={notificationSummary.userId}
        initialNotifications={notificationSummary.notifications}
        initialLoadError={notificationSummary.loadError}
        enabled={!workspace.demo}
      >
        <AppShell
          fullName={workspace.fullName}
          role={workspace.role}
          roleKey={workspace.roleKey}
          demo={workspace.demo}
          activeWorkspaceId={workspace.organizationId}
          workspaces={workspaces}
          platformAdmin={Boolean(platformAdmin)}
          unreadInsightIds={insightSummary.ids}
          insightCountError={insightSummary.error}
        >{children}</AppShell>
      </WorkspaceRealtimeProvider>
    </NicheProvider>
  );
}

async function readNotificationSummary(organizationId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!userId) return { userId: null, notifications: [], loadError: "Sua sessão expirou. Entre novamente." };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from("in_app_notifications")
      .select("id, organization_id, user_id, actor_id, type, title, message, entity_type, entity_id, metadata, read_at, created_at")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) return { userId, notifications: ((data ?? []) as InAppNotificationRow[]).map(mapNotification), loadError: "" };
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
  }
  return { userId, notifications: [], loadError: "Não foi possível carregar as notificações." };
}
