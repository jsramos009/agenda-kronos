import { PlatformAdminDashboard, type PlatformCharge, type PlatformTenant } from "@/components/platform-admin-dashboard";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const [organizationsResult, subscriptionsResult, membersResult, chargesResult, usersResult] = await Promise.all([
    admin.from("organizations").select("id, name, niche_id, created_by, created_at").order("created_at", { ascending: false }),
    admin.from("subscriptions").select("organization_id, status, billing_cycle, receipt_url"),
    admin.from("organization_members").select("organization_id, user_id, role, active"),
    admin.from("payment_charges").select("id, organization_id, description, amount_cents, status, due_date, invoice_url, created_at").order("created_at", { ascending: false }).limit(500),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const firstError = organizationsResult.error || subscriptionsResult.error || membersResult.error || chargesResult.error || usersResult.error;
  if (firstError) {
    console.error(JSON.stringify({ level: "error", message: "platform_admin_load_failed", error: firstError.message }));
    throw new Error("Não foi possível carregar a central administrativa.");
  }
  const users = new Map((usersResult.data?.users ?? []).map((user) => [user.id, user.email ?? "E-mail não informado"]));
  const subscriptions = new Map((subscriptionsResult.data ?? []).map((item) => [item.organization_id, item]));
  const members = membersResult.data ?? [];
  const charges = chargesResult.data ?? [];
  const names = new Map((organizationsResult.data ?? []).map((item) => [item.id, item.name]));
  const tenants: PlatformTenant[] = (organizationsResult.data ?? []).map((organization) => {
    const subscription = subscriptions.get(organization.id);
    const tenantCharges = charges.filter((charge) => charge.organization_id === organization.id);
    return { id: organization.id, name: organization.name, niche: organization.niche_id, owner: users.get(organization.created_by) ?? "Titular não localizado", createdAt: organization.created_at, status: subscription?.status ?? "pending", cycle: subscription?.billing_cycle ?? "monthly", receiptUrl: subscription?.receipt_url ?? null, members: members.filter((member) => member.organization_id === organization.id && member.active).length, charges: tenantCharges.length, receivedCents: tenantCharges.filter((charge) => ["received", "confirmed", "received_in_cash"].includes(charge.status)).reduce((sum, charge) => sum + Number(charge.amount_cents), 0) };
  });
  const platformCharges: PlatformCharge[] = charges.map((charge) => ({ id: charge.id, tenant: names.get(charge.organization_id) ?? "Workspace removido", description: charge.description, amountCents: Number(charge.amount_cents), status: charge.status, dueDate: charge.due_date, invoiceUrl: charge.invoice_url }));
  const monthly = lastSixMonths(charges);
  return <PlatformAdminDashboard tenants={tenants} charges={platformCharges} monthly={monthly} />;
}

function lastSixMonths(charges: { created_at: string; amount_cents: number | string; status: string }[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" });
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const year = date.getFullYear(); const month = date.getMonth();
    return { label: formatter.format(date).replace(".", ""), value: charges.filter((charge) => { const created = new Date(charge.created_at); return created.getFullYear() === year && created.getMonth() === month && ["received", "confirmed", "received_in_cash"].includes(charge.status); }).reduce((sum, charge) => sum + Number(charge.amount_cents), 0) };
  });
}
