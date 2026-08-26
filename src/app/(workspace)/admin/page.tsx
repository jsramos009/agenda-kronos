import { AdminManager, type AdminEvent, type AdminPerson } from "@/components/admin-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const demoPeople: AdminPerson[] = [
  { id: "demo-owner", name: "Ana Martins", role: "Proprietária", active: true, protected: true },
  { id: "demo-admin", name: "Marina Costa", email: "marina@climaprime.com", role: "Administradora", active: true },
  { id: "demo-pro", name: "João Ribeiro", email: "joao@climaprime.com", role: "Profissional", active: true },
  { id: "demo-analyst", name: "Luiza Prado", email: "luiza@climaprime.com", role: "Analista", active: false },
];

export default async function AdminPage() {
  const workspace = await getCurrentWorkspace();
  if (!workspace) return null;
  const allowed = workspace.demo || workspace.roleKey === "owner" || workspace.roleKey === "admin";
  if (!allowed) return <section className="panel access-denied"><h1>Acesso restrito</h1><p>Somente proprietários e administradores podem abrir esta área.</p></section>;

  let people = demoPeople;
  let events: AdminEvent[] = [
    { id: "demo-audit-1", action: "Agendamento remarcado", createdAt: "2026-08-26T10:20:00-03:00" },
    { id: "demo-audit-2", action: "Convite de equipe registrado", createdAt: "2026-08-26T09:05:00-03:00" },
    { id: "demo-audit-3", action: "Configurações da empresa atualizadas", createdAt: "2026-08-25T17:40:00-03:00" },
  ];
  let stats = { activePeople: 3, pendingInvites: 1, customers: 128, appointments: 347 };

  if (workspace.organizationId) {
    const supabase = await createClient();
    const [members, invitations, customers, appointments, audit] = await Promise.all([
      supabase.from("organization_members").select("id, display_name, role, active").eq("organization_id", workspace.organizationId).order("created_at"),
      supabase.from("organization_invitations").select("id, email, role").eq("organization_id", workspace.organizationId).eq("status", "pending"),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", workspace.organizationId),
      supabase.from("audit_events").select("id, action, created_at").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false }).limit(12),
    ]);
    const memberPeople: AdminPerson[] = (members.data ?? []).map((member) => ({ id: member.id, name: member.display_name, role: roleLabel(member.role), active: member.active, protected: member.role === "owner" }));
    const invitedPeople: AdminPerson[] = (invitations.data ?? []).map((invite) => ({ id: invite.id, name: invite.email.split("@")[0], email: invite.email, role: roleLabel(invite.role), active: false, protected: true }));
    people = [...memberPeople, ...invitedPeople];
    stats = { activePeople: memberPeople.filter((person) => person.active).length, pendingInvites: invitedPeople.length, customers: customers.count ?? 0, appointments: appointments.count ?? 0 };
    events = (audit.data ?? []).map((event) => ({ id: event.id, action: actionLabel(event.action), createdAt: event.created_at }));
  }

  return <AdminManager companyName={workspace.companyName} initialPeople={people} events={events} stats={stats} demo={workspace.demo} />;
}

function roleLabel(value: string) { return { owner: "Proprietária", admin: "Administradora", reception: "Recepção", professional: "Profissional", analyst: "Analista" }[value] ?? value; }
function actionLabel(value: string) { return ({ "appointment.rescheduled": "Agendamento remarcado", "appointment.updated": "Detalhes do agendamento atualizados", "member.activated": "Acesso de equipe reativado", "member.suspended": "Acesso de equipe suspenso", "organization.bootstrapped": "Workspace criado" } as Record<string, string>)[value] ?? value.replaceAll(".", " "); }
