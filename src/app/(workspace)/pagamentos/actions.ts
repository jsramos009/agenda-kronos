"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AsaasApiError,
  asaasRequest,
  decryptAsaasApiKey,
  encryptAsaasApiKey,
  normalizeAsaasStatus,
  type AsaasEnvironment,
} from "@/lib/asaas";
import { getSiteUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type BillingActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const connectSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  apiKey: z.string().trim().min(20).max(500),
});

const chargeSchema = z.object({
  customerId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().or(z.literal("")),
  customerDocument: z.string().transform((value) => value.replace(/\D/g, "")).refine(
    (value) => value.length === 11 || value.length === 14,
    "Informe um CPF ou CNPJ válido.",
  ),
  amount: z.coerce.number().positive().max(1_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(2).max(500),
});

type AsaasCommercialInfo = {
  companyName?: string;
  name?: string;
  cpfCnpj?: string;
};

type AsaasWebhook = { id: string };

type AsaasCustomer = { id: string };

type AsaasCustomerList = { data?: AsaasCustomer[] };

type AsaasPayment = {
  id: string;
  status?: string;
  value?: number;
  netValue?: number;
  dueDate?: string;
  dateCreated?: string;
  paymentDate?: string;
  confirmedDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

export async function connectAsaas(
  _: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = connectSchema.safeParse({
    environment: formData.get("environment"),
    apiKey: formData.get("apiKey"),
  });
  if (!parsed.success) return fail("Informe o ambiente e uma chave de API válida do Asaas.");

  try {
    const context = await billingContext(["owner", "admin"]);
    const { apiKey, environment } = parsed.data;
    const commercialInfo = await asaasRequest<AsaasCommercialInfo>(
      environment,
      apiKey,
      "/myAccount/commercialInfo/",
      { method: "GET" },
    );

    const webhookToken = randomBytes(32).toString("hex");
    const webhook = await asaasRequest<AsaasWebhook>(environment, apiKey, "/webhooks", {
      method: "POST",
      body: JSON.stringify({
        name: "Kronos — pagamentos",
        url: `${getSiteUrl()}/api/webhooks/asaas/${context.organizationId}`,
        email: context.userEmail,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: webhookToken,
        sendType: "SEQUENTIALLY",
        events: [
          "PAYMENT_CREATED",
          "PAYMENT_UPDATED",
          "PAYMENT_CONFIRMED",
          "PAYMENT_RECEIVED",
          "PAYMENT_RECEIVED_IN_CASH",
          "PAYMENT_OVERDUE",
          "PAYMENT_REFUNDED",
          "PAYMENT_REFUND_IN_PROGRESS",
          "PAYMENT_DELETED",
          "PAYMENT_RESTORED",
          "PAYMENT_CHARGEBACK_REQUESTED",
          "PAYMENT_CHARGEBACK_DISPUTE",
          "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
        ],
      }),
    });

    const previous = await getConnectionSecret(context.admin, context.organizationId);
    const encrypted = encryptAsaasApiKey(apiKey);
    const credentialResult = await context.admin.from("payment_provider_credentials").upsert({
      organization_id: context.organizationId,
      provider: "asaas",
      encrypted_api_key: encrypted.encrypted,
      initialization_vector: encrypted.iv,
      auth_tag: encrypted.authTag,
    });
    if (credentialResult.error) throw credentialResult.error;

    const connectionResult = await context.admin.from("payment_provider_connections").upsert({
      organization_id: context.organizationId,
      provider: "asaas",
      environment,
      status: "connected",
      account_name: commercialInfo.companyName || commercialInfo.name || "Conta Asaas",
      account_document_masked: maskDocument(commercialInfo.cpfCnpj),
      webhook_id: webhook.id,
      webhook_token_hash: createHash("sha256").update(webhookToken).digest("hex"),
      connected_by: context.userId,
      last_verified_at: new Date().toISOString(),
      last_error: null,
    });
    if (connectionResult.error) throw connectionResult.error;

    await context.admin.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      action: "payment_provider.asaas_connected",
      entity_type: "payment_provider_connection",
      entity_id: context.organizationId,
      after_data: { environment },
    });

    if (previous?.webhookId) {
      asaasRequest(previous.environment, previous.apiKey, `/webhooks/${previous.webhookId}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }

    revalidatePath("/pagamentos");
    return success("Conta Asaas conectada. A baixa automática já está preparada.");
  } catch (error) {
    return fail(readableError(error, "Não foi possível conectar a conta Asaas."));
  }
}

export async function disconnectAsaas(): Promise<void> {
  const context = await billingContext(["owner", "admin"]);
  const current = await getConnectionSecret(context.admin, context.organizationId);
  if (current?.webhookId) {
    await asaasRequest(current.environment, current.apiKey, `/webhooks/${current.webhookId}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }

  const { error: credentialError } = await context.admin
    .from("payment_provider_credentials")
    .delete()
    .eq("organization_id", context.organizationId);
  if (credentialError) throw credentialError;

  const { error: connectionError } = await context.admin
    .from("payment_provider_connections")
    .delete()
    .eq("organization_id", context.organizationId);
  if (connectionError) throw connectionError;

  await context.admin.from("audit_events").insert({
    organization_id: context.organizationId,
    actor_id: context.userId,
    action: "payment_provider.asaas_disconnected",
    entity_type: "payment_provider_connection",
    entity_id: context.organizationId,
  });
  revalidatePath("/pagamentos");
}

export async function createAsaasCharge(
  _: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const parsed = chargeSchema.safeParse({
    customerId: formData.get("customerId"),
    appointmentId: formData.get("appointmentId") || "",
    customerDocument: formData.get("customerDocument"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Revise os dados da cobrança.");
  if (parsed.data.dueDate < todayInSaoPaulo()) return fail("O vencimento não pode estar no passado.");

  try {
    const context = await billingContext(["owner", "admin", "reception"]);
    const stored = await getConnectionSecret(context.admin, context.organizationId);
    if (!stored) throw new Error("Conecte uma conta Asaas antes de gerar cobranças.");

    const { data: customer, error: customerError } = await context.admin
      .from("customers")
      .select("id, name, email, phone, document")
      .eq("organization_id", context.organizationId)
      .eq("id", parsed.data.customerId)
      .single();
    if (customerError || !customer) throw new Error("Cliente não encontrado neste espaço.");

    if (parsed.data.appointmentId) {
      const { data: appointment } = await context.admin
        .from("appointments")
        .select("id, customer_id")
        .eq("organization_id", context.organizationId)
        .eq("id", parsed.data.appointmentId)
        .maybeSingle();
      if (!appointment || appointment.customer_id !== customer.id) {
        throw new Error("O agendamento selecionado não pertence a este cliente.");
      }
    }

    if (customer.document !== parsed.data.customerDocument) {
      const { error } = await context.admin.from("customers")
        .update({ document: parsed.data.customerDocument })
        .eq("organization_id", context.organizationId)
        .eq("id", customer.id);
      if (error) throw error;
    }

    const providerCustomerId = await getOrCreateAsaasCustomer({
      admin: context.admin,
      organizationId: context.organizationId,
      environment: stored.environment,
      apiKey: stored.apiKey,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: parsed.data.customerDocument,
      },
    });

    const localChargeId = randomUUID();
    const payment = await asaasRequest<AsaasPayment>(stored.environment, stored.apiKey, "/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: providerCustomerId,
        billingType: "BOLETO",
        value: Number(parsed.data.amount.toFixed(2)),
        dueDate: parsed.data.dueDate,
        description: parsed.data.description,
        externalReference: localChargeId,
      }),
    });

    const amountCents = Math.round(parsed.data.amount * 100);
    const { error: insertError } = await context.admin.from("payment_charges").insert({
      id: localChargeId,
      organization_id: context.organizationId,
      customer_id: customer.id,
      appointment_id: parsed.data.appointmentId || null,
      provider: "asaas",
      provider_payment_id: payment.id,
      external_reference: localChargeId,
      billing_type: "BOLETO",
      status: normalizeAsaasStatus(payment.status),
      amount_cents: amountCents,
      net_amount_cents: typeof payment.netValue === "number" ? Math.round(payment.netValue * 100) : null,
      due_date: payment.dueDate || parsed.data.dueDate,
      description: parsed.data.description,
      invoice_url: payment.invoiceUrl || null,
      bank_slip_url: payment.bankSlipUrl || null,
      provider_created_at: payment.dateCreated ? new Date(`${payment.dateCreated}T00:00:00-03:00`).toISOString() : null,
      created_by: context.userId,
    });
    if (insertError) throw insertError;

    await context.admin.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      action: "payment_charge.created",
      entity_type: "payment_charge",
      entity_id: localChargeId,
      after_data: { amount_cents: amountCents, billing_type: "BOLETO" },
    });

    revalidatePath("/pagamentos");
    return success("Boleto gerado e vinculado ao cliente.");
  } catch (error) {
    return fail(readableError(error, "Não foi possível gerar o boleto."));
  }
}

export async function syncAsaasCharge(formData: FormData) {
  const chargeId = z.string().uuid().parse(formData.get("chargeId"));
  const context = await billingContext(["owner", "admin", "reception"]);
  const stored = await getConnectionSecret(context.admin, context.organizationId);
  if (!stored) throw new Error("Conta Asaas não conectada.");

  const { data: charge } = await context.admin.from("payment_charges")
    .select("provider_payment_id")
    .eq("organization_id", context.organizationId)
    .eq("id", chargeId)
    .single();
  if (!charge?.provider_payment_id) throw new Error("Cobrança não encontrada.");

  const payment = await asaasRequest<AsaasPayment>(
    stored.environment,
    stored.apiKey,
    `/payments/${charge.provider_payment_id}`,
    { method: "GET" },
  );
  const { error } = await context.admin.from("payment_charges").update({
    status: normalizeAsaasStatus(payment.status),
    net_amount_cents: typeof payment.netValue === "number" ? Math.round(payment.netValue * 100) : null,
    invoice_url: payment.invoiceUrl || null,
    bank_slip_url: payment.bankSlipUrl || null,
    paid_at: payment.paymentDate || payment.confirmedDate
      ? new Date(`${payment.paymentDate || payment.confirmedDate}T00:00:00-03:00`).toISOString()
      : null,
  }).eq("organization_id", context.organizationId).eq("id", chargeId);
  if (error) throw error;
  revalidatePath("/pagamentos");
}

async function billingContext(allowedRoles: string[]) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.organizationId) throw new Error("Esta ação não está disponível na demonstração.");
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  const userEmail = String(claimData?.claims?.email ?? "").trim();
  if (!userId || !userEmail) throw new Error("Sua sessão expirou. Entre novamente.");

  const { data: membership } = await supabase.from("organization_members")
    .select("role, active")
    .eq("organization_id", workspace.organizationId)
    .eq("user_id", userId)
    .single();
  if (!membership?.active || !allowedRoles.includes(membership.role)) {
    throw new Error("Seu perfil não possui permissão para esta operação financeira.");
  }

  return {
    organizationId: workspace.organizationId,
    userId,
    userEmail,
    admin: createAdminClient(),
  };
}

async function getConnectionSecret(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
) {
  const [{ data: connection }, { data: credential }] = await Promise.all([
    admin.from("payment_provider_connections")
      .select("environment, webhook_id")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin.from("payment_provider_credentials")
      .select("encrypted_api_key, initialization_vector, auth_tag")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);
  if (!connection || !credential) return null;
  return {
    environment: connection.environment as AsaasEnvironment,
    webhookId: connection.webhook_id as string | null,
    apiKey: decryptAsaasApiKey({
      encrypted: credential.encrypted_api_key,
      iv: credential.initialization_vector,
      authTag: credential.auth_tag,
    }),
  };
}

async function getOrCreateAsaasCustomer({
  admin,
  organizationId,
  environment,
  apiKey,
  customer,
}: {
  admin: ReturnType<typeof createAdminClient>;
  organizationId: string;
  environment: AsaasEnvironment;
  apiKey: string;
  customer: { id: string; name: string; email: string | null; phone: string | null; document: string };
}) {
  const { data: link } = await admin.from("customer_payment_provider_links")
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .eq("customer_id", customer.id)
    .eq("provider", "asaas")
    .maybeSingle();
  if (link?.provider_customer_id) return link.provider_customer_id;

  const matches = await asaasRequest<AsaasCustomerList>(
    environment,
    apiKey,
    `/customers?externalReference=${encodeURIComponent(customer.id)}&limit=1`,
    { method: "GET" },
  );
  const remote = matches.data?.[0] ?? await asaasRequest<AsaasCustomer>(
    environment,
    apiKey,
    "/customers",
    {
      method: "POST",
      body: JSON.stringify({
        name: customer.name,
        cpfCnpj: customer.document,
        email: customer.email || undefined,
        mobilePhone: customer.phone?.replace(/\D/g, "") || undefined,
        externalReference: customer.id,
        notificationDisabled: false,
      }),
    },
  );

  const { error } = await admin.from("customer_payment_provider_links").upsert({
    organization_id: organizationId,
    customer_id: customer.id,
    provider: "asaas",
    provider_customer_id: remote.id,
  });
  if (error) throw error;
  return remote.id;
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function maskDocument(document?: string) {
  if (!document) return null;
  const value = document.replace(/\D/g, "");
  if (value.length === 11) return `***.${value.slice(3, 6)}.${value.slice(6, 9)}-**`;
  if (value.length === 14) return `**.${value.slice(2, 5)}.${value.slice(5, 8)}/****-${value.slice(-2)}`;
  return null;
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof AsaasApiError) {
    if (error.status === 401) return "A chave informada não foi aceita no ambiente selecionado.";
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function success(message: string): BillingActionState {
  return { status: "success", message };
}

function fail(message: string): BillingActionState {
  return { status: "error", message };
}
