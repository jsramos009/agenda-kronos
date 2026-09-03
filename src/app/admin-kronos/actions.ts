"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const statusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["pending", "active", "past_due", "cancelled"]),
});

export async function updatePlatformSubscription(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const input = statusSchema.parse({
    organizationId: formData.get("organizationId"),
    status: formData.get("status"),
  });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("subscriptions").update({
    status: input.status,
    activated_at: input.status === "active" ? now : null,
  }).eq("organization_id", input.organizationId);
  if (error) throw new Error(`Não foi possível atualizar a assinatura: ${error.message}`);

  await admin.from("audit_events").insert({
    organization_id: input.organizationId,
    actor_id: actor.userId,
    action: "platform.subscription_status_updated",
    entity_type: "subscription",
    entity_id: input.organizationId,
    after_data: { status: input.status, platform_admin: actor.email },
  });
  revalidatePath("/admin-kronos");
}
