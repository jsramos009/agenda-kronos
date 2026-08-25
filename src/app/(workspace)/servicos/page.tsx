import { ServiceManager, type ServiceRow } from "@/components/service-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function ServicosPage() {
  const workspace = await getCurrentWorkspace();
  const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: ServiceRow[] = niche.services.map((service, index) => ({ id: `demo-${index}`, name: service.name, description: `Serviço configurado a partir do modelo de ${niche.label.toLowerCase()}.`, durationMinutes: Number.parseInt(service.duration), bufferMinutes: 10, priceCents: currencyToCents(service.price), active: true }));
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("services").select("id, name, description, duration_minutes, buffer_after_minutes, price_cents, active").eq("organization_id", workspace.organizationId).order("name");
    if (error) throw new Error(error.message);
    rows = (data ?? []).map((service) => ({ id: service.id, name: service.name, description: service.description ?? "Serviço personalizado.", durationMinutes: service.duration_minutes, bufferMinutes: service.buffer_after_minutes, priceCents: service.price_cents, active: service.active }));
  }
  return <ServiceManager services={rows} demo={!workspace?.organizationId} />;
}

function currencyToCents(value: string) { const numeric = Number(value.replace(/[^\d,]/g, "").replace(",", ".")); return Number.isFinite(numeric) ? Math.round(numeric * 100) : null; }
