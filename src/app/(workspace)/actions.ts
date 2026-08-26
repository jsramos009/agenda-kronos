"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type ActionState = { status: "idle" | "success" | "error"; message: string };

async function tenantContext() {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId) throw new Error("Conecte o Supabase para salvar dados reais.");
  return { workspace, supabase: await createClient() };
}

export async function createCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    name: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
    email: z.string().trim().email().optional().or(z.literal("")),
    consent: z.boolean(),
  }).safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success || (!parsed.data.phone && !parsed.data.email)) return { status: "error", message: "Informe nome e ao menos um contato válido." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.from("customers").insert({
      organization_id: workspace.organizationId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      consent_at: parsed.data.consent ? new Date().toISOString() : null,
    });
    if (error) throw error;
    revalidatePath("/clientes");
    return { status: "success", message: "Cliente cadastrado." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao cadastrar cliente." };
  }
}

export async function createService(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    durationMinutes: z.coerce.number().int().min(5).max(1440),
    bufferMinutes: z.coerce.number().int().min(0).max(240),
    price: z.coerce.number().min(0).max(1_000_000),
    requiresAddress: z.boolean(),
  }).safeParse({
    name: formData.get("name"),
    durationMinutes: formData.get("durationMinutes"),
    bufferMinutes: formData.get("bufferMinutes") || 0,
    price: formData.get("price") || 0,
    requiresAddress: formData.get("requiresAddress") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Revise nome, duração e valor do serviço." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.from("services").insert({
      organization_id: workspace.organizationId,
      name: parsed.data.name,
      duration_minutes: parsed.data.durationMinutes,
      buffer_after_minutes: parsed.data.bufferMinutes,
      price_cents: Math.round(parsed.data.price * 100),
      requires_address: parsed.data.requiresAddress,
      color: workspace.theme.primary,
    });
    if (error) throw error;
    revalidatePath("/servicos");
    return { status: "success", message: "Serviço criado." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao criar serviço." };
  }
}

export async function createAppointment(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    startsAt: z.coerce.date(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse({
    customerId: formData.get("customerId"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Selecione cliente, serviço e horário válidos." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { data: claimData } = await supabase.auth.getClaims();
    const userId = claimData?.claims?.sub;
    const [{ data: member }, { data: stage }] = await Promise.all([
      supabase.from("organization_members").select("id").eq("organization_id", workspace.organizationId).eq("user_id", userId ?? "").maybeSingle(),
      supabase.from("workflow_stages").select("id").eq("organization_id", workspace.organizationId).order("position").limit(1).maybeSingle(),
    ]);
    const { error } = await supabase.rpc("create_appointment_with_work_item", {
      target_organization_id: workspace.organizationId,
      target_customer_id: parsed.data.customerId,
      target_service_id: parsed.data.serviceId,
      target_professional_member_id: member?.id ?? null,
      target_stage_id: stage?.id ?? null,
      target_starts_at: parsed.data.startsAt.toISOString(),
      target_notes: parsed.data.notes ?? null,
    });

    if (error) {
      if (error.code === "23P01") throw new Error("Esse profissional já possui um atendimento no horário escolhido.");
      throw error;
    }
    revalidatePath("/agenda");
    revalidatePath("/atendimentos");
    revalidatePath("/dashboard");
    return { status: "success", message: "Agendamento criado sem conflito." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao criar agendamento." };
  }
}

export async function rescheduleAppointment(appointmentId: string, startsAt: string): Promise<ActionState> {
  const parsed = z.object({
    appointmentId: z.string().uuid(),
    startsAt: z.coerce.date(),
  }).safeParse({ appointmentId, startsAt });
  if (!parsed.success) return { status: "error", message: "Escolha uma data e um horário válidos." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.rpc("reschedule_appointment", {
      target_organization_id: workspace.organizationId,
      target_appointment_id: parsed.data.appointmentId,
      target_starts_at: parsed.data.startsAt.toISOString(),
    });
    if (error?.code === "23P01") return { status: "error", message: "Esse horário já está ocupado." };
    if (error) throw error;
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { status: "success", message: "Agendamento remarcado." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao remarcar o agendamento." };
  }
}

export async function updateAppointmentNotes(appointmentId: string, notes: string): Promise<ActionState> {
  const parsed = z.object({ appointmentId: z.string().uuid(), notes: z.string().trim().max(1000) }).safeParse({ appointmentId, notes });
  if (!parsed.success) return { status: "error", message: "As observações devem ter até 1.000 caracteres." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.rpc("update_appointment_details", {
      target_organization_id: workspace.organizationId,
      target_appointment_id: parsed.data.appointmentId,
      target_notes: parsed.data.notes,
    });
    if (error) throw error;
    revalidatePath("/agenda");
    return { status: "success", message: "Detalhes atualizados." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao atualizar o agendamento." };
  }
}

export async function setMemberAccess(memberId: string, active: boolean): Promise<ActionState> {
  if (!z.string().uuid().safeParse(memberId).success) return { status: "error", message: "Pessoa inválida." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.rpc("set_organization_member_access", {
      target_organization_id: workspace.organizationId,
      target_member_id: memberId,
      target_active: active,
    });
    if (error?.code === "42501") return { status: "error", message: "O proprietário e o seu próprio acesso não podem ser suspensos." };
    if (error) throw error;
    revalidatePath("/admin");
    revalidatePath("/conta");
    return { status: "success", message: active ? "Acesso reativado." : "Acesso suspenso." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao alterar o acesso." };
  }
}

export async function moveWorkItem(workItemId: string, stageId: string): Promise<ActionState> {
  if (!z.string().uuid().safeParse(workItemId).success || !z.string().uuid().safeParse(stageId).success) return { status: "error", message: "Movimentação inválida." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.rpc("move_work_item", {
      target_organization_id: workspace.organizationId,
      target_work_item_id: workItemId,
      target_stage_id: stageId,
    });
    if (error) throw error;
    revalidatePath("/atendimentos");
    revalidatePath("/dashboard");
    return { status: "success", message: "Etapa atualizada." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao mover atendimento." };
  }
}

export async function inviteTeamMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.string().trim().email(), role: z.enum(["admin", "reception", "professional", "analyst"]) }).safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { status: "error", message: "Informe um e-mail e um papel válidos." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { data: claims } = await supabase.auth.getClaims();
    const actorId = claims?.claims?.sub;
    if (!actorId) throw new Error("Sessão expirada.");
    const { error } = await supabase.from("organization_invitations").insert({ organization_id: workspace.organizationId, email: parsed.data.email, role: parsed.data.role, invited_by: actorId });
    if (error?.code === "23505") return { status: "error", message: "Já existe um convite pendente para este e-mail." };
    if (error) throw error;
    revalidatePath("/conta");
    return { status: "success", message: "Convite registrado para envio." };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao registrar convite." }; }
}

export async function saveOrganizationSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const color = z.string().regex(/^#[0-9a-f]{6}$/i);
  const parsed = z.object({
    companyName: z.string().trim().min(2).max(120),
    nicheId: z.enum(["climatizacao", "odontologia", "advocacia", "assistencia-tecnica", "manicure", "salao"]),
    primaryColor: color,
    accentColor: color,
    softColor: color,
    lineColor: color,
    agendaStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    agendaEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    bookingNotice: z.coerce.number().int().min(0).max(10080),
    cancellationNotice: z.coerce.number().int().min(0).max(43200),
  }).safeParse({
    companyName: formData.get("companyName"),
    nicheId: formData.get("nicheId"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    softColor: formData.get("softColor"),
    lineColor: formData.get("lineColor"),
    agendaStart: formData.get("agendaStart"),
    agendaEnd: formData.get("agendaEnd"),
    bookingNotice: formData.get("bookingNotice"),
    cancellationNotice: formData.get("cancellationNotice"),
  });
  if (!parsed.success) return { status: "error", message: "Revise os dados, horários e cores antes de salvar." };
  try {
    const { workspace, supabase } = await tenantContext();
    const preferences = {
      agenda: { startsAt: parsed.data.agendaStart, endsAt: parsed.data.agendaEnd },
      notifications: {
        reminder24: formData.get("reminder24") === "true",
        reminder2: formData.get("reminder2") === "true",
        dailyDigest: formData.get("dailyDigest") === "true",
      },
    };
    const { error } = await supabase.rpc("update_organization_settings", {
      target_organization_id: workspace.organizationId,
      target_name: parsed.data.companyName,
      target_niche_id: parsed.data.nicheId,
      target_primary_color: parsed.data.primaryColor,
      target_accent_color: parsed.data.accentColor,
      target_soft_color: parsed.data.softColor,
      target_line_color: parsed.data.lineColor,
      target_booking_notice_minutes: parsed.data.bookingNotice,
      target_cancellation_notice_minutes: parsed.data.cancellationNotice,
      target_preferences: preferences,
    });
    if (error) throw error;
    revalidatePath("/", "layout"); return { status: "success", message: "Configurações salvas." };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao salvar configurações." }; }
}

export async function updateRecommendation(recommendationId: string, status: "applied" | "dismissed" | "snoozed"): Promise<ActionState> {
  if (!z.string().uuid().safeParse(recommendationId).success) return { status: "error", message: "Recomendação inválida." };
  try {
    const { workspace, supabase } = await tenantContext();
    const values = status === "applied" ? { status, applied_at: new Date().toISOString(), snoozed_until: null } : status === "snoozed" ? { status, snoozed_until: new Date(Date.now() + 86_400_000).toISOString(), applied_at: null } : { status, snoozed_until: null, applied_at: null };
    const { error } = await supabase.from("recommendations").update(values).eq("id", recommendationId).eq("organization_id", workspace.organizationId);
    if (error) throw error; revalidatePath("/insights"); return { status: "success", message: status === "applied" ? "Insight aplicado." : status === "snoozed" ? "Lembrete agendado para amanhã." : "Insight dispensado." };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao atualizar insight." }; }
}

export async function createKnowledgeArticle(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ title: z.string().trim().min(3).max(180), type: z.enum(["process", "manual", "checklist", "faq", "template"]), content: z.string().trim().min(10).max(10_000) }).safeParse({ title: formData.get("title"), type: formData.get("type"), content: formData.get("content") });
  if (!parsed.success) return { status: "error", message: "Informe título, tipo e conteúdo." };
  try { const { workspace, supabase } = await tenantContext(); const { data: claims } = await supabase.auth.getClaims(); const { error } = await supabase.from("knowledge_articles").insert({ organization_id: workspace.organizationId, title: parsed.data.title, type: parsed.data.type, body: { text: parsed.data.content }, status: "draft", created_by: claims?.claims?.sub ?? null }); if (error) throw error; revalidatePath("/conhecimento"); return { status: "success", message: "Artigo criado como rascunho." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao criar artigo." }; }
}
