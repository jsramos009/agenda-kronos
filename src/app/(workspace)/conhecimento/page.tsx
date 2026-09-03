import { KnowledgeManager, type KnowledgeRow } from "@/components/knowledge-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { niches } from "@/lib/niches";

export default async function ConhecimentoPage() {
  const workspace = await getCurrentWorkspace(); const niche = niches[workspace?.nicheId ?? "climatizacao"];
  let rows: KnowledgeRow[] = [...niche.knowledge, { title: "Perguntas frequentes", type: "FAQ" }, { title: "Padrão de confirmação", type: "Modelo" }].map((item, index) => ({ id: `demo-${index}`, title: item.title, type: item.type, content: `Conteúdo sugerido para revisar e adaptar à realidade da sua empresa de ${niche.label.toLowerCase()}.`, status: index < 2 ? "Publicado" : "Rascunho", updated: index < 2 ? "há 2 dias" : "há 1 semana" }));
  if (workspace?.organizationId) {
    const supabase = await createClient();
    const initial = await supabase.from("knowledge_articles").select("id, title, type, body, status, updated_at").eq("organization_id", workspace.organizationId).order("updated_at", { ascending: false });
    let data = initial.data;
    const error = initial.error;
    if (error) throw new Error(error.message);
    if (!data?.length) {
      const { data: claims } = await supabase.auth.getClaims();
      const templates = [...niche.knowledge, { title: "Perguntas frequentes", type: "FAQ" }, { title: "Padrão de confirmação", type: "Modelo" }];
      const { error: seedError } = await supabase.from("knowledge_articles").insert(templates.map((item) => ({
        organization_id: workspace.organizationId,
        title: item.title,
        type: typeValue(item.type),
        body: { text: initialArticleText(item.title, niche.label) },
        status: "draft",
        template_origin: niche.id,
        created_by: claims?.claims?.sub ?? null,
      })));
      if (seedError) throw new Error(seedError.message);
      const refreshed = await supabase.from("knowledge_articles").select("id, title, type, body, status, updated_at").eq("organization_id", workspace.organizationId).order("updated_at", { ascending: false });
      if (refreshed.error) throw new Error(refreshed.error.message);
      data = refreshed.data;
    }
    rows = (data ?? []).map((item) => ({ id: item.id, title: item.title, type: typeLabel(item.type), content: bodyText(item.body), status: item.status === "published" ? "Publicado" : "Rascunho", updated: new Intl.DateTimeFormat("pt-BR").format(new Date(item.updated_at)) }));
  }
  return <KnowledgeManager initialArticles={rows} demo={workspace?.demo ?? true} />;
}

function bodyText(value: unknown) { if (value && typeof value === "object" && "text" in value) return String((value as { text: unknown }).text); return "Abra para editar este conteúdo."; }
function typeLabel(value: string) { return { process: "Processo", manual: "Manual", checklist: "Checklist", faq: "FAQ", template: "Modelo" }[value] ?? value; }
function typeValue(value: string) { return ({ Processo: "process", Manual: "manual", Checklist: "checklist", FAQ: "faq", Modelo: "template" } as Record<string, string>)[value] ?? "process"; }
function initialArticleText(title: string, niche: string) { return `${title}\n\nObjetivo: padronizar esta etapa da operação de ${niche.toLowerCase()}.\n\n1. Defina o responsável.\n2. Registre os dados essenciais.\n3. Confirme a conclusão e a próxima ação.\n\nEdite este modelo com as regras específicas da sua empresa antes de publicar.`; }
