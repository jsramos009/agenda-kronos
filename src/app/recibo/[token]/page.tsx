import { notFound } from "next/navigation";
import { ReceiptDocument } from "@/components/receipt-document";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const admin = createAdminClient();
  const { data: receipt } = await admin.from("receipts").select("id, organization_id, receipt_number, customer_name, customer_document, service_description, notes, total_cents, pix_key_snapshot, pix_payload, issued_at, status").eq("public_token", token).eq("status", "issued").maybeSingle();
  if (!receipt) notFound();
  const [{ data: items }, { data: organization }] = await Promise.all([
    admin.from("receipt_items").select("id, description, quantity, unit_price_cents, total_cents").eq("receipt_id", receipt.id).eq("organization_id", receipt.organization_id).order("position"),
    admin.from("organizations").select("name, description").eq("id", receipt.organization_id).single(),
  ]);
  if (!organization) notFound();
  return <ReceiptDocument receipt={{ number: receipt.receipt_number, customerName: receipt.customer_name, customerDocument: receipt.customer_document, serviceDescription: receipt.service_description, notes: receipt.notes, totalCents: Number(receipt.total_cents), pixKey: receipt.pix_key_snapshot, pixPayload: receipt.pix_payload, issuedAt: receipt.issued_at }} items={(items ?? []).map((item) => ({ id: item.id, description: item.description, quantity: Number(item.quantity), unitPriceCents: Number(item.unit_price_cents), totalCents: Number(item.total_cents) }))} organization={organization} />;
}
