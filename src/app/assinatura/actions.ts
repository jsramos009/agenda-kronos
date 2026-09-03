"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { subscriptionPlans } from "@/lib/subscription-plans";
import { getCurrentWorkspace } from "@/lib/workspace";

const billingCycleSchema = z.enum(["monthly", "annual"]);

export async function startSubscriptionCheckout(formData: FormData) {
  const cycle = billingCycleSchema.safeParse(formData.get("billingCycle"));
  if (!cycle.success) redirect("/assinatura?erro=Selecione+um+plano+válido.");

  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId || workspace.demo) redirect("/entrar");
  const supabase = await createClient();
  const { error } = await supabase.rpc("select_subscription_plan", {
    target_organization_id: workspace.organizationId,
    selected_billing_cycle: cycle.data,
  });
  if (error) redirect("/assinatura?erro=Não+foi+possível+selecionar+o+plano.");
  redirect(subscriptionPlans[cycle.data].url);
}

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
