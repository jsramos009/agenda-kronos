import { CustomerManager, type CustomerRow } from "@/components/customer-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const clients = [
  ["João Silva", "(11) 98874-2231", "Manutenção preventiva", "Hoje, 09:00", "Ativo"],
  ["Maria Santos", "(11) 97632-4180", "Instalação", "Hoje, 10:30", "A confirmar"],
  ["Carlos Lima", "(11) 96581-0972", "Reparo técnico", "Hoje, 13:30", "Ativo"],
  ["Ana Oliveira", "(11) 95420-6681", "Orçamento", "Hoje, 15:30", "Novo"],
  ["Fernanda Rocha", "(11) 94388-1120", "Manutenção preventiva", "22 ago.", "Ativo"],
  ["Ricardo Gomes", "(11) 93247-9065", "Instalação", "19 ago.", "Inativo"],
];

export default async function ClientesPage() {
  const workspace = await getCurrentWorkspace();
  let rows: CustomerRow[] = clients.map((client, index) => ({ id: `demo-${index}`, name: client[0], phone: client[1], email: null, createdAt: client[3], active: client[4] !== "Inativo" }));
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("customers").select("id, name, phone, email, active, created_at").eq("organization_id", workspace.organizationId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    rows = (data ?? []).map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, active: customer.active, createdAt: new Intl.DateTimeFormat("pt-BR").format(new Date(customer.created_at)) }));
  }
  return <CustomerManager customers={rows} demo={!workspace?.organizationId} />;
}
