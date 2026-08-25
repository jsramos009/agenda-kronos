import Link from "next/link";
import { BookOpen, ContactRound, Search, Tags } from "lucide-react";
import { getCurrentWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { niches } from "@/lib/niches";

type SearchResult = { id: string; type: "Cliente" | "Serviço" | "Artigo"; title: string; context: string; href: string };

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const workspace = await getCurrentWorkspace();
  let results: SearchResult[] = [];
  if (query && workspace?.organizationId) {
    const supabase = await createClient();
    const pattern = `%${query.replaceAll("%", "").replaceAll("_", "")}%`;
    const [customers, services, articles] = await Promise.all([
      supabase.from("customers").select("id, name, phone, email").eq("organization_id", workspace.organizationId).or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`).limit(8),
      supabase.from("services").select("id, name, description").eq("organization_id", workspace.organizationId).or(`name.ilike.${pattern},description.ilike.${pattern}`).limit(8),
      supabase.from("knowledge_articles").select("id, title, type").eq("organization_id", workspace.organizationId).ilike("title", pattern).limit(8),
    ]);
    results = [
      ...(customers.data ?? []).map((item) => ({ id: item.id, type: "Cliente" as const, title: item.name, context: item.phone ?? item.email ?? "Sem contato", href: "/clientes" })),
      ...(services.data ?? []).map((item) => ({ id: item.id, type: "Serviço" as const, title: item.name, context: item.description ?? "Serviço personalizado", href: "/servicos" })),
      ...(articles.data ?? []).map((item) => ({ id: item.id, type: "Artigo" as const, title: item.title, context: item.type, href: "/conhecimento" })),
    ];
  } else if (query) {
    const niche = niches[workspace?.nicheId ?? "climatizacao"];
    const demo: SearchResult[] = [
      ...["João Silva", "Maria Santos", "Carlos Lima", "Ana Oliveira"].map((name, index) => ({ id: `client-${index}`, type: "Cliente" as const, title: name, context: "Cliente demonstrativo", href: "/clientes" })),
      ...niche.services.map((service, index) => ({ id: `service-${index}`, type: "Serviço" as const, title: service.name, context: `${service.duration} · ${service.price}`, href: "/servicos" })),
      ...niche.knowledge.map((article, index) => ({ id: `article-${index}`, type: "Artigo" as const, title: article.title, context: article.type, href: "/conhecimento" })),
    ];
    results = demo.filter((item) => `${item.title} ${item.context} ${item.type}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  }
  const icon = { Cliente: ContactRound, Serviço: Tags, Artigo: BookOpen };
  return <><header className="page-header"><div><p className="eyebrow">Busca global</p><h1>{query ? `Resultados para “${query}”` : "O que você procura?"}</h1><p>Clientes, serviços e conhecimento no mesmo campo.</p></div></header><form className="search-page-form" action="/busca"><Search size={19} /><input name="q" defaultValue={query} autoFocus placeholder="Digite um nome, telefone, serviço ou artigo" /><button className="button button--primary">Buscar</button></form><section className="search-results">{results.length ? results.map((result) => { const Icon = icon[result.type]; return <Link href={result.href} key={`${result.type}-${result.id}`}><span><Icon size={18} /></span><div><small>{result.type}</small><strong>{result.title}</strong><p>{result.context}</p></div><em>→</em></Link>; }) : <div className="empty-state"><span><Search size={22} /></span><h3>{query ? "Nenhum resultado encontrado" : "Digite para começar"}</h3><p>{query ? "Tente um termo mais curto ou confira a grafia." : "A busca respeita os dados da conta atual."}</p></div>}</section></>;
}
