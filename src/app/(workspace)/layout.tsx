import { AppShell } from "@/components/app-shell";
import { NicheProvider } from "@/components/niche-provider";
import { getAvailableWorkspaces, getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { getVisibleInsightReadState, unreadInsightIds } from "@/lib/queries/insights";
import { WorkspaceRefreshProvider } from "@/components/workspace-refresh-provider";

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
  const [workspaces, platformAdmin, insightSummary] = await Promise.all([
    getAvailableWorkspaces(),
    workspace.demo ? Promise.resolve(null) : getPlatformAdmin(),
    insightSummaryPromise,
  ]);

  return (
    <NicheProvider
      initialNicheId={workspace.nicheId}
      initialCompanyName={workspace.companyName}
      initialTheme={workspace.theme}
    >
      <WorkspaceRefreshProvider>
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
      </WorkspaceRefreshProvider>
    </NicheProvider>
  );
}
