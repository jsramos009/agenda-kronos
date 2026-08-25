import { KnowledgeManager, type KnowledgeRow } from "@/components/knowledge-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function ConhecimentoPage() {
  const workspace = await getCurrentWorkspace(); const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: KnowledgeRow[] = [...niche.knowledge, { title: "Perguntas frequentes", type: "FAQ" }, { title: "Padrão de confirmação", type: "Modelo" }].map((item, index) => ({ id: `demo-${index}`, title: item.title, type: item.type, content: `Conteúdo sugerido para revisar e adaptar à realidade da sua empresa de ${niche.label.toLowerCase()}.`, status: index < 2 ? "Publicado" : "Rascunho", updated: index < 2 ? "há 2 dias" : "há 1 semana" }));
  if (workspace?.organizationId) { const supabase = await createClient(); const { data, error } = await supabase.from("knowledge_articles").select("id, title, type, body, status, updated_at").eq("organization_id", workspace.organizationId).order("updated_at", { ascending: false }); if (error) throw new Error(error.message); rows = (data ?? []).map((item) => ({ id: item.id, title: item.title, type: typeLabel(item.type), content: bodyText(item.body), status: item.status === "published" ? "Publicado" : "Rascunho", updated: new Intl.DateTimeFormat("pt-BR").format(new Date(item.updated_at)) })); }
  return <KnowledgeManager initialArticles={rows} demo={workspace?.demo ?? true} />;
}

function bodyText(value: unknown) { if (value && typeof value === "object" && "text" in value) return String((value as { text: unknown }).text); return "Abra para editar este conteúdo."; }
function typeLabel(value: string) { return { process: "Processo", manual: "Manual", checklist: "Checklist", faq: "FAQ", template: "Modelo" }[value] ?? value; }
