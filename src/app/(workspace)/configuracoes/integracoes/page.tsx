import { redirect } from "next/navigation";
import { IntegrationSettings } from "@/components/integration-settings";
import type { PaymentConnection } from "@/components/payment-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function IntegrationSettingsPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId || !["owner", "admin"].includes(workspace.roleKey)) redirect("/configuracoes");
  const supabase = await createClient();
  const { data, error } = await supabase.from("payment_provider_connections").select("environment, status, account_name, account_document_masked, last_verified_at").eq("organization_id", workspace.organizationId).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar as integrações: ${error.message}`);
  const connection: PaymentConnection = { connected: data?.status === "connected", environment: data?.environment === "production" ? "production" : "sandbox", accountName: data?.account_name ?? null, accountDocument: data?.account_document_masked ?? null, lastVerifiedAt: data?.last_verified_at ?? null };
  return <IntegrationSettings connection={connection} resendReady={Boolean(process.env.RESEND_API_KEY)} />;
}
