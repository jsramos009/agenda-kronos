"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function switchWorkspace(formData: FormData) {
  const workspaceId = z.string().uuid().safeParse(formData.get("workspaceId"));
  if (!workspaceId.success || !isSupabaseConfigured) redirect("/dashboard");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", workspaceId.data)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (!membership) redirect("/dashboard");
  const cookieStore = await cookies();
  cookieStore.set("kronos_workspace", workspaceId.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
