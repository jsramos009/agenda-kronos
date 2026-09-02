"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function requestSubscriptionReview() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId || workspace.demo) redirect("/entrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_subscription_review", {
    target_organization_id: workspace.organizationId,
  });
  if (error) redirect("/assinatura?erro=Não+foi+possível+registrar+a+confirmação.");
  redirect("/assinatura?mensagem=Pagamento+enviado+para+confirmação.");
}
