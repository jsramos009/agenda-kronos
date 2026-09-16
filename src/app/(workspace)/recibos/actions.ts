"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildPixPayload } from "@/lib/pix";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type ReceiptActionState = { status: "idle" | "success" | "error"; message: string; receiptId?: string; publicToken?: string };

const itemSchema = z.object({
  type: z.enum(["service", "material", "product", "other"]),
  description: z.string().trim().min(2).max(240),
  quantity: z.number().positive().max(100000),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
});

export async function createReceipt(_: ReceiptActionState, formData: FormData): Promise<ReceiptActionState> {
  let items: unknown;
  try { items = JSON.parse(String(formData.get("items") ?? "[]")); } catch { items = null; }
  const parsed = z.object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid().optional().or(z.literal("")),
    serviceDescription: z.string().trim().min(2).max(500),
    customerDocument: z.string().trim().max(30).optional().or(z.literal("")),
    notes: z.string().trim().max(1200).optional().or(z.literal("")),
    items: z.array(itemSchema).min(1).max(50),
  }).safeParse({
    customerId: formData.get("customerId"), serviceId: formData.get("serviceId") || "",
    serviceDescription: formData.get("serviceDescription"), customerDocument: formData.get("customerDocument") || "",
    notes: formData.get("notes") || "", items,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revise os dados do recibo." };

  try {
    const context = await receiptContext(["owner", "admin", "reception", "professional"]);
    const admin = createAdminClient();
    const [customerResult, serviceResult, pixResult, organizationResult] = await Promise.all([
      admin.from("customers").select("id, name, email, phone, document").eq("organization_id", context.organizationId).eq("id", parsed.data.customerId).single(),
      parsed.data.serviceId ? admin.from("services").select("id, name").eq("organization_id", context.organizationId).eq("id", parsed.data.serviceId).single() : Promise.resolve({ data: null }),
      admin.from("organization_pix_settings").select("pix_key, merchant_name, merchant_city").eq("organization_id", context.organizationId).maybeSingle(),
      admin.from("organizations").select("name").eq("id", context.organizationId).single(),
    ]);
    const customer = customerResult.data;
    const service = serviceResult.data;
    const pix = pixResult.data;
    const organization = organizationResult.data;
    if (!customer) throw new Error("Cliente não encontrado neste espaço.");
    if (parsed.data.serviceId && !service) throw new Error("Serviço não encontrado neste espaço.");
    if (!pix) throw new Error("Cadastre sua chave Pix em Configurações antes de emitir o recibo.");

    const totalCents = parsed.data.items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
    if (totalCents <= 0) throw new Error("O total do recibo precisa ser maior que zero.");
    const receiptId = randomUUID();
    const receiptNumber = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${receiptId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const pixPayload = buildPixPayload({ key: pix.pix_key, name: pix.merchant_name || organization?.name || "Kronos", city: pix.merchant_city, amountCents: totalCents, txid: receiptNumber });
    const publicToken = randomUUID();
    const receipt = {
      id: receiptId, organization_id: context.organizationId, public_token: publicToken, receipt_number: receiptNumber,
      customer_id: customer.id, service_id: service?.id ?? null, customer_name: customer.name,
      customer_document: parsed.data.customerDocument || customer.document || null, customer_email: customer.email,
      customer_phone: customer.phone, service_description: parsed.data.serviceDescription || service?.name || "Serviço prestado",
      notes: parsed.data.notes || null, total_cents: totalCents, pix_key_snapshot: pix.pix_key,
      pix_payload: pixPayload, status: "issued", created_by: context.userId,
    };
    const { error: receiptError } = await admin.from("receipts").insert(receipt);
    if (receiptError) throw receiptError;
    const { error: itemsError } = await admin.from("receipt_items").insert(parsed.data.items.map((item, position) => ({
      organization_id: context.organizationId, receipt_id: receiptId, item_type: item.type,
      description: item.description, quantity: item.quantity, unit_price_cents: item.unitPriceCents,
      total_cents: Math.round(item.quantity * item.unitPriceCents), position,
    })));
    if (itemsError) { await admin.from("receipts").delete().eq("id", receiptId).eq("organization_id", context.organizationId); throw itemsError; }
    await admin.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.userId, action: "receipt.issued", entity_type: "receipt", entity_id: receiptId, after_data: { receipt_number: receiptNumber, total_cents: totalCents } });
    revalidatePath("/recibos");
    return { status: "success", message: "Recibo emitido e QR Code Pix gerado.", receiptId, publicToken };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Não foi possível criar o recibo." };
  }
}

export async function savePixSettings(_: ReceiptActionState, formData: FormData): Promise<ReceiptActionState> {
  const parsed = z.object({ keyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]), pixKey: z.string().trim().min(3).max(140), merchantName: z.string().trim().min(2).max(25), merchantCity: z.string().trim().min(2).max(15) }).safeParse({ keyType: formData.get("keyType"), pixKey: formData.get("pixKey"), merchantName: formData.get("merchantName"), merchantCity: formData.get("merchantCity") });
  if (!parsed.success) return { status: "error", message: "Revise a chave Pix, o nome e a cidade." };
  try {
    const pixKey = normalizePixKey(parsed.data.keyType, parsed.data.pixKey);
    const context = await receiptContext(["owner", "admin"]);
    const admin = createAdminClient();
    const { error } = await admin.from("organization_pix_settings").upsert({ organization_id: context.organizationId, key_type: parsed.data.keyType, pix_key: pixKey, merchant_name: parsed.data.merchantName, merchant_city: parsed.data.merchantCity, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw error;
    await admin.from("audit_events").insert({ organization_id: context.organizationId, actor_id: context.userId, action: "pix.settings_updated", entity_type: "organization_pix_settings", entity_id: context.organizationId });
    revalidatePath("/configuracoes"); revalidatePath("/recibos");
    return { status: "success", message: "Chave Pix salva com segurança." };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o Pix." }; }
}

function normalizePixKey(type: "cpf" | "cnpj" | "email" | "phone" | "random", rawValue: string) {
  const value = rawValue.trim();
  if (type === "cpf" || type === "cnpj") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== (type === "cpf" ? 11 : 14)) throw new Error(`Informe um ${type.toUpperCase()} válido para a chave Pix.`);
    return digits;
  }
  if (type === "email") {
    const parsed = z.string().email().safeParse(value.toLowerCase());
    if (!parsed.success) throw new Error("Informe um e-mail válido para a chave Pix.");
    return parsed.data;
  }
  if (type === "phone") {
    const digits = value.replace(/\D/g, "");
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    if (!/^55\d{10,11}$/.test(withCountry)) throw new Error("Informe o telefone Pix com DDD.");
    return `+${withCountry}`;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Informe uma chave aleatória Pix válida.");
  return value.toLowerCase();
}

async function receiptContext(roles: string[]) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId) throw new Error("Esta ação não está disponível na demonstração.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Sua sessão expirou. Entre novamente.");
  const { data: member } = await supabase.from("organization_members").select("role, active").eq("organization_id", workspace.organizationId).eq("user_id", userId).single();
  if (!member?.active || !roles.includes(member.role)) throw new Error("Seu perfil não possui permissão para esta operação.");
  return { organizationId: workspace.organizationId, userId };
}
