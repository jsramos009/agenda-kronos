"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

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
  const parsed = z.object({ companyName: z.string().trim().min(2).max(120), nicheId: z.enum(["climatizacao", "odontologia", "advocacia", "assistencia-tecnica", "manicure", "salao"]) }).safeParse({ companyName: formData.get("companyName"), nicheId: formData.get("nicheId") });
  if (!parsed.success) return { status: "error", message: "Revise o nome da empresa e o nicho." };
  try {
    const { workspace, supabase } = await tenantContext(); const theme = niches[parsed.data.nicheId].theme;
    const { error } = await supabase.rpc("update_organization_identity", {
      target_organization_id: workspace.organizationId,
      target_name: parsed.data.companyName,
      target_niche_id: parsed.data.nicheId,
      target_primary_color: theme.primary,
      target_accent_color: theme.accent,
      target_soft_color: theme.soft,
      target_line_color: theme.line,
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
