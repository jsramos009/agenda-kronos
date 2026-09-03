import { KanbanBoard, type KanbanCard, type KanbanStage } from "@/components/kanban-board";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function AtendimentosPage() {
  const workspace = await getCurrentWorkspace();
  const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let stages: KanbanStage[] = niche.workflow.map((stage, index) => ({ id: `demo-${index}`, name: stage.name, color: niche.theme.primary, position: index }));
  let cards: KanbanCard[] = ["João Silva", "Maria Santos", "Pedro Costa", "Ana Oliveira", "Carlos Lima", "Fernanda Rocha", "Juliana Alves", "Ricardo Gomes"].map((client, index) => ({ id: `card-${index}`, stageId: stages[index % stages.length].id, code: `ATD-${String(1000 + index)}`, client, service: niche.services[index % niche.services.length].name, time: index % 2 ? "11:20" : "10:15", assignee: "Ana Martins", aging: index % 4 === 2 ? "Peça pendente" : "No prazo" }));

  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [{ data: stageData, error: stageError }, { data: itemData, error: itemError }] = await Promise.all([
      supabase.from("workflow_stages").select("id, name, color, position").eq("organization_id", workspace.organizationId).eq("visible", true).order("position"),
      supabase.from("work_items").select("id, stage_id, entered_stage_at, appointments:appointments!work_items_appointment_id_fkey(id, starts_at, customers:customers!appointments_customer_id_fkey(name), services:services!appointments_service_id_fkey(name)), organization_members:organization_members!work_items_assignee_member_id_fkey(display_name)").eq("organization_id", workspace.organizationId).order("entered_stage_at"),
    ]);
    if (stageError || itemError) throw new Error(stageError?.message ?? itemError?.message);
    stages = (stageData ?? []).map((stage) => ({ id: stage.id, name: stage.name, color: stage.color ?? workspace.theme.primary, position: stage.position }));
    cards = (itemData ?? []).map((item, index) => {
      const appointment = firstRelation(item.appointments);
      const enteredAt = new Date(item.entered_stage_at);
      return {
        id: item.id,
        stageId: item.stage_id,
        code: `ATD-${String(index + 1).padStart(4, "0")}`,
        client: relationName(appointment?.customers),
        service: relationName(appointment?.services),
        time: appointment?.starts_at ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(appointment.starts_at)) : "Prazo",
        assignee: relationName(item.organization_members),
        aging: `Desde ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(enteredAt)}`,
      };
    });
  }

  return <KanbanBoard initialStages={stages} initialCards={cards} demo={!workspace?.organizationId} />;
}

function firstRelation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }
function relationName(value: { name?: string; display_name?: string } | { name?: string; display_name?: string }[] | null | undefined) {
  const item = firstRelation(value ?? null);
  return item?.name ?? item?.display_name ?? "Sem identificação";
}
