import {
  PaymentManager,
  type PaymentAppointment,
  type PaymentCharge,
  type PaymentConnection,
  type PaymentCustomer,
} from "@/components/payment-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const demoCharges: PaymentCharge[] = [
  { id: "demo-1", customerName: "João Silva", appointmentLabel: "Manutenção · 4 set., 09:00", description: "Manutenção preventiva", amountCents: 28000, dueDate: "2026-09-05", status: "pending", invoiceUrl: null, bankSlipUrl: null, paidAt: null },
  { id: "demo-2", customerName: "Maria Santos", appointmentLabel: "Instalação · 1 set., 10:30", description: "Instalação de equipamento", amountCents: 89000, dueDate: "2026-09-02", status: "received", invoiceUrl: null, bankSlipUrl: null, paidAt: "2026-09-02T13:00:00-03:00" },
  { id: "demo-3", customerName: "Carlos Lima", appointmentLabel: null, description: "Reparo técnico", amountCents: 19500, dueDate: "2026-08-29", status: "overdue", invoiceUrl: null, bankSlipUrl: null, paidAt: null },
];

const demoCustomers: PaymentCustomer[] = [
  { id: "demo-customer-1", name: "João Silva", email: "joao@exemplo.com", phone: "11988742231", document: "" },
];

export default async function PagamentosPage() {
  const workspace = await getCurrentWorkspace();
  const demo = !workspace?.organizationId;
  const canManage = demo || workspace?.roleKey === "owner" || workspace?.roleKey === "admin";
  const canCreate = canManage || workspace?.roleKey === "reception";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  let connection: PaymentConnection = { connected: demo, environment: "sandbox", accountName: demo ? "Conta demonstrativa" : null, accountDocument: null, lastVerifiedAt: null };
  let customers = demoCustomers;
  let appointments: PaymentAppointment[] = [];
  let charges = demoCharges;

  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [connectionResult, customerResult, appointmentResult, chargeResult] = await Promise.all([
      supabase.from("payment_provider_connections").select("environment, status, account_name, account_document_masked, last_verified_at").eq("organization_id", workspace.organizationId).maybeSingle(),
      supabase.from("customers").select("id, name, email, phone, document").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("appointments").select("id, customer_id, starts_at, services(name)").eq("organization_id", workspace.organizationId).gte("starts_at", new Date().toISOString()).neq("status", "cancelled").order("starts_at").limit(100),
      supabase.from("payment_charges").select("id, description, amount_cents, due_date, status, invoice_url, bank_slip_url, paid_at, customers(name), appointments(starts_at)").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false }).limit(250),
    ]);
    if (connectionResult.error) throw new Error(connectionResult.error.message);
    if (customerResult.error) throw new Error(customerResult.error.message);
    if (appointmentResult.error) throw new Error(appointmentResult.error.message);
    if (chargeResult.error) throw new Error(chargeResult.error.message);

    const provider = connectionResult.data;
    connection = {
      connected: provider?.status === "connected",
      environment: provider?.environment === "production" ? "production" : "sandbox",
      accountName: provider?.account_name ?? null,
      accountDocument: provider?.account_document_masked ?? null,
      lastVerifiedAt: provider?.last_verified_at ?? null,
    };
    customers = (customerResult.data ?? []).map((item) => ({ id: item.id, name: item.name, email: item.email, phone: item.phone, document: item.document }));
    appointments = (appointmentResult.data ?? []).map((item) => ({
      id: item.id,
      customerId: item.customer_id,
      label: `${relationName(item.services)} · ${dateTimeLabel(item.starts_at)}`,
    }));
    charges = (chargeResult.data ?? []).map((item) => ({
      id: item.id,
      customerName: relationName(item.customers),
      appointmentLabel: relationDate(item.appointments),
      description: item.description,
      amountCents: Number(item.amount_cents),
      dueDate: item.due_date,
      status: item.status,
      invoiceUrl: item.invoice_url,
      bankSlipUrl: item.bank_slip_url,
      paidAt: item.paid_at,
    }));
  }

  return <PaymentManager connection={connection} customers={customers} appointments={appointments} charges={charges} today={today} canManage={canManage} canCreate={canCreate} demo={demo} />;
}

function relationName(value: { name: string } | { name: string }[] | null) {
  if (!value) return "Sem identificação";
  return Array.isArray(value) ? value[0]?.name ?? "Sem identificação" : value.name;
}

function relationDate(value: { starts_at: string } | { starts_at: string }[] | null) {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.starts_at ? dateTimeLabel(row.starts_at) : null;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}
