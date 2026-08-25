import { SettingsManager } from "@/components/settings-manager";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function ConfiguracoesPage() {
  const workspace = await getCurrentWorkspace();
  return <SettingsManager demo={workspace?.demo ?? true} />;
}
