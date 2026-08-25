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
  }).safeParse({ name: formData.get("name"), phone: formData.get("phone"), email: formData.get("email") });
  if (!parsed.success || (!parsed.data.phone && !parsed.data.email)) return { status: "error", message: "Informe nome e ao menos um contato válido." };

  try {
    const { workspace, supabase } = await tenantContext();
    const { error } = await supabase.from("customers").insert({
      organization_id: workspace.organizationId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      consent_at: new Date().toISOString(),
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
    const [{ data: service, error: serviceError }, { data: member }, { data: stage }] = await Promise.all([
      supabase.from("services").select("duration_minutes").eq("id", parsed.data.serviceId).single(),
      supabase.from("organization_members").select("id").eq("organization_id", workspace.organizationId).eq("user_id", userId ?? "").maybeSingle(),
      supabase.from("workflow_stages").select("id").eq("organization_id", workspace.organizationId).order("position").limit(1).maybeSingle(),
    ]);
    if (serviceError || !service) throw new Error("Serviço não encontrado.");
    const endsAt = new Date(parsed.data.startsAt.getTime() + service.duration_minutes * 60_000);
    const { data: appointment, error } = await supabase.from("appointments").insert({
      organization_id: workspace.organizationId,
      customer_id: parsed.data.customerId,
      service_id: parsed.data.serviceId,
      professional_member_id: member?.id ?? null,
      starts_at: parsed.data.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: parsed.data.notes ?? null,
      created_by: userId ?? null,
    }).select("id").single();

    if (error) {
      if (error.code === "23P01") throw new Error("Esse profissional já possui um atendimento no horário escolhido.");
      throw error;
    }
    if (stage && appointment) {
      const { error: workItemError } = await supabase.from("work_items").insert({
        organization_id: workspace.organizationId,
        appointment_id: appointment.id,
        stage_id: stage.id,
        assignee_member_id: member?.id ?? null,
      });
      if (workItemError) throw workItemError;
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
    const [{ data: stage, error: stageError }, { data: item, error: itemError }] = await Promise.all([
      supabase.from("workflow_stages").select("canonical_status").eq("id", stageId).eq("organization_id", workspace.organizationId).single(),
      supabase.from("work_items").select("appointment_id").eq("id", workItemId).eq("organization_id", workspace.organizationId).single(),
    ]);
    if (stageError || itemError || !stage || !item) throw new Error("Etapa ou atendimento não encontrado.");
    const { error } = await supabase.from("work_items").update({ stage_id: stageId, entered_stage_at: new Date().toISOString() }).eq("id", workItemId);
    if (error) throw error;
    const { error: appointmentError } = await supabase.from("appointments").update({ status: stage.canonical_status }).eq("id", item.appointment_id);
    if (appointmentError) throw appointmentError;
    revalidatePath("/atendimentos");
    revalidatePath("/dashboard");
    return { status: "success", message: "Etapa atualizada." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Falha ao mover atendimento." };
  }
}
