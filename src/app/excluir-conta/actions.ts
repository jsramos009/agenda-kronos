"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function deleteCurrentAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
  if (!userId || email !== "josegabrielramos2004@gmail.com") redirect("/dashboard");

  const admin = createAdminClient();
  const { data: organizations, error: organizationsError } = await admin.from("organizations").select("id").eq("created_by", userId);
  if (organizationsError) throw new Error(`Não foi possível localizar os workspaces: ${organizationsError.message}`);

  for (const organization of organizations ?? []) {
    const { data: objects, error: listError } = await admin.storage.from("organization-logos").list(organization.id);
    if (listError) throw new Error(`Não foi possível verificar os arquivos da conta: ${listError.message}`);
    if (objects.length) {
      const { error: storageError } = await admin.storage.from("organization-logos").remove(objects.map((object) => `${organization.id}/${object.name}`));
      if (storageError) throw new Error(`Não foi possível remover os arquivos da conta: ${storageError.message}`);
    }
  }

  const { error: organizationError } = await admin.from("organizations").delete().eq("created_by", userId);
  if (organizationError) throw new Error(`Não foi possível remover o workspace: ${organizationError.message}`);
  await supabase.auth.signOut({ scope: "global" });
  const { error: userError } = await admin.auth.admin.deleteUser(userId);
  if (userError) throw new Error(`Não foi possível remover o login: ${userError.message}`);
  redirect("/entrar?conta=excluida");
}
