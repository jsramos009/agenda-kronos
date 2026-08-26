import { AppShell } from "@/components/app-shell";
import { NicheProvider } from "@/components/niche-provider";
import { getAvailableWorkspaces, getCurrentWorkspace } from "@/lib/workspace";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/onboarding");
  const workspaces = await getAvailableWorkspaces();

  return (
    <NicheProvider
      initialNicheId={workspace.nicheId}
      initialCompanyName={workspace.companyName}
      initialTheme={workspace.theme}
    >
      <AppShell
        fullName={workspace.fullName}
        role={workspace.role}
        roleKey={workspace.roleKey}
        demo={workspace.demo}
        activeWorkspaceId={workspace.organizationId}
        workspaces={workspaces}
      >{children}</AppShell>
    </NicheProvider>
  );
}
