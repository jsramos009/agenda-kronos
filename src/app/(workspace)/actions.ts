"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { niches } from "@/lib/niches";
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
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    reminderMinutes: z.coerce.number().int().min(0).max(10_080),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse({
    customerId: formData.get("customerId"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    reminderMinutes: formData.get("reminderMinutes") || 0,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Selecione cliente, serviço e horário válidos." };
  const startsAt = new Date(`${parsed.data.startsAt}:00-03:00`);
  if (Number.isNaN(startsAt.getTime())) return { status: "error", message: "Escolha uma data e um horário válidos." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { data: claimData } = await supabase.auth.getClaims();
    const userId = claimData?.claims?.sub;
    const [{ data: member }, { data: stage }, { data: customer }] = await Promise.all([
      supabase.from("organization_members").select("id").eq("organization_id", workspace.organizationId).eq("user_id", userId ?? "").maybeSingle(),
      supabase.from("workflow_stages").select("id").eq("organization_id", workspace.organizationId).order("position").limit(1).maybeSingle(),
      supabase.from("customers").select("email, phone").eq("organization_id", workspace.organizationId).eq("id", parsed.data.customerId).maybeSingle(),
    ]);
    const { data: appointmentId, error } = await supabase.rpc("create_appointment_with_work_item", {
      target_organization_id: workspace.organizationId,
      target_customer_id: parsed.data.customerId,
      target_service_id: parsed.data.serviceId,
      target_professional_member_id: member?.id ?? null,
      target_stage_id: stage?.id ?? null,
      target_starts_at: startsAt.toISOString(),
      target_notes: parsed.data.notes ?? null,
    });

    if (error) {
      if (error.code === "23P01") throw new Error("Esse profissional já possui um atendimento no horário escolhido.");
      throw new Error(error.message);
    }
    const recipient = customer?.email || customer?.phone;
    const scheduledFor = new Date(startsAt.getTime() - parsed.data.reminderMinutes * 60_000);
    let reminderMessage = "";
    if (appointmentId && recipient && parsed.data.reminderMinutes > 0 && scheduledFor > new Date()) {
      const { error: reminderError } = await supabase.from("notification_jobs").insert({
        organization_id: workspace.organizationId,
        appointment_id: appointmentId,
        channel: customer?.email ? "email" : "whatsapp",
        template_key: "appointment_reminder",
        recipient,
        scheduled_for: scheduledFor.toISOString(),
      });
      if (reminderError) reminderMessage = " O evento foi salvo, mas o lembrete não pôde ser programado.";
    }
    revalidatePath("/agenda");
    revalidatePath("/atendimentos");
    revalidatePath("/dashboard");
    revalidatePath("/relatorios");
    return { status: "success", message: `Agendamento criado sem conflito.${reminderMessage}` };
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
    const [{ data: previousAppointment }, { data: pendingReminders }] = await Promise.all([
      supabase.from("appointments").select("starts_at").eq("id", parsed.data.appointmentId).eq("organization_id", workspace.organizationId).maybeSingle(),
      supabase.from("notification_jobs").select("id, scheduled_for").eq("appointment_id", parsed.data.appointmentId).eq("organization_id", workspace.organizationId).eq("status", "pending"),
    ]);
    const { error } = await supabase.rpc("reschedule_appointment", {
      target_organization_id: workspace.organizationId,
      target_appointment_id: parsed.data.appointmentId,
      target_starts_at: parsed.data.startsAt.toISOString(),
    });
    if (error?.code === "23P01") return { status: "error", message: "Esse horário já está ocupado." };
    if (error) throw error;
    if (previousAppointment?.starts_at && pendingReminders?.length) {
      const previousStart = new Date(previousAppointment.starts_at).getTime();
      const nextStart = parsed.data.startsAt.getTime();
      await Promise.all(pendingReminders.map((reminder) => {
        const offset = previousStart - new Date(reminder.scheduled_for).getTime();
        return supabase.from("notification_jobs").update({ scheduled_for: new Date(nextStart - offset).toISOString() }).eq("id", reminder.id).eq("organization_id", workspace.organizationId);
      }));
    }
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    revalidatePath("/relatorios");
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
  const parseJsonArray = (value: FormDataEntryValue | null) => {
    try { return JSON.parse(String(value ?? "[]")); } catch { return null; }
  };
  const parsed = z.object({
    companyName: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500),
    nicheId: z.enum(["climatizacao", "odontologia", "advocacia", "assistencia-tecnica", "manicure", "salao"]),
    primaryColor: color,
    accentColor: color,
    softColor: color,
    lineColor: color,
    agendaStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    agendaEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    bookingNotice: z.coerce.number().int().min(0).max(10080),
    cancellationNotice: z.coerce.number().int().min(0).max(43200),
    agendaDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    selectedServices: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
    workflowNames: z.array(z.string().trim().min(2).max(80)).min(2).max(10),
  }).safeParse({
    companyName: formData.get("companyName"),
    description: formData.get("description"),
    nicheId: formData.get("nicheId"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    softColor: formData.get("softColor"),
    lineColor: formData.get("lineColor"),
    agendaStart: formData.get("agendaStart"),
    agendaEnd: formData.get("agendaEnd"),
    bookingNotice: formData.get("bookingNotice"),
    cancellationNotice: formData.get("cancellationNotice"),
    agendaDays: parseJsonArray(formData.get("agendaDays")),
    selectedServices: parseJsonArray(formData.get("selectedServices")),
    workflowNames: parseJsonArray(formData.get("workflowNames")),
  });
  if (!parsed.success) return { status: "error", message: "Revise os dados, horários e cores antes de salvar." };
  const allowedServices = new Set(niches[parsed.data.nicheId].services.map((service) => service.name));
  if (!parsed.data.selectedServices.every((service) => allowedServices.has(service))) {
    return { status: "error", message: "Selecione apenas modelos disponíveis para o nicho atual." };
  }
  const logo = formData.get("logo");
  const logoExtensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  if (logo instanceof File && logo.size > 0 && (!logoExtensions[logo.type] || logo.size > 5 * 1024 * 1024)) {
    return { status: "error", message: "Use um logo PNG, JPG ou WebP de até 5 MB." };
  }
  try {
    const { workspace, supabase } = await tenantContext();
    const preferences = {
      agenda: { startsAt: parsed.data.agendaStart, endsAt: parsed.data.agendaEnd, days: parsed.data.agendaDays },
      notifications: {
        reminder24: formData.get("reminder24") === "true",
        reminder2: formData.get("reminder2") === "true",
        dailyDigest: formData.get("dailyDigest") === "true",
      },
    };
    const { error } = await supabase.rpc("update_organization_settings_v2", {
      target_organization_id: workspace.organizationId,
      target_name: parsed.data.companyName,
      target_description: parsed.data.description,
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

    if (logo instanceof File && logo.size > 0) {
      const extension = logoExtensions[logo.type];
      const logoPath = `${workspace.organizationId}/logo.${extension}`;
      const { error: uploadError } = await supabase.storage.from("organization-logos").upload(logoPath, logo, { contentType: logo.type, upsert: true });
      if (uploadError) throw uploadError;
      const { error: themeError } = await supabase.from("organization_themes").update({ logo_path: logoPath }).eq("organization_id", workspace.organizationId);
      if (themeError) throw themeError;
    }

    const serviceTemplates = niches[parsed.data.nicheId].services.filter((service) => parsed.data.selectedServices.includes(service.name));
    const { error: disableServicesError } = await supabase.from("services").update({ active: false }).eq("organization_id", workspace.organizationId);
    if (disableServicesError) throw disableServicesError;
    const { error: servicesError } = await supabase.from("services").upsert(serviceTemplates.map((service) => ({
      organization_id: workspace.organizationId,
      name: service.name,
      duration_minutes: durationToMinutes(service.duration),
      price_cents: priceToCents(service.price),
      active: true,
      color: parsed.data.primaryColor,
    })), { onConflict: "organization_id,name" });
    if (servicesError) throw servicesError;

    const { data: stages, error: stagesError } = await supabase.from("workflow_stages").select("id").eq("organization_id", workspace.organizationId).eq("active", true).order("position");
    if (stagesError) throw stagesError;
    const stageUpdates = (stages ?? []).slice(0, parsed.data.workflowNames.length).map((stage, index) => supabase.from("workflow_stages").update({ name: parsed.data.workflowNames[index] }).eq("id", stage.id).eq("organization_id", workspace.organizationId));
    const stageResults = await Promise.all(stageUpdates);
    const stageUpdateError = stageResults.find((result) => result.error)?.error;
    if (stageUpdateError) throw stageUpdateError;

    const { data: availabilityRules, error: availabilityReadError } = await supabase.from("availability_rules").select("id, weekday, member_id, resource_id").eq("organization_id", workspace.organizationId);
    if (availabilityReadError) throw availabilityReadError;
    const selectedDays = new Set(parsed.data.agendaDays);
    const availabilityUpdates = (availabilityRules ?? []).map((rule) => supabase.from("availability_rules").update({ starts_at: parsed.data.agendaStart, ends_at: parsed.data.agendaEnd, active: selectedDays.has(rule.weekday) }).eq("id", rule.id).eq("organization_id", workspace.organizationId));
    const availabilityUpdateResults = await Promise.all(availabilityUpdates);
    const availabilityUpdateError = availabilityUpdateResults.find((result) => result.error)?.error;
    if (availabilityUpdateError) throw availabilityUpdateError;
    const existingDays = new Set((availabilityRules ?? []).map((rule) => rule.weekday));
    const missingDays = parsed.data.agendaDays.filter((day) => !existingDays.has(day));
    if (missingDays.length) {
      const { data: claims } = await supabase.auth.getClaims();
      const { data: member, error: memberError } = await supabase.from("organization_members").select("id").eq("organization_id", workspace.organizationId).eq("user_id", claims?.claims?.sub ?? "").eq("active", true).single();
      if (memberError) throw memberError;
      const { error: availabilityInsertError } = await supabase.from("availability_rules").insert(missingDays.map((weekday) => ({ organization_id: workspace.organizationId, member_id: member.id, weekday, starts_at: parsed.data.agendaStart, ends_at: parsed.data.agendaEnd, active: true })));
      if (availabilityInsertError) throw availabilityInsertError;
    }
    revalidatePath("/", "layout"); return { status: "success", message: "Configurações salvas." };
  } catch { return { status: "error", message: "Não foi possível salvar todas as configurações. Tente novamente." }; }
}

export async function resizeAppointment(appointmentId: string, durationMinutes: number): Promise<ActionState> {
  const parsed = z.object({
    appointmentId: z.string().uuid(),
    durationMinutes: z.number().int().min(5).max(1440),
  }).safeParse({ appointmentId, durationMinutes });
  if (!parsed.success) return { status: "error", message: "Escolha uma duração válida." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { data: appointment, error: readError } = await supabase
      .from("appointments")
      .select("starts_at")
      .eq("organization_id", workspace.organizationId)
      .eq("id", parsed.data.appointmentId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!appointment?.starts_at) return { status: "error", message: "Agendamento não encontrado neste espaço." };

    const endsAt = new Date(new Date(appointment.starts_at).getTime() + parsed.data.durationMinutes * 60_000);
    const { error } = await supabase
      .from("appointments")
      .update({ ends_at: endsAt.toISOString() })
      .eq("organization_id", workspace.organizationId)
      .eq("id", parsed.data.appointmentId);
    if (error?.code === "23P01") return { status: "error", message: "A nova duração invade outro atendimento." };
    if (error) throw new Error(error.message);
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    revalidatePath("/relatorios");
    return { status: "success", message: "Duração do agendamento atualizada." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao alterar a duração." };
  }
}

function durationToMinutes(duration: string) {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)\s*min/)?.[1] ?? 0);
  return Math.max(5, (hours * 60) + minutes);
}

function priceToCents(price: string) {
  const match = price.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/);
  if (!match) return null;
  return Math.round(Number(match[1].replace(/\./g, "").replace(",", ".")) * 100);
}

export async function updateRecommendation(recommendationId: string, status: "new" | "applied" | "dismissed" | "snoozed"): Promise<ActionState> {
  if (!z.string().uuid().safeParse(recommendationId).success) return { status: "error", message: "Recomendação inválida." };
  try {
    const { workspace, supabase } = await tenantContext();
    const values = status === "applied" ? { status, applied_at: new Date().toISOString(), snoozed_until: null } : status === "snoozed" ? { status, snoozed_until: new Date(Date.now() + 86_400_000).toISOString(), applied_at: null } : { status, snoozed_until: null, applied_at: null };
    const { data, error } = await supabase.from("recommendations").update(values).eq("id", recommendationId).eq("organization_id", workspace.organizationId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return { status: "error", message: "Insight não encontrado ou sem permissão para alteração." };
    revalidatePath("/insights"); revalidatePath("/", "layout"); return { status: "success", message: status === "new" ? "Insight reaberto." : status === "applied" ? "Insight aplicado." : status === "snoozed" ? "Lembrete agendado para amanhã." : "Insight dispensado." };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao atualizar insight." }; }
}

export async function markRecommendationRead(recommendationId: string): Promise<ActionState> {
  if (!z.string().uuid().safeParse(recommendationId).success) return { status: "error", message: "Recomendação inválida." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { data, error } = await supabase.rpc("mark_recommendation_read", {
      target_organization_id: workspace.organizationId,
      target_recommendation_id: recommendationId,
    });
    if (error) throw error;
    if (!data) return { status: "error", message: "Insight não encontrado ou sem permissão para leitura." };
    revalidatePath("/insights");
    revalidatePath("/", "layout");
    return { status: "success", message: "Insight marcado como lido." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao marcar insight como lido." };
  }
}

export async function createKnowledgeArticle(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ title: z.string().trim().min(3).max(180), type: z.enum(["process", "manual", "checklist", "faq", "template"]), content: z.string().trim().min(10).max(10_000) }).safeParse({ title: formData.get("title"), type: formData.get("type"), content: formData.get("content") });
  if (!parsed.success) return { status: "error", message: "Informe título, tipo e conteúdo." };
  try { const { workspace, supabase } = await tenantContext(); const { data: claims } = await supabase.auth.getClaims(); const { error } = await supabase.from("knowledge_articles").insert({ organization_id: workspace.organizationId, title: parsed.data.title, type: parsed.data.type, body: { text: parsed.data.content }, status: "draft", created_by: claims?.claims?.sub ?? null }); if (error) throw error; revalidatePath("/conhecimento"); return { status: "success", message: "Artigo criado como rascunho." }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Falha ao criar artigo." }; }
}

export async function updateKnowledgeArticle(articleId: string, content: string, published: boolean): Promise<ActionState> {
  const parsed = z.object({ articleId: z.string().uuid(), content: z.string().trim().min(10).max(10_000), published: z.boolean() }).safeParse({ articleId, content, published });
  if (!parsed.success) return { status: "error", message: "Revise o conteúdo antes de salvar." };
  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.from("knowledge_articles").update({ body: { text: parsed.data.content }, status: parsed.data.published ? "published" : "draft" }).eq("id", parsed.data.articleId).eq("organization_id", workspace.organizationId);
    if (error) throw new Error(error.message);
    revalidatePath("/conhecimento");
    return { status: "success", message: parsed.data.published ? "Conteúdo publicado." : "Rascunho salvo." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao atualizar conteúdo." };
  }
}
