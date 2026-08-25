import { AccountManager, type AccountPerson } from "@/components/account-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function ContaPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  let people: AccountPerson[] = [{ id: "demo-owner", name: workspace.fullName, role: workspace.role, status: "Ativo" }, { id: "demo-reception", name: "Marina Costa", email: "marina@climaprime.com", role: "Recepção", status: "Ativo" }];
  if (workspace.organizationId) {
    const supabase = await createClient();
    const [members, invitations] = await Promise.all([
      supabase.from("organization_members").select("id, display_name, role, active").eq("organization_id", workspace.organizationId).order("display_name"),
      supabase.from("organization_invitations").select("id, email, role, status").eq("organization_id", workspace.organizationId).eq("status", "pending"),
    ]);
    people = [...(members.data ?? []).map((member) => ({ id: member.id, name: member.display_name, role: roleLabel(member.role), status: member.active ? "Ativo" as const : "Pendente" as const })), ...(invitations.data ?? []).map((invite) => ({ id: invite.id, name: invite.email.split("@")[0], email: invite.email, role: roleLabel(invite.role), status: "Pendente" as const }))];
  }
  return <AccountManager companyName={workspace.companyName} fullName={workspace.fullName} role={workspace.role} initialPeople={people} demo={workspace.demo} />;
}

function roleLabel(value: string) { return { owner: "Proprietário", admin: "Administrador", reception: "Recepção", professional: "Profissional", analyst: "Analista" }[value] ?? value; }
