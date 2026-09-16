import { ReceiptManager, type ReceiptCustomer, type ReceiptListItem, type ReceiptService } from "@/components/receipt-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function ReceiptsPage() {
  const workspace = await getCurrentWorkspace();
  const demo = !workspace?.organizationId;
  let customers: ReceiptCustomer[] = [];
  let services: ReceiptService[] = [];
  let receipts: ReceiptListItem[] = [];
  let pixConfigured = demo;
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const [customerResult, serviceResult, receiptResult, pixResult] = await Promise.all([
      supabase.from("customers").select("id, name, document, email, phone").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("services").select("id, name, price_cents").eq("organization_id", workspace.organizationId).eq("active", true).order("name"),
      supabase.from("receipts").select("id, receipt_number, customer_name, service_description, total_cents, issued_at, public_token").eq("organization_id", workspace.organizationId).order("issued_at", { ascending: false }).limit(200),
      supabase.from("organization_pix_settings").select("organization_id").eq("organization_id", workspace.organizationId).maybeSingle(),
    ]);
    const error = customerResult.error ?? serviceResult.error ?? receiptResult.error ?? pixResult.error;
    if (error) throw new Error(error.message);
    customers = customerResult.data ?? [];
    services = (serviceResult.data ?? []).map((item) => ({ id: item.id, name: item.name, priceCents: item.price_cents }));
    receipts = (receiptResult.data ?? []).map((item) => ({ id: item.id, number: item.receipt_number, customer: item.customer_name, service: item.service_description, totalCents: Number(item.total_cents), issuedAt: item.issued_at, publicToken: item.public_token }));
    pixConfigured = Boolean(pixResult.data);
  }
  return <ReceiptManager customers={customers} services={services} receipts={receipts} pixConfigured={pixConfigured} demo={demo} />;
}
