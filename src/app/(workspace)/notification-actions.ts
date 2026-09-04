"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type NotificationActionResult = { ok: true } | { ok: false; message: string };

async function notificationContext() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId || workspace.demo) throw new Error("Notificações indisponíveis na demonstração.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Sua sessão expirou. Entre novamente.");
  return { organizationId: workspace.organizationId, supabase, userId };
}
export async function markNotificationRead(notificationId: string): Promise<NotificationActionResult> {
  const id = z.string().uuid().safeParse(notificationId);
  if (!id.success) return { ok: false, message: "Notificação inválida." };
  try {
    const { organizationId, supabase, userId } = await notificationContext();
    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id.data)
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw error;
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível marcar como lida." };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  try {
    const { organizationId, supabase, userId } = await notificationContext();
    const { error } = await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw error;
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Não foi possível atualizar as notificações." };
  }
}
