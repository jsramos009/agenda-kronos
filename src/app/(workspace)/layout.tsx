import { AppShell } from "@/components/app-shell";
import { NicheProvider } from "@/components/niche-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <NicheProvider>
      <AppShell>{children}</AppShell>
    </NicheProvider>
  );
}

