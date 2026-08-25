"use client";

import { BookOpen, CheckSquare2, FileText, HelpCircle, Search } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

const icons = { Checklist: CheckSquare2, Processo: FileText, Manual: BookOpen, Modelo: FileText, FAQ: HelpCircle };

export default function ConhecimentoPage() {
  const { niche } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Padrão · Aprendizado" title="Base de conhecimento" description={`Processos e modelos para uma operação de ${niche.label.toLowerCase()} mais consistente.`} action="Novo artigo" />
      <div className="toolbar"><label className="inline-search inline-search--wide"><Search size={16} /><input placeholder="Buscar artigos…" /></label><div className="filter-pills"><button className="active">Todos</button><button>Processos</button><button>Checklists</button><button>Modelos</button><button>FAQ</button></div></div>
      <section className="knowledge-list">
        {[...niche.knowledge, { title: "Perguntas frequentes", type: "FAQ" }, { title: "Padrão de confirmação", type: "Modelo" }].map((article, index) => { const Icon = icons[article.type as keyof typeof icons] ?? FileText; return <article key={`${article.title}-${index}`}><span className="article-number">0{index + 1}</span><span className="article-icon"><Icon size={18} /></span><div><h2>{article.title}</h2><p>Conteúdo sugerido para revisar e adaptar à realidade da sua empresa.</p></div><em>{article.type}</em><small>Atualizado {index < 2 ? "há 2 dias" : "há 1 semana"}</small><button aria-label={`Abrir ${article.title}`}>→</button></article>; })}
      </section>
    </>
  );
}

